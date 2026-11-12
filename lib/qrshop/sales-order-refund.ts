import type { PrismaClient } from '@prisma/client';
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
 * 1) 환불 의도(refundRequestedAt·refundRestoreStock·refundedByUserId)를 먼저 저장한다. 실패하면 아무 일도 없던 것.
 * 2) 온라인 결제는 PortOne 결제를 취소한다.
 *    - PortOne 이 거절하면 의도를 지우고 실패로 끝낸다.
 *    - 응답을 못 받으면(네트워크 오류) 실제 취소 여부를 모르므로 의도를 남긴다. 취소됐다면 웹훅이 마무리하고,
 *      판매자가 다시 누르면 PortOne 이 "이미 취소됨"을 성공으로 돌려줘 마무리된다. 그동안 목록에는 '환불 처리 중'.
 *    현장 결제는 돈을 판매자가 결제수단에 맞게 따로 돌려주므로 이 단계가 없다.
 * 3) 마무리 트랜잭션(`finalizeSellerRefund`): 주문을 CANCELED(SELLER_REFUND)로 바꾸고, 고른 대로 재고를 되돌린다.
 *    여기서 실패해도 1의 의도가 남아 웹훅(Transaction.Cancelled)이나 재요청이 마무리한다.
 *
 * 재고 복원은 결제 확정 때 차감한 상품·옵션 재고 그대로다. 주문 뒤 옵션이 바뀌어 옵션 연결이 끊긴 항목은 건너뛴다.
 */

const REFUND_REASON = '판매자 환불';

/** 응답을 받지 못해 PortOne 에서 실제로 취소됐는지 알 수 없는 실패 코드. */
const AMBIGUOUS_CANCEL_CODES = new Set(['NETWORK_ERROR']);

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
  | { kind: 'CANCEL_FAILED'; code?: string; intentKept: boolean }
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
    select: { id: true, paymentStatus: true, paymentMethod: true, cancelReason: true },
  });
  if (!order) return { kind: 'NOT_FOUND' };
  if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) return notPaidResult(order);

  // 1) 환불 의도 저장. 결제완료일 때만 남긴다(그 사이 다른 사람이 환불했으면 0건).
  const intent = await db.order.updateMany({
    where: { id: order.id, paymentStatus: ORDER_PAYMENT_STATUS.PAID },
    data: { refundRequestedAt: d.now(), refundRestoreStock: params.restoreStock, refundedByUserId: params.userId },
  });
  if (intent.count === 0) {
    const current = await db.order.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true, cancelReason: true },
    });
    return current ? notPaidResult(current) : { kind: 'NOT_FOUND' };
  }

  // 2) 온라인 결제는 PortOne 취소
  if (order.paymentMethod === 'ONLINE') {
    const cancel = await d.cancelPayment({ paymentId: order.id, reason: REFUND_REASON });
    if (!cancel.success) {
      const intentKept = AMBIGUOUS_CANCEL_CODES.has(cancel.code ?? '');
      if (!intentKept) await clearRefundIntent(db, order.id);
      console.error('[qrshop][refund] PortOne cancel failed', { orderId: order.id, code: cancel.code ?? null, intentKept });
      return { kind: 'CANCEL_FAILED', code: cancel.code, intentKept };
    }
  }

  // 3) 마무리
  return finalizeSellerRefund(db, { orderId: order.id, restoreStock: params.restoreStock, now: d.now });
}

/** PortOne 이 취소를 거절했을 때 남긴 환불 의도를 지운다(결제완료 상태일 때만). */
export async function clearRefundIntent(db: PrismaClient, orderId: string): Promise<void> {
  await db.order.updateMany({
    where: { id: orderId, paymentStatus: ORDER_PAYMENT_STATUS.PAID },
    data: { refundRequestedAt: null, refundRestoreStock: null, refundedByUserId: null },
  });
}

/**
 * 판매자 환불 마무리 트랜잭션. 판매자 환불 API와 웹훅(Transaction.Cancelled)이 같이 쓴다.
 * 주문 행을 잠그고 상태를 다시 읽어, 두 경로가 동시에 와도 한 번만 반영된다.
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
