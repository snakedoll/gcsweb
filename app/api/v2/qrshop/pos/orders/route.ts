import { z } from 'zod';
import { apiError, apiErrors, apiSuccess } from '@/lib/api-response';
import { completePosSale } from '@/lib/qrshop/pos-sale';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { storeErrors } from '@/lib/qrshop/store-api';

export const dynamic = 'force-dynamic';

const PosSaleSchema = z.object({
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

/**
 * POST /api/v2/qrshop/pos/orders  body { items: [{ productId, optionId?, quantity }], paymentMethod }
 * 현장 포스 결제 완료. 결제완료 현장결제 주문을 만들고 재고를 차감하고 주문번호를 발급한다.
 * 상점 소유자와 승인된 직원. 응답은 프론트 계약 PosReceipt(+ orderId).
 */
export async function POST(request: Request) {
  try {
    const ctx = await getStoreAccess();
    if (!ctx.ok) return apiErrors.unauthorized();
    if (!ctx.access) return storeErrors.notFound();

    const parsed = PosSaleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiErrors.invalidInput('유효하지 않은 요청');

    const result = await completePosSale({
      storeSlug: ctx.access.store.storeSlug,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod,
    });

    switch (result.kind) {
      case 'COMPLETED':
        return apiSuccess(result.receipt);
      case 'SOLD_OUT':
        // 1106 기획회의: 품절 상품은 한 토스트에 나열하고 결제 섹션에서 자동 제외한다(화면 몫).
        return apiError(409, 'SOLD_OUT', '품절된 상품', { soldOutItems: result.soldOutItems });
      case 'INVALID':
        switch (result.failure.reason) {
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
        }
    }
  } catch (error) {
    console.error('[POST /api/v2/qrshop/pos/orders]', error);
    return apiErrors.serverError();
  }
}
