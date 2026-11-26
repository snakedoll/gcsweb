import { requestSalesApi, StoreApiError, withOperationalStore } from './sales-management-api-client';
import type { PosStaffInvite, PosStaffInviteRequestResult, PosStaffService, PosStaffSnapshot } from './pos-staff-service';

export interface OperationalStoreRole {
  role: 'OWNER' | 'STAFF';
  store: { storeId: string; name: string; storeSlug: string };
}

export async function getOperationalStoreRole(storeSlug?: string, base?: string) {
  try {
    return await requestSalesApi<OperationalStoreRole | null>(withOperationalStore('/staff/me', storeSlug), undefined, base);
  } catch (error) {
    if (storeSlug !== undefined && error instanceof StoreApiError && error.status === 404 && error.code === 'NOT_FOUND') return null;
    throw error;
  }
}

export function createPosStaffApiService(base?: string): PosStaffService {
  function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    return requestSalesApi<PosStaffSnapshot>(`/staff/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }, base);
  }

  return {
    getStaff: () => requestSalesApi<PosStaffSnapshot>('/staff', undefined, base),
    approve: (id) => decide(id, 'APPROVED'),
    reject: (id) => decide(id, 'REJECTED'),
    remove: (id) => requestSalesApi<PosStaffSnapshot>(`/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }, base),
  };
}

export function createPosStaffInviteApiService(inviteCode: string, base?: string) {
  const path = `/staff/invite/${encodeURIComponent(inviteCode)}`;
  return {
    getInvite: (signal?: AbortSignal) => requestSalesApi<PosStaffInvite>(path, { signal }, base),
    requestAccess: (signal?: AbortSignal) => requestSalesApi<PosStaffInviteRequestResult>(path, { method: 'POST', signal }, base),
  };
}
