import type { PrismaClient, StoreStaffStatus } from '@prisma/client';
import { apiError, apiErrors } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { getStoreOrigin } from './store';

/**
 * 직원 관리 공통 로직. 응답 형식은 프론트 계약 `lib/services/pos-staff-service.ts`(PosStaffSnapshot)를 따른다.
 */

export type StaffMember = {
  id: string;
  name: string;
  requestedAt: string;
  registeredAt?: string;
};

export type StaffSnapshot = {
  inviteUrl: string;
  pending: StaffMember[];
  registered: StaffMember[];
};

/** 초대 링크로 들어온 사용자의 상태. 프론트가 요청 화면 / 승인 대기 화면 / 현장 포스 중 무엇을 보일지 정한다. */
export type InviteStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'owner';

export const staffErrors = {
  notFound: () => apiErrors.notFound('직원을 찾을 수 없음'),
  invalidInvite: () => apiErrors.notFound('유효하지 않은 초대 링크'),
  notPending: () => apiError(409, 'STAFF_NOT_PENDING', '승인 대기 중이 아닌 직원'),
  notRegistered: () => apiError(409, 'STAFF_NOT_REGISTERED', '등록된 직원이 아님'),
  isOwner: () => apiError(409, 'STAFF_IS_OWNER', '본인 상점'),
};

/** 직원 초대 링크. 직원이 여는 화면 주소이며, 비로그인이면 middleware 가 로그인 후 돌아오게 한다. */
export function buildStaffInviteUrl(inviteCode: string, origin: string = getStoreOrigin()): string {
  return `${origin}/sales-management/v2/staff/join/${encodeURIComponent(inviteCode)}`;
}

type StaffRow = {
  id: string;
  status: StoreStaffStatus;
  requestedAt: Date;
  approvedAt: Date | null;
  user: { name: string };
};

export function toStaffMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    name: row.user.name,
    requestedAt: row.requestedAt.toISOString(),
    ...(row.status === 'APPROVED' && row.approvedAt ? { registeredAt: row.approvedAt.toISOString() } : {}),
  };
}

export function toInviteStatus(params: { isOwner: boolean; status: StoreStaffStatus | null }): InviteStatus {
  if (params.isOwner) return 'owner';
  switch (params.status) {
    case 'PENDING':
      return 'pending';
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    default:
      return 'none';
  }
}

type Db = Pick<PrismaClient, 'store' | 'storeStaff'>;

export type OwnedStore = { storeId: string; staffInviteCode: string };

/** 직원 관리는 소유자만 한다. 소유한 상점이 없으면 null. */
export function findOwnedStore(userId: string, db: Db = prisma): Promise<OwnedStore | null> {
  return db.store.findUnique({ where: { userId }, select: { storeId: true, staffInviteCode: true } });
}

/** 직원 관리 패널 데이터. 승인 대기는 최근 요청순, 등록된 직원은 최근 승인순. 거절된 요청은 보이지 않는다. */
export async function loadStaffSnapshot(store: OwnedStore, db: Db = prisma): Promise<StaffSnapshot> {
  const rows = await db.storeStaff.findMany({
    where: { storeId: store.storeId, status: { in: ['PENDING', 'APPROVED'] } },
    select: { id: true, status: true, requestedAt: true, approvedAt: true, user: { select: { name: true } } },
    orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
  });

  const pending = rows.filter((row) => row.status === 'PENDING');
  const registered = rows
    .filter((row) => row.status === 'APPROVED')
    .sort((a, b) => (b.approvedAt?.getTime() ?? 0) - (a.approvedAt?.getTime() ?? 0));

  return {
    inviteUrl: buildStaffInviteUrl(store.staffInviteCode),
    pending: pending.map(toStaffMember),
    registered: registered.map(toStaffMember),
  };
}
