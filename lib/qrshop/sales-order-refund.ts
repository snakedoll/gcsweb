import type { PaymentMethod, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ORDER_PAYMENT_STATUS } from '@/lib/order-status';
import { cancelPayment, getPayment } from '@/lib/payment/portone';
import {
  CANCEL_REASON_SELLER_REFUND,
  SALES_ORDER_SELECT,
  type SalesOrderRow,
} from './sales-orders';

/**
 * 전체 주문 조회의 환불 신청. 주문 전체를 환불한다.
 *
 * 1) 환불 의도(refundRequestedAt·refundRestoreStock·refundedByUserId)를 먼저 저장한다. 결제완료이고 아직 요청이 없을 때만
 *    저장되므로 동시에 눌러도 한 명만 진행한다. 이미 처리 중이면 누가 눌러도 REFUND_PENDING 이다.
 * 2) 온라인 결제는 PortOne 결제를 취소한다. 실패하면 PortOne 결제 상태를 다시 조회해 실제 상태로 판단한다.
 *    - CANCELLED: 취소는 됐으므로 마무리한다.
 *    - PAID: PortOne 이 응답한 실패면 의도를 지우고 실패로 끝낸다.
 *      응답을 못 받은 실패(NETWORK_ERROR)면 취소 요청이 뒤늦게 처리될 수 있어 의도를 남긴다(처리 중).
 *    - 조회 실패·그 밖의 상태: 의도를 남긴다(처리 중).
 *    현장 결제는 돈을 판매자가 결제수단에 맞게 따로 돌려주므로 이 단계가 없다.
 * 3) 마무리 트랜잭션(`finalizeSellerRefund`): 주문을 CANCELED(SELLER_REFUND)로 바꾸고, 선택한 대로 재고를 되돌린다.
 *    - 온라인 결제는 여기서 실패해도 의도가 남아 처리 중이 된다.
 *    - 현장 결제는 웹훅이 없어 처리 중으로 남으면 끝낼 길이 없으므로, 실패하면 의도를 지운다. PortOne 을 거치지 않아
 *      지워도 어긋날 것이 없고, 판매자가 다시 누르면 처음부터 진행된다.
 *
 * 처리 중 주문은 웹훅(Transaction.Cancelled, `finalizeRefundFromWebhook`)이나 전체 주문 조회를 열 때의 확인
 * (`reconcilePendingRefunds`)이 마무리한다.
 *
 * 재고 복원은 결제 확정 때 차감한 상품·옵션 재고 그대로다. 주문 뒤 옵션이 바뀌어 옵션 연결이 끊긴 항목은 건너뛴다.
 */

const REFUND_REASON = '판매자 환불';

/** PortOne 에 닿았는지 알 수 없는 취소 실패. 취소가 뒤늦게 처리될 수 있어, 바로 조회한 PAID 를 믿지 않는다. */
const NO_RESPONSE_CANCEL_CODE = 'NETWORK_ERROR';

/** 결제 상태 조회를 기다리는 최대 시간. getPayment 자체에는 제한 시간이 없다. */
const PAYMENT_LOOKUP_TIMEOUT_MS = 5000;

/**
 * 처리 중 환불을 목록에서 다시 확인하기까지 기다리는 시간. 환불 요청이 아직 진행 중일 수 있는 동안은 건드리지 않는다
 * (PortOne 취소 15초 + 결제 조회 5초 + 마무리 트랜잭션 15초보다 넉넉하게).
 */
export const PENDING_REFUND_RECHECK_AFTER_MS = 2 * 60 * 1000;

/** 목록을 한 번 열 때 확인하는 처리 중 주문 수 상한(오래된 요청부터). */
const RECONCILE_LIMIT = 10;

export type RefundDeps = {
  db: PrismaClient;
  cancelPayment: typeof cancelPayment;
  getPayment: typeof getPayment;
  now: () => Date;
};

