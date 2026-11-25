export const MOCK_STAFF_INVITE_TOKEN = 'demo';
export const MOCK_STAFF_INVITE_PATH = `/sales-management/v2/staff/join/${MOCK_STAFF_INVITE_TOKEN}`;
export const MOCK_STAFF_REQUEST_ID = 'mock-staff-invite-applicant';
export const MOCK_STAFF_APPLICANT_NAME = 'Mock 신청자';

const storageKey = 'gcsweb:mock-pos-staff-invite';

type MockStaffInviteRequest = {
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt?: string;
};

export function readMockStaffInviteRequest(): MockStaffInviteRequest | null {
  if (typeof window === 'undefined') return null;
  try {
    const request = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
    if (!request || typeof request.requestedAt !== 'string' || !Number.isFinite(Date.parse(request.requestedAt))) return null;
    if (request.status === 'pending' || request.status === 'rejected') {
      return { requestedAt: request.requestedAt, status: request.status };
    }
    if (request.status === 'approved' && typeof request.registeredAt === 'string' && Number.isFinite(Date.parse(request.registeredAt))) {
      return { requestedAt: request.requestedAt, status: 'approved', registeredAt: request.registeredAt };
    }
  } catch {
    return null;
  }
  return null;
}

function writeMockStaffInviteRequest(request: MockStaffInviteRequest | null) {
  if (request) window.localStorage.setItem(storageKey, JSON.stringify(request));
  else window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(storageKey));
}

export function subscribeToMockStaffInvite(listener: () => void) {
  const storageChanged = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) listener();
  };
  window.addEventListener('storage', storageChanged);
  window.addEventListener(storageKey, listener);
  return () => {
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener(storageKey, listener);
  };
}

export async function requestMockStaffInvite(simulateFailure = false) {
  await new Promise<void>(resolve => window.setTimeout(resolve, 600));
  if (simulateFailure) throw new Error('Mock 직원 요청 실패');
  const request = readMockStaffInviteRequest();
  if (request?.status === 'approved' || request?.status === 'pending') return;
  writeMockStaffInviteRequest({ requestedAt: new Date().toISOString(), status: 'pending' });
}

export function decideMockStaffInvite(status: 'approved' | 'rejected') {
  const request = readMockStaffInviteRequest();
  if (request?.status !== 'pending') throw new Error('승인 대기 직원을 찾을 수 없어요.');
  writeMockStaffInviteRequest({
    ...request,
    status,
    registeredAt: status === 'approved' ? new Date().toISOString() : undefined,
  });
}

export function removeMockStaffInvite() {
  if (readMockStaffInviteRequest()?.status !== 'approved') throw new Error('등록된 직원을 찾을 수 없어요.');
  writeMockStaffInviteRequest(null);
}
