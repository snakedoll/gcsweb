import { apiErrors } from '@/lib/api-response';
import { getStoreAccess, type StoreAccess } from './store-access';
import { storeErrors } from './store-api';

/**
 * 현장 포스 API의 상점 확인. 조회는 소유자·승인된 직원, 변경(ownerOnly)은 소유자만.
 * 직원의 변경 권한은 기획 확인 중이다(#59).
 */
export async function requirePosAccess(
  options: { ownerOnly?: boolean } = {},
): Promise<{ ok: true; access: StoreAccess } | { ok: false; response: Response }> {
  const ctx = await getStoreAccess();
  if (!ctx.ok) return { ok: false, response: apiErrors.unauthorized() };
  if (!ctx.access) return { ok: false, response: storeErrors.notFound() };
  if (options.ownerOnly && ctx.access.role !== 'OWNER') {
    return { ok: false, response: apiErrors.forbidden('소유자만 변경 가능') };
  }
  return { ok: true, access: ctx.access };
}
