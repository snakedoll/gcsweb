import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ORDER_PAYMENT_STATUS } from '@/lib/order-status';
import { cancelPayment } from '@/lib/payment/portone';
import {
  CANCEL_REASON_SELLER_REFUND,
  SALES_ORDER_SELECT,
  type SalesOrderRow,
} from './sales-orders';

/**
 * 전체 주문 조회의 환불 신청. 주문 전체를 환불한다.
 *
 * - 온라인 결제: PortOne 결제 취소 후 주문을 CANCELED(SELLER_REFUND)로 바꾼다.
 *   취소가 끝났는데 DB 반영이 실패해도, 다시 요청하면 PortOne 이 "이미 취소됨"을 성공으로 돌려줘 그대로 마무리된다.
 * - 현장 결제: 돈은 판매자가 결제수단에 맞게 따로 돌려준다. 여기서는 기록만 바꾼다.
 * - restoreStock 이면 주문 수량만큼 재고를 되돌린다(결제 확정 때 차감한 상품·옵션 재고 그대로).
 *   주문 뒤 옵션이 바뀌어 옵션 연결이 끊긴 항목은 되돌릴 대상이 없어 건너뛴다.
 */

const REFUND_REASON = '판매자 환불';

export type RefundDeps = {
  db: PrismaClient;
  cancelPayment: typeof cancelPayment;
  now: () => Date;
};

export type RefundResult =
  | { kind: 'NOT_FOUND' }
  | { kind: 'ALREADY_REFUNDED' }
  | { kind: 'NOT_REFUNDABLE' }
  | { kind: 'CANCEL_FAILED'; code?: string }
  | { kind: 'REFUNDED'; order: SalesOrderRow; stockNotRestored: number };

const isSellerRefund = (order: { paymentStatus: string; cancelReason: string | null }) =>
  order.paymentStatus === ORDER_PAYMENT_STATUS.CANCELED && order.cancelReason === CANCEL_REASON_SELLER_REFUND;

export async function refundSalesOrder(
  params: { orderId: string; storeId: string; restoreStock: boolean },
  overrides: Partial<RefundDeps> = {},
): Promise<RefundResult> {
  const deps: RefundDeps = { db: prisma, cancelPayment, now: () => new Date(), ...overrides };
  const { db } = deps;

  const order = await db.order.findFirst({
    where: { id: params.orderId, orderNumber: { storeId: params.storeId } },
    select: { id: true, paymentStatus: true, paymentMethod: true, cancelReason: true },
  });
  if (!order) return { kind: 'NOT_FOUND' };
  if (isSellerRefund(order)) return { kind: 'ALREADY_REFUNDED' };
  if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) return { kind: 'NOT_REFUNDABLE' };

  if (order.paymentMethod === 'ONLINE') {
    const cancel = await deps.cancelPayment({ paymentId: order.id, reason: REFUND_REASON });
    if (!cancel.success) {
      console.error('[qrshop][refund] PortOne cancel failed', { orderId: order.id, code: cancel.code ?? null });
      return { kind: 'CANCEL_FAILED', code: cancel.code };
    }
  }

  return db.$transaction(
    async (tx): Promise<RefundResult> => {
      // 같은 주문을 두 사람이 동시에 환불해도 한 번만 반영되게 주문 행을 잠그고 상태를 다시 읽는다.
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
      const current = await tx.order.findUnique({
        where: { id: order.id },
        select: {
          paymentStatus: true,
          cancelReason: true,
          items: { select: { onsiteProductId: true, onsiteOptionId: true, onsiteOptionName: true, quantity: true } },
        },
      });
      if (!current) return { kind: 'NOT_FOUND' };
      if (isSellerRefund(current)) return { kind: 'ALREADY_REFUNDED' };
      if (current.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) return { kind: 'NOT_REFUNDABLE' };

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
        where: { id: order.id },
        data: {
          paymentStatus: ORDER_PAYMENT_STATUS.CANCELED,
          canceledAt: deps.now(),
          cancelReason: CANCEL_REASON_SELLER_REFUND,
        },
        select: SALES_ORDER_SELECT,
      });
      return { kind: 'REFUNDED', order: updated, stockNotRestored };
    },
    { timeout: 15000 },
  );
}
