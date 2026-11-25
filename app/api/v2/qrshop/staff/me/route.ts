import { apiErrors, apiSuccess } from '@/lib/api-response';
import { getStoreAccess } from '@/lib/qrshop/store-access';

/**
 * GET /api/v2/qrshop/staff/me
 * 현장 운영 화면에서 쓸 내 상점과 역할. 소유자면 OWNER, 승인된 직원이면 STAFF, 둘 다 아니면 data=null.
 * 프론트는 role 로 `직원 관리` 버튼(소유자 전용) 노출을 정한다.
 */
export async function GET() {
  try {
    const ctx = await getStoreAccess();
    if (!ctx.ok) return apiErrors.unauthorized();
    if (!ctx.access) return apiSuccess(null);

    const { role, store } = ctx.access;
    return apiSuccess({
      role,
      store: { storeId: store.storeId, name: store.name, storeSlug: store.storeSlug },
    });
  } catch (error) {
    console.error('[GET /api/v2/qrshop/staff/me]', error);
    return apiErrors.serverError();
  }
}