export type RefundResult =
  | { kind: 'NOT_FOUND' }
  | { kind: 'ALREADY_REFUNDED' }
  | { kind: 'NOT_REFUNDABLE' }
  /** 환불이 처리 중이다(이미 다른 요청이 처리 중이거나, 이번 요청의 결과를 아직 확정하지 못함). */
  | { kind: 'REFUND_PENDING' }
  /** PortOne 이 취소를 거절했고 결제가 그대로임을 확인했다. 의도는 지웠다. */
  | { kind: 'CANCEL_FAILED'; code?: string }
  | { kind: 'REFUNDED'; order: SalesOrderRow; stockNotRestored: number };

const deps = (overrides: Partial<RefundDeps>): RefundDeps => ({
  db: prisma,
  cancelPayment,
  getPayment,
  now: () => new Date(),
  ...overrides,
});

const isSellerRefund = (order: { paymentStatus: string; cancelReason: string | null }) =>
  order.paymentStatus === ORDER_PAYMENT_STATUS.CANCELED && order.cancelReason === CANCEL_REASON_SELLER_REFUND;

const notPaidResult = (order: { paymentStatus: string; cancelReason: string | null }): RefundResult =>
  isSellerRefund(order) ? { kind: 'ALREADY_REFUNDED' } : { kind: 'NOT_REFUNDABLE' };

export async function refundSalesOrder(
  params: { orderId: string; storeId: string; restoreStock: boolean; userId: string },
  overrides: Partial<RefundDeps> = {},
): Promise<RefundResult> {
  const d = deps(overrides);
  const { db } = d;

  const order = await db.order.findFirst({
    where: { id: params.orderId, orderNumber: { storeId: params.storeId } },
    select: { id: true, paymentStatus: true, paymentMethod: true, cancelReason: true, refundRequestedAt: true },
  });
  if (!order) return { kind: 'NOT_FOUND' };
  if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) return notPaidResult(order);
  if (order.refundRequestedAt) return { kind: 'REFUND_PENDING' };

  // 1) 환불 의도 저장. 결제완료이고 아직 요청이 없을 때만(그 사이 다른 사람이 요청·환불했으면 0건).
  const intent = await db.order.updateMany({
    where: { id: order.id, paymentStatus: ORDER_PAYMENT_STATUS.PAID, refundRequestedAt: null },
    data: { refundRequestedAt: d.now(), refundRestoreStock: params.restoreStock, refundedByUserId: params.userId },
  });
  if (intent.count === 0) {
    const current = await db.order.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true, cancelReason: true },
    });
    if (!current) return { kind: 'NOT_FOUND' };
    return current.paymentStatus === ORDER_PAYMENT_STATUS.PAID ? { kind: 'REFUND_PENDING' } : notPaidResult(current);
  }

  const finalize = () => finalizeSellerRefund(db, { orderId: order.id, restoreStock: params.restoreStock, now: d.now });

  if (order.paymentMethod !== 'ONLINE') {
    // 현장 결제: 처리 중으로 남지 않게, 마무리가 실패하면 의도를 지운다.
    try {
      return await finalize();
    } catch (error) {
      await clearRefundIntent(db, order.id).catch((clearError) =>
        console.error('[qrshop][refund] failed to clear onsite refund intent', { orderId: order.id, clearError }),
      );
      throw error;
    }
  }

  // 2) 온라인 결제는 PortOne 취소. 실패하면 실제 결제 상태로 판단한다.
  const cancel = await d.cancelPayment({ paymentId: order.id, reason: REFUND_REASON });
  if (!cancel.success) {
    const status = await lookupPaymentStatus(d, order.id);
    const confirmedNotCancelled = status === 'PAID' && cancel.code !== NO_RESPONSE_CANCEL_CODE;
    console.error('[qrshop][refund] PortOne cancel failed', {
      orderId: order.id,
      code: cancel.code ?? null,
      portoneStatus: status,
    });
    if (confirmedNotCancelled) {
      await clearRefundIntent(db, order.id);
      return { kind: 'CANCEL_FAILED', code: cancel.code };
    }
    if (status !== 'CANCELLED') return { kind: 'REFUND_PENDING' };
    // CANCELLED: 취소는 처리됐다 → 마무리
  }

  // 3) 마무리. 실패하면 의도가 남아 처리 중이 된다.
  try {
    return await finalize();
  } catch (error) {
    console.error('[qrshop][refund] finalize failed after PortOne cancel; left pending', { orderId: order.id, error });
    return { kind: 'REFUND_PENDING' };
  }
}

