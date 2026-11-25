import { z } from 'zod';
import { apiError, apiErrors, apiSuccess } from '@/lib/api-response';
import { completePosSale, type PosSaleResult } from '@/lib/qrshop/pos-sale';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { storeErrors } from '@/lib/qrshop/store-api';

export const dynamic = 'force-dynamic';

const PosSaleSchema = z.object({
  /** 결제마다 프론트가 새로 만드는 요청 키(예: UUID). 다시 보내도 결제는 한 번만 처리된다. */
  clientRequestId: z.string().trim().min(8).max(64),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        optionId: z.string().min(1).nullish(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  paymentMethod: z.enum(['card', 'cash', 'transfer']),
});

type InvalidFailure = Extract<PosSaleResult, { kind: 'INVALID' }>['failure'];

function toInvalidResponse(failure: InvalidFailure) {
  const reason = failure.reason;
  switch (reason) {
    case 'STORE_NOT_FOUND':
      return storeErrors.notFound();
    case 'PRODUCT_NOT_FOUND':
      return apiErrors.notFound('존재하지 않는 상품');
    case 'OPTION_NOT_FOUND':
      return apiErrors.notFound('존재하지 않는 옵션');
    case 'OPTION_REQUIRED':
      return apiErrors.invalidInput('옵션 선택 필요');
    case 'OPTION_NOT_ALLOWED':
      return apiErrors.invalidInput('옵션 미사용 상품');
    default: {
      // 검증 사유가 새로 생기면 여기서 타입 오류가 난다. 실행 중에 들어오면 응답 없이 끝나지 않게 500.
      const unhandled: never = reason;
      console.error('[POST /api/v2/qrshop/pos/orders] unhandled validation failure', unhandled);
      return apiErrors.serverError();
    }
  }
}

/**
 * POST /api/v2/qrshop/pos/orders
 * body { clientRequestId, items: [{ productId, optionId?, quantity }], paymentMethod: 'card' | 'cash' | 'transfer' }
 * 현장 포스 결제 완료. 결제완료 현장결제 주문을 만들고 재고를 차감하고 주문번호를 발급한다.
 * 같은 clientRequestId 가 다시 오면 처음 영수증을 그대로 돌려준다.
 * 상점 소유자와 승인된 직원. 응답은 프론트 계약 PosReceipt(+ orderId).
 */
export async function POST(request: Request) {
  try {
    const ctx = await getStoreAccess();
    if (!ctx.ok) return apiErrors.unauthorized();
    if (!ctx.access) return storeErrors.notFound();

    const parsed = PosSaleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiErrors.invalidInput('유효하지 않은 요청');

    const { store } = ctx.access;
    const result = await completePosSale({
      storeId: store.storeId,
      storeSlug: store.storeSlug,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod,
      clientRequestId: parsed.data.clientRequestId,
      soldByUserId: ctx.userId,
    });

    switch (result.kind) {
      case 'COMPLETED':
        return apiSuccess(result.receipt);
      case 'SOLD_OUT':
        // 1106 기획회의: 품절 상품은 한 토스트에 나열하고 결제 섹션에서 자동 제외한다(화면 몫).
        return apiError(409, 'SOLD_OUT', '품절된 상품', { soldOutItems: result.soldOutItems });
      case 'REQUEST_ID_CONFLICT':
        return apiError(409, 'REQUEST_ID_CONFLICT', '이미 사용된 요청 키');
      case 'INVALID':
        return toInvalidResponse(result.failure);
      default: {
        const unhandled: never = result;
        console.error('[POST /api/v2/qrshop/pos/orders] unhandled result', unhandled);
        return apiErrors.serverError();
      }
    }
  } catch (error) {
    console.error('[POST /api/v2/qrshop/pos/orders]', error);
    return apiErrors.serverError();
  }
}
