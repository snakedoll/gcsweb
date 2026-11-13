import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiErrors, apiSuccess } from '@/lib/api-response';
import { requirePosAccess } from '@/lib/qrshop/pos-access';
import { isExposureInputValid, loadStoreExposure, saveExposure, toExposureView } from '@/lib/qrshop/pos-exposure';

export const dynamic = 'force-dynamic';

const SaveExposureSchema = z.object({
  groups: z.array(
    z.object({
      categoryId: z.string().min(1).nullable(),
      productIds: z.array(z.string().min(1)),
    }),
  ),
});

class ExposureChanged extends Error {}

/**
 * GET /api/v2/qrshop/pos/exposure
 * 노출 편집 화면: 카테고리별 노출 상품 묶음과 전체 상품(미노출 포함). 소유자와 승인된 직원.
 */
export async function GET() {
  try {
    const auth = await requirePosAccess();
    if (!auth.ok) return auth.response;

    return apiSuccess(toExposureView(await loadStoreExposure(prisma, auth.access.store.storeId)));
  } catch (error) {
    console.error('[GET /api/v2/qrshop/pos/exposure]', error);
    return apiErrors.serverError();
  }
}

/**
 * PUT /api/v2/qrshop/pos/exposure
 * body { groups: [{ categoryId | null, productIds }] } 노출 구성을 통째로 저장한다. 소유자만.
 * 목록에 없는 상품은 미노출. 편집 중에 상품·카테고리가 바뀌었으면 409 EXPOSURE_CHANGED.
 */
export async function PUT(request: Request) {
  try {
    const auth = await requirePosAccess({ ownerOnly: true });
    if (!auth.ok) return auth.response;

    const parsed = SaveExposureSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiErrors.invalidInput('유효하지 않은 요청');

    const storeId = auth.access.store.storeId;
    const view = await prisma.$transaction(async (tx) => {
      const [categories, products] = await Promise.all([
        tx.onsiteProductCategory.findMany({ where: { storeId }, select: { categoryId: true } }),
        tx.onsiteProduct.findMany({ where: { storeId }, select: { productId: true, categoryId: true } }),
      ]);
      if (!isExposureInputValid(parsed.data.groups, categories, products)) throw new ExposureChanged();

      await saveExposure(tx, storeId, parsed.data.groups);
      return toExposureView(await loadStoreExposure(tx, storeId));
    });

    return apiSuccess(view);
  } catch (error) {
    if (error instanceof ExposureChanged) return apiError(409, 'EXPOSURE_CHANGED', '상품 목록 변경됨');
    console.error('[PUT /api/v2/qrshop/pos/exposure]', error);
    return apiErrors.serverError();
  }
}
