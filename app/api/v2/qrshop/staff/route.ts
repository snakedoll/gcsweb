import { apiErrors, apiSuccess } from '@/lib/api-response';
import { requireStoreUser, storeErrors } from '@/lib/qrshop/store-api';
import { findOwnedStore, loadStaffSnapshot } from '@/lib/qrshop/staff';

/**
 * GET /api/v2/qrshop/staff
 * 직원 관리 패널: 초대 링크, 승인 대기, 등록된 직원. 상점 소유자만.
 */
export async function GET() {
  try {
    const auth = await requireStoreUser();
    if (!auth.ok) return auth.response;

    const store = await findOwnedStore(auth.userId);
    if (!store) return storeErrors.notFound();

    return apiSuccess(await loadStaffSnapshot(store));
  } catch (error) {
    console.error('[GET /api/v2/qrshop/staff]', error);
    return apiErrors.serverError();
  }
}