/**
 * PortOne 결제 상태(대문자). 조회 실패·예외·제한 시간 초과면 null.
 */
async function lookupPaymentStatus(d: RefundDeps, paymentId: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PAYMENT_LOOKUP_TIMEOUT_MS);
  });
  try {
    const payment = await Promise.race([d.getPayment(paymentId), timeout]);
    if (!payment?.success) return null;
    return payment.status?.toUpperCase() ?? null;
  } catch (error) {
    console.error('[qrshop][refund] PortOne payment lookup failed', { paymentId, error });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 환불 의도를 지운다(결제완료 상태일 때만). requestedAt 을 주면 그 요청의 의도일 때만 지운다.
 * 지웠으면 true.
 */
export async function clearRefundIntent(
  db: PrismaClient,
  orderId: string,
  requestedAt?: Date,
): Promise<boolean> {
  const cleared = await db.order.updateMany({
    where: {
      id: orderId,
      paymentStatus: ORDER_PAYMENT_STATUS.PAID,
      ...(requestedAt ? { refundRequestedAt: requestedAt } : {}),
    },
    data: { refundRequestedAt: null, refundRestoreStock: null, refundedByUserId: null },
  });
  return cleared.count > 0;
}

/**
 * 판매자 환불 마무리 트랜잭션. 판매자 환불 API, 웹훅(Transaction.Cancelled), 목록의 처리 중 확인이 같이 쓴다.
 * 주문 행을 잠그고 상태를 다시 읽어, 여러 경로가 동시에 와도 한 번만 반영된다.
 */
export async function finalizeSellerRefund(
  db: PrismaClient,
  params: { orderId: string; restoreStock: boolean; now: () => Date },
): Promise<RefundResult> {
  return db.$transaction(
    async (tx): Promise<RefundResult> => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${params.orderId} FOR UPDATE`;
      const current = await tx.order.findUnique({
        where: { id: params.orderId },
        select: {
          paymentStatus: true,
          cancelReason: true,
          items: { select: { onsiteProductId: true, onsiteOptionId: true, onsiteOptionName: true, quantity: true } },
        },
      });
      if (!current) return { kind: 'NOT_FOUND' };
      if (current.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) return notPaidResult(current);

      let stockNotRestored = 0;
      if (params.restoreStock) {
        for (const item of current.items) {
          const optionDetached = item.onsiteOptionName !== null && item.onsiteOptionId === null;
          if (!item.onsiteProductId || optionDetached) {
            stockNotRestored += 1;
            continue;
          }
          if (item.onsiteOptionId) {
            await tx.onsiteProductOption.updateMany({
              where: { optionId: item.onsiteOptionId },
              data: { currentStock: { increment: item.quantity } },
            });
          }
          await tx.onsiteProduct.updateMany({
            where: { productId: item.onsiteProductId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id: params.orderId },
        data: {
          paymentStatus: ORDER_PAYMENT_STATUS.CANCELED,
          canceledAt: params.now(),
          cancelReason: CANCEL_REASON_SELLER_REFUND,
        },
        select: SALES_ORDER_SELECT,
      });
      return { kind: 'REFUNDED', order: updated, stockNotRestored };
    },
    { timeout: 15000 },
  );
}

type PendingRefundRow = {
  id: string;
  paymentMethod: PaymentMethod;
  refundRequestedAt: Date | null;
  refundRestoreStock: boolean | null;
};

/**
 * 전체 주문 조회를 열 때 먼저 호출하는 처리 중 환불 확인(크론 없이 조회 시점에 반영).
 * 방문객 주문 조회의 미확정 주문 확인(`refreshUnconfirmedOrder`)과 같은 방식이다.
 *
 * 그 상점·그날의 처리 중 주문 가운데 요청 뒤 PENDING_REFUND_RECHECK_AFTER_MS 가 지난 것만 확인한다(아직 진행 중인
 * 요청과 겹치지 않게).
 * - 온라인 결제: PortOne 이 CANCELLED 면 저장된 재고 복원 선택대로 마무리, PAID 면 그 요청의 의도를 지운다.
 *   조회 실패·그 밖의 상태는 그대로 둔다.
 * - 현장 결제: 정상이라면 처리 중이 남지 않는다. 남았다면 요청이 중간에 끊긴 것이므로 의도를 지운다.
 *
 * 한 주문의 확인이 실패해도 나머지는 확인한다. 상태를 바꾼 주문 수를 돌려준다.
 */
export async function reconcilePendingRefunds(
  params: { storeId: string; timeKey: string },
  overrides: Partial<RefundDeps> = {},
): Promise<number> {
  const d = deps(overrides);
  const cutoff = new Date(d.now().getTime() - PENDING_REFUND_RECHECK_AFTER_MS);
  const pending: PendingRefundRow[] = await d.db.order.findMany({
    where: {
      orderNumber: { storeId: params.storeId, orderTimeKey: params.timeKey },
      paymentStatus: ORDER_PAYMENT_STATUS.PAID,
      refundRequestedAt: { not: null, lte: cutoff },
    },
    select: { id: true, paymentMethod: true, refundRequestedAt: true, refundRestoreStock: true },
    orderBy: { refundRequestedAt: 'asc' },
    take: RECONCILE_LIMIT,
  });

  const results = await Promise.allSettled(pending.map((order) => reconcilePendingRefund(order, d)));
  let changed = 0;
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      if (result.value) changed += 1;
    } else {
      console.error('[qrshop][refund] pending refund check failed', { orderId: pending[i].id, error: result.reason });
    }
  });
  return changed;
}

async function reconcilePendingRefund(order: PendingRefundRow, d: RefundDeps): Promise<boolean> {
  if (!order.refundRequestedAt) return false;
  if (order.paymentMethod !== 'ONLINE') return clearRefundIntent(d.db, order.id, order.refundRequestedAt);

  const status = await lookupPaymentStatus(d, order.id);
  if (status === 'CANCELLED') {
    const result = await finalizeSellerRefund(d.db, {
      orderId: order.id,
      restoreStock: order.refundRestoreStock ?? false,
      now: d.now,
    });
    return result.kind === 'REFUNDED';
  }
  if (status === 'PAID') return clearRefundIntent(d.db, order.id, order.refundRequestedAt);
  return false;
}

export type WebhookRefundResult =
  | { kind: 'NOT_TARGET' }
  | { kind: 'NOT_CANCELLED'; portoneStatus?: string }
  | { kind: 'LOOKUP_FAILED'; code?: string }
  | RefundResult;

/**
 * 웹훅(Transaction.Cancelled)으로 판매자 환불을 마무리한다.
 * 환불 의도가 남은 결제완료 주문만 대상이다. 그 밖의 취소(품절 자동 환불, 콘솔 취소 등)는 건드리지 않는다.
 * 웹훅 본문은 믿지 않고 PortOne 을 조회해 실제로 취소됐는지 확인한다.
 */
export async function finalizeRefundFromWebhook(
  paymentId: string,
  overrides: Partial<RefundDeps> = {},
): Promise<WebhookRefundResult> {
  const d = deps(overrides);
  const order = await d.db.order.findUnique({
    where: { id: paymentId },
    select: { id: true, paymentStatus: true, refundRequestedAt: true, refundRestoreStock: true },
  });
  if (!order || order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID || !order.refundRequestedAt) {
    return { kind: 'NOT_TARGET' };
  }

  const payment = await d.getPayment(order.id);
  if (!payment.success) return { kind: 'LOOKUP_FAILED', code: payment.code };
  if (payment.status?.toUpperCase() !== 'CANCELLED') return { kind: 'NOT_CANCELLED', portoneStatus: payment.status };

  return finalizeSellerRefund(d.db, { orderId: order.id, restoreStock: order.refundRestoreStock ?? false, now: d.now });
}
