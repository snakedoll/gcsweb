import { z } from 'zod';
import { apiError, apiErrors, apiSuccess } from '@/lib/api-response';
import { refundSalesOrder } from '@/lib/qrshop/sales-order-refund';
import { toSalesOrderView } from '@/lib/qrshop/sales-orders';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { storeErrors } from '@/lib/qrshop/store-api';

type Params = { params: { orderId: string } };

const refundSchema = z.object({ restoreStock: z.boolean() });

/**
 * POST /api/v2/qrshop/sales-orders/{orderId}/refund  body { restoreStock: boolean }
 * 주문 전체 환불. 온라인 결제는 PortOne 취소, 현장 결제는 기록만 바꾼다. 상점 소유자와 승인된 직원.
 * 응답은 환불된 주문 한 건(목록과 같은 형식) + refundRestoreStock.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await getStoreAccess();
    if (!ctx.ok) return apiErrors.unauthorized();
    if (!ctx.access) return storeErrors.notFound();

    const parsed = refundSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiErrors.invalidInput('유효하지 않은 요청');

    const result = await refundSalesOrder({
      orderId: params.orderId,
      storeId: ctx.access.store.storeId,
      restoreStock: parsed.data.restoreStock,
    });

    switch (result.kind) {
      case 'NOT_FOUND':
        return apiErrors.notFound('주문을 찾을 수 없음');
      case 'ALREADY_REFUNDED':
        return apiError(409, 'ORDER_ALREADY_REFUNDED', '이미 환불된 주문');
      case 'NOT_REFUNDABLE':
        return apiError(409, 'ORDER_NOT_REFUNDABLE', '환불할 수 없는 주문');
      case 'CANCEL_FAILED':
        return apiErrors.serverError('결제 취소 실패');
      case 'REFUNDED':
        if (result.stockNotRestored > 0) {
          console.warn('[qrshop][refund] some items not restocked', {
            orderId: params.orderId,
            count: result.stockNotRestored,
          });
        }
        return apiSuccess({ ...toSalesOrderView(result.order), refundRestoreStock: parsed.data.restoreStock });
    }
  } catch (error) {
    console.error('[POST /api/v2/qrshop/sales-orders/[orderId]/refund]', error);
    return apiErrors.serverError();
  }
}
