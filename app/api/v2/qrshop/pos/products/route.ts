import { prisma } from '@/lib/db';
import { apiErrors, apiSuccess } from '@/lib/api-response';
import { requirePosAccess } from '@/lib/qrshop/pos-access';
import { loadStoreExposure, toPosCatalog } from '@/lib/qrshop/pos-exposure';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v2/qrshop/pos/products
 * 현장 포스 상품 그리드. 노출 상품만 카테고리 순서 → 상품 순서로. 소유자와 승인된 직원.
 */
export async function GET() {
  try {
    const auth = await requirePosAccess();
    if (!auth.ok) return auth.response;

    return apiSuccess(toPosCatalog(await loadStoreExposure(prisma, auth.access.store.storeId)));
  } catch (error) {
    console.error('[GET /api/v2/qrshop/pos/products]', error);
    return apiErrors.serverError();
  }
}
