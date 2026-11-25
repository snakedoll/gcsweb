import { apiErrors } from '@/lib/api-response';
import { getStoreAccess, type StoreAccess } from './store-access';
import { storeErrors } from './store-api';

/** 소유자와 승인된 직원은 선택한 상점의 현장 포스를 사용할 수 있다. */
export async function requirePosAccess(
  request: Request,
): Promise<{ ok: true; access: StoreAccess } | { ok: false; response: Response }> {
  const ctx = await getStoreAccess(new URL(request.url).searchParams.get('storeSlug'));
  if (!ctx.ok) return { ok: false, response: apiErrors.unauthorized() };
  if (!ctx.access) return { ok: false, response: storeErrors.notFound() };
  return { ok: true, access: ctx.access };
}
