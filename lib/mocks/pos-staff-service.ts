import type { PosStaffService, PosStaffSnapshot } from '@/lib/services/pos-staff-service';
import {
  decideMockStaffInvite, MOCK_STAFF_APPLICANT_NAME, MOCK_STAFF_INVITE_PATH, MOCK_STAFF_REQUEST_ID,
  readMockStaffInviteRequest, removeMockStaffInvite, subscribeToMockStaffInvite,
} from './pos-staff-invite-service';

function copy(snapshot: PosStaffSnapshot): PosStaffSnapshot {
  return { ...snapshot, pending: snapshot.pending.map(member => ({ ...member })), registered: snapshot.registered.map(member => ({ ...member })) };
}

// Fixture changes stay in the POS Provider. The demo applicant is shared through browser storage.
export function createMockPosStaffService(initial?: PosStaffSnapshot): PosStaffService {
  const snapshot = copy(initial ?? {
    inviteUrl: MOCK_STAFF_INVITE_PATH,
    pending: [
      { id: 'pending-1', name: '정서윤', requestedAt: '2026-11-07T10:21:00+09:00' },
      { id: 'pending-2', name: '이서준', requestedAt: '2026-11-04T14:30:00+09:00' },
    ],
    registered: [
      { id: 'staff-1', name: '김민수', requestedAt: '2026-09-01T10:00:00+09:00', registeredAt: '2026-09-02T10:00:00+09:00' },
      { id: 'staff-2', name: '박지민', requestedAt: '2026-09-02T10:00:00+09:00', registeredAt: '2026-09-03T10:00:00+09:00' },
    ],
  });

  function getSnapshot() {
    const result = copy(snapshot);
    if (initial || typeof window === 'undefined') return result;

    result.inviteUrl = new URL(MOCK_STAFF_INVITE_PATH, window.location.origin).href;
    const request = readMockStaffInviteRequest();
    if (!request || request.status === 'rejected') return result;
    const member = { id: MOCK_STAFF_REQUEST_ID, name: MOCK_STAFF_APPLICANT_NAME, requestedAt: request.requestedAt };
    if (request.status === 'pending') result.pending.unshift(member);
    else result.registered.push({ ...member, registeredAt: request.registeredAt });
    return result;
  }

  function takePending(id: string) {
    const index = snapshot.pending.findIndex(member => member.id === id);
    if (index < 0) throw new Error('승인 대기 직원을 찾을 수 없어요.');
    return snapshot.pending.splice(index, 1)[0];
  }

  return {
    subscribeToInviteChanges: initial ? undefined : subscribeToMockStaffInvite,
    async getStaff() { return getSnapshot(); },
    async approve(id) {
      if (!initial && id === MOCK_STAFF_REQUEST_ID) decideMockStaffInvite('approved');
      else {
        const member = takePending(id);
        snapshot.registered.push({ ...member, registeredAt: new Date().toISOString() });
      }
      return getSnapshot();
    },
    async reject(id) {
      if (!initial && id === MOCK_STAFF_REQUEST_ID) decideMockStaffInvite('rejected');
      else takePending(id);
      return getSnapshot();
    },
    async remove(id) {
      if (!initial && id === MOCK_STAFF_REQUEST_ID) removeMockStaffInvite();
      else {
        const index = snapshot.registered.findIndex(member => member.id === id);
        if (index < 0) throw new Error('등록된 직원을 찾을 수 없어요.');
        snapshot.registered.splice(index, 1);
      }
      return getSnapshot();
    },
  };
}
