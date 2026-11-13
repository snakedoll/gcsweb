import { Prisma, type OnsitePaymentType, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ORDER_PAYMENT_STATUS } from '@/lib/order-status';
import { issueOrderNumber, withOrderNumberRetry } from './order-number';
import {
  validateOrderItems,
  type OrderItemInput,
  type OrderLine,
  type SoldOutItem,
  type ValidateOrderResult,
} from './order-validation';
import { formatOrderNo } from './sales-orders';
import { decrementOnsiteStock } from './stock';

/**
 * 현장 포스 결제 완료. 판매자(소유자·승인된 직원)가 매장에서 받은 결제를 주문으로 남긴다.
 *
 * 0) 같은 결제가 두 번 처리되지 않게, 프론트가 결제마다 만든 요청 키(clientRequestId)가 이미 있으면
 *    처음 만든 주문의 영수증을 그대로 돌려준다(응답이 늦어 다시 누르거나 네트워크가 재시도한 경우).
 * 한 트랜잭션에서:
 * 1) 상품·옵션이 그 상점 것인지 확인하고 단가를 서버가 계산한다(QR샵 주문과 같은 `validateOrderItems`).
 * 2) 결제완료(PAID) 현장결제 주문을 만든다. 주문 시점의 상품명·옵션명·단가와 결제를 등록한 사람을 남긴다.
 * 3) 재고를 조건부로 차감한다(QR샵 결제 확정과 같은 `decrementOnsiteStock`). 하나라도 모자라면 전부 되돌린다.
 * 4) 재고 차감이 성공한 뒤 주문번호를 발급한다(상점·KST 일자별 순번). 번호 발급은 그 상점·일자 잠금을
 *    트랜잭션 끝까지 잡으므로 마지막에 둬서 다른 결제가 기다리는 시간을 줄인다(결제 확정과 같은 순서).
 *
 * 돈은 매장에서 이미 받았으므로 PortOne 을 거치지 않는다. 할인은 기능명세서 미완료라 아직 없다.
 */

export type PosPaymentMethod = 'card' | 'cash' | 'transfer';

const ONSITE_PAYMENT_TYPE: Record<PosPaymentMethod, OnsitePaymentType> = {
  card: 'CARD',
  cash: 'CASH',
  transfer: 'TRANSFER',
};

const POS_PAYMENT_METHOD: Record<OnsitePaymentType, PosPaymentMethod> = {
  CARD: 'card',
  CASH: 'cash',
  TRANSFER: 'transfer',
};

/** 프론트 계약 `lib/services/pos-service.ts` 의 PosCartLine 과 같은 모양. */
export type PosReceiptLine = {
  productId: string;
  optionId?: string;
  productName: string;
  option?: string;
  quantity: number;
  unitPrice: number;
};

/** 프론트 계약 PosReceipt + orderId. orderCode 는 화면 토스트의 3자리 주문번호다. */
export type PosReceipt = {
  orderId: string;
  orderCode: string;
  lines: PosReceiptLine[];
  totalAmount: number;
  paymentMethod: PosPaymentMethod;
};

type ValidationFailure = Exclude<ValidateOrderResult, { ok: true } | { reason: 'SOLD_OUT' }>;

export type PosSaleResult =
  /** replayed: 같은 요청 키로 이미 처리된 결제의 영수증을 다시 돌려줌 */
  | { kind: 'COMPLETED'; receipt: PosReceipt; replayed: boolean }
  | { kind: 'INVALID'; failure: ValidationFailure }
  | { kind: 'SOLD_OUT'; soldOutItems: SoldOutItem[] }
  /** 요청 키가 다른 상점의 결제에 이미 쓰였다 */
  | { kind: 'REQUEST_ID_CONFLICT' };

export type PosSaleDeps = { db: PrismaClient; now: () => Date };

export type PosSaleParams = {
  storeId: string;
  storeSlug: string;
  items: OrderItemInput[];
  paymentMethod: PosPaymentMethod;
  clientRequestId: string;
  soldByUserId: string;
};

class PosStockShortage extends Error {
  constructor(readonly soldOutItems: SoldOutItem[]) {
    super('POS_STOCK_SHORTAGE');
  }
}

