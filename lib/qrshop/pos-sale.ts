import type { OnsitePaymentType, Prisma, PrismaClient } from '@prisma/client';
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

/**
 * 현장 포스 결제 완료. 판매자(소유자·승인된 직원)가 매장에서 받은 결제를 주문으로 남긴다.
 *
 * 한 트랜잭션에서:
 * 1) 상품·옵션이 그 상점 것인지 확인하고 단가를 서버가 계산한다(QR샵 주문과 같은 `validateOrderItems`).
 * 2) 결제완료(PAID) 현장결제 주문을 만든다. 주문 시점의 상품명·옵션명·단가를 항목에 남긴다.
 * 3) 주문번호를 바로 발급한다(상점·KST 일자별 순번, QR샵 결제 확정과 같은 번호 체계).
 * 4) 재고를 조건부로 차감한다(`현재 재고 >= 수량`). 하나라도 모자라면 전부 되돌리고 품절 항목을 돌려준다.
 *
 * 돈은 매장에서 이미 받았으므로 PortOne 을 거치지 않는다. 할인은 기능명세서 미완료라 아직 없다.
 */

export type PosPaymentMethod = 'card' | 'cash' | 'transfer';

const ONSITE_PAYMENT_TYPE: Record<PosPaymentMethod, OnsitePaymentType> = {
  card: 'CARD',
  cash: 'CASH',
  transfer: 'TRANSFER',
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
  | { kind: 'COMPLETED'; receipt: PosReceipt }
  | { kind: 'INVALID'; failure: ValidationFailure }
  | { kind: 'SOLD_OUT'; soldOutItems: SoldOutItem[] };

export type PosSaleDeps = { db: PrismaClient; now: () => Date };

class PosStockShortage extends Error {
  constructor(readonly soldOutItems: SoldOutItem[]) {
    super('POS_STOCK_SHORTAGE');
  }
}

export async function completePosSale(
  params: { storeSlug: string; items: OrderItemInput[]; paymentMethod: PosPaymentMethod },
  overrides: Partial<PosSaleDeps> = {},
): Promise<PosSaleResult> {
  const { db, now } = { db: prisma, now: () => new Date(), ...overrides };
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
              paidAt,
              buyerType: 'GUEST',
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

          const { orderNo } = await issueOrderNumber(tx, {
            orderId: order.id,
            storeId: validated.store.storeId,
            type: 'ONSITE',
            now: paidAt,
          });

          const soldOut = await decrementPosStock(tx, validated.lines);
          if (soldOut.length > 0) throw new PosStockShortage(soldOut);

          return {
            kind: 'COMPLETED',
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
    throw error;
  }
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

/**
 * 항목별 조건부 재고 차감. 옵션 상품은 옵션과 상품 재고(= 옵션 합계)를 함께 줄인다.
 * 모자란 항목을 모아 돌려준다(호출 쪽이 트랜잭션을 되돌린다). 규칙은 QR샵 결제 확정(payment-confirm)과 같다.
 */
async function decrementPosStock(
  tx: Pick<Prisma.TransactionClient, 'onsiteProduct' | 'onsiteProductOption'>,
  lines: OrderLine[],
): Promise<SoldOutItem[]> {
  const soldOut: SoldOutItem[] = [];
  const shortage = (line: OrderLine, availableQuantity: number): SoldOutItem => ({
    productId: line.productId,
    optionId: line.optionId,
    name: line.productName,
    optionName: line.optionName,
    availableQuantity: Math.max(availableQuantity, 0),
  });

  for (const line of lines) {
    if (line.optionId) {
      const option = await tx.onsiteProductOption.updateMany({
        where: { optionId: line.optionId, currentStock: { gte: line.quantity } },
        data: { currentStock: { decrement: line.quantity } },
      });
      if (option.count !== 1) {
        const current = await tx.onsiteProductOption.findUnique({
          where: { optionId: line.optionId },
          select: { currentStock: true },
        });
        soldOut.push(shortage(line, current?.currentStock ?? 0));
        continue;
      }
    }

    const product = await tx.onsiteProduct.updateMany({
      where: { productId: line.productId, currentStock: { gte: line.quantity } },
      data: { currentStock: { decrement: line.quantity } },
    });
    if (product.count !== 1) {
      const current = await tx.onsiteProduct.findUnique({
        where: { productId: line.productId },
        select: { currentStock: true },
      });
      soldOut.push(shortage(line, current?.currentStock ?? 0));
    }
  }
  return soldOut;
}
