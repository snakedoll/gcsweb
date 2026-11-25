import { apiErrors, apiSuccess } from '@/lib/api-response';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { storeErrors } from '@/lib/qrshop/store-api';

/**
 * GET /api/v2/qrshop/staff/me
 * storeSlug 생략 시 소유 상점, 지정 시 해당 상점의 소유자 또는 승인 직원 역할을 돌려준다.
 * 지정한 상점에 접근할 수 없으면 404를 반환한다.
 * 프론트는 role 로 `직원 관리` 버튼(소유자 전용) 노출을 정한다.
 */
export async function GET(request: Request) {
  try {
    const storeSlug = new URL(request.url).searchParams.get('storeSlug');
    const ctx = await getStoreAccess(storeSlug);
    if (!ctx.ok) return apiErrors.unauthorized();
    if (!ctx.access) return storeSlug === null ? apiSuccess(null) : storeErrors.notFound();

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