const RECEIPT_SELECT = {
  id: true,
  paymentAmount: true,
  onsitePaymentType: true,
  orderNumber: { select: { storeId: true, orderNo: true } },
  items: {
    select: {
      onsiteProductId: true,
      onsiteOptionId: true,
      onsiteProductName: true,
      onsiteOptionName: true,
      quantity: true,
      price: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.OrderSelect;

type ReceiptRow = Prisma.OrderGetPayload<{ select: typeof RECEIPT_SELECT }>;

export async function completePosSale(params: PosSaleParams, overrides: Partial<PosSaleDeps> = {}): Promise<PosSaleResult> {
  const { db, now } = { db: prisma, now: () => new Date(), ...overrides };

  const earlier = await findByRequestId(db, params);
  if (earlier) return earlier;

  const paidAt = now();
  try {
    return await withOrderNumberRetry(() =>
      db.$transaction(
        async (tx): Promise<PosSaleResult> => {
          const validated = await validateOrderItems(tx, { storeSlug: params.storeSlug, items: params.items });
          if (!validated.ok) {
            return validated.reason === 'SOLD_OUT'
              ? { kind: 'SOLD_OUT', soldOutItems: validated.soldOutItems }
              : { kind: 'INVALID', failure: validated };
          }

          const order = await tx.order.create({
            data: {
              paymentAmount: validated.paymentAmount,
              paymentMethod: 'ON_SITE',
              onsitePaymentType: ONSITE_PAYMENT_TYPE[params.paymentMethod],
              paymentStatus: ORDER_PAYMENT_STATUS.PAID,
              // 매장에서 결제하면서 바로 건네주므로 수령완료로 남긴다(주문서 보드에서 미수령으로 보이지 않게).
              receiptStatus: 'RECEIVED',
              paidAt,
              buyerType: 'GUEST',
              clientRequestId: params.clientRequestId,
              soldByUserId: params.soldByUserId,
              items: {
                create: validated.lines.map((line) => ({
                  quantity: line.quantity,
                  price: line.unitPrice,
                  onsiteProductId: line.productId,
                  onsiteOptionId: line.optionId,
                  onsiteProductName: line.productName,
                  onsiteOptionName: line.optionName,
                })),
              },
            },
            select: { id: true },
          });

          const shortages = await decrementOnsiteStock(
            tx,
            validated.lines.map((line, index) => ({ key: index, ...stockItem(line) })),
          );
          if (shortages.length > 0) throw new PosStockShortage(shortages.map((shortage) => shortage.soldOut));

          // 재고 차감이 끝난 뒤 번호를 발급한다(번호 잠금을 잡는 시간을 줄인다).
          const { orderNo } = await issueOrderNumber(tx, {
            orderId: order.id,
            storeId: validated.store.storeId,
            type: 'ONSITE',
            now: paidAt,
          });

          return {
            kind: 'COMPLETED',
            replayed: false,
            receipt: {
              orderId: order.id,
              orderCode: formatOrderNo(orderNo),
              lines: validated.lines.map(toReceiptLine),
              totalAmount: validated.paymentAmount,
              paymentMethod: params.paymentMethod,
            },
          };
        },
        { timeout: 15000 },
      ),
    );
  } catch (error) {
    if (error instanceof PosStockShortage) return { kind: 'SOLD_OUT', soldOutItems: error.soldOutItems };
    // 같은 요청 키가 동시에 두 번 오면 나중 것은 unique 충돌로 끝난다. 먼저 끝난 결제의 영수증을 돌려준다.
    if (isRequestIdConflict(error)) {
      const winner = await findByRequestId(db, params);
      if (winner) return winner;
    }
    throw error;
  }
}

function stockItem(line: OrderLine) {
  return {
    productId: line.productId,
    optionId: line.optionId,
    productName: line.productName,
    optionName: line.optionName,
    quantity: line.quantity,
  };
}

/** 같은 요청 키의 결제가 이미 있으면 그 영수증(같은 상점) 또는 충돌(다른 상점). 없으면 null. */
async function findByRequestId(db: PrismaClient, params: PosSaleParams): Promise<PosSaleResult | null> {
  const row = await db.order.findUnique({ where: { clientRequestId: params.clientRequestId }, select: RECEIPT_SELECT });
  if (!row) return null;
  if (row.orderNumber?.storeId !== params.storeId) return { kind: 'REQUEST_ID_CONFLICT' };
  return { kind: 'COMPLETED', replayed: true, receipt: receiptFromRow(row) };
}

function receiptFromRow(row: ReceiptRow): PosReceipt {
  return {
    orderId: row.id,
    orderCode: row.orderNumber?.orderNo != null ? formatOrderNo(row.orderNumber.orderNo) : '',
    lines: row.items.map((item) => ({
      productId: item.onsiteProductId ?? '',
      ...(item.onsiteOptionId ? { optionId: item.onsiteOptionId } : {}),
      productName: item.onsiteProductName ?? '',
      ...(item.onsiteOptionName ? { option: item.onsiteOptionName } : {}),
      quantity: item.quantity,
      unitPrice: item.price,
    })),
    totalAmount: row.paymentAmount,
    paymentMethod: row.onsitePaymentType ? POS_PAYMENT_METHOD[row.onsitePaymentType] : 'card',
  };
}

function isRequestIdConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return fields.includes('clientRequestId');
}

function toReceiptLine(line: OrderLine): PosReceiptLine {
  return {
    productId: line.productId,
    ...(line.optionId ? { optionId: line.optionId } : {}),
    productName: line.productName,
    ...(line.optionName ? { option: line.optionName } : {}),
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  };
}
