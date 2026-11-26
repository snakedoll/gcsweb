// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildStaffInviteUrl, loadStaffSnapshot, toInviteStatus, toStaffMember } from './staff';
import { findStoreAccess } from './store-access';

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

afterEach(() => vi.unstubAllEnvs());

const at = (iso: string) => new Date(iso);

describe('buildStaffInviteUrl', () => {
  it('NEXTAUTH_URL 기준 직원 초대 화면 주소', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://www.gcsweb.kr/');
    expect(buildStaffInviteUrl('abc123')).toBe('https://www.gcsweb.kr/sales-management/v2/staff/join/abc123');
  });
});

describe('toStaffMember', () => {
  it('승인 대기는 registeredAt 이 없다', () => {
    expect(
      toStaffMember({ id: 'm1', status: 'PENDING', requestedAt: at('2026-11-12T10:21:00Z'), approvedAt: null, user: { name: '정서윤' } }),
    ).toEqual({ id: 'm1', name: '정서윤', requestedAt: '2026-11-12T10:21:00.000Z' });
  });

  it('등록된 직원은 승인 시각을 registeredAt 으로', () => {
    expect(
      toStaffMember({
        id: 'm2',
        status: 'APPROVED',
        requestedAt: at('2026-09-01T00:00:00Z'),
        approvedAt: at('2026-09-02T00:00:00Z'),
        user: { name: '김민수' },
      }),
    ).toMatchObject({ registeredAt: '2026-09-02T00:00:00.000Z' });
  });
});

describe('toInviteStatus', () => {
  it.each([
    [true, null, 'owner'],
    [false, null, 'none'],
    [false, 'PENDING', 'pending'],
    [false, 'APPROVED', 'approved'],
    [false, 'REJECTED', 'rejected'],
  ] as const)('소유자=%s 상태=%s → %s', (isOwner, status, expected) => {
    expect(toInviteStatus({ isOwner, status })).toBe(expected);
  });
});

describe('loadStaffSnapshot', () => {
  it('대기는 최근 요청순, 등록은 최근 승인순으로 나누고 초대 링크를 붙인다', async () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://www.gcsweb.kr');
    const rows = [
      { id: 'p2', status: 'PENDING', requestedAt: at('2026-11-12T10:00:00Z'), approvedAt: null, user: { name: '나중' } },
      { id: 'a1', status: 'APPROVED', requestedAt: at('2026-11-12T09:00:00Z'), approvedAt: at('2026-09-02T00:00:00Z'), user: { name: '먼저 승인' } },
      { id: 'p1', status: 'PENDING', requestedAt: at('2026-11-04T10:00:00Z'), approvedAt: null, user: { name: '먼저' } },
      { id: 'a2', status: 'APPROVED', requestedAt: at('2026-09-01T00:00:00Z'), approvedAt: at('2026-10-02T00:00:00Z'), user: { name: '나중 승인' } },
    ];
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { storeStaff: { findMany } } as unknown as PrismaClient;

    const snapshot = await loadStaffSnapshot({ storeId: 's1', staffInviteCode: 'code' }, db);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: 's1', status: { in: ['PENDING', 'APPROVED'] } } }),
    );
    expect(snapshot.inviteUrl).toBe('https://www.gcsweb.kr/sales-management/v2/staff/join/code');
    expect(snapshot.pending.map((m) => m.id)).toEqual(['p2', 'p1']);
    expect(snapshot.registered.map((m) => m.id)).toEqual(['a2', 'a1']);
  });
});

describe('findStoreAccess', () => {
  const store = { storeId: 's1', name: '상점', storeSlug: 'shop', createdAt: at('2026-09-01T00:00:00Z') };

  function storeDb(result: (typeof store & { userId?: string | null }) | null) {
    const findUnique = vi.fn().mockResolvedValue(result);
    return { db: { store: { findUnique } } as unknown as PrismaClient, findUnique };
  }

  it('상점 식별자가 없는 주소는 소유 상점으로 연결한다', async () => {
    const { db, findUnique } = storeDb(store);
    expect(await findStoreAccess('u1', undefined, db)).toEqual({ role: 'OWNER', store });
    expect(findUnique).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ where: { userId: 'u1' } }));
  });

  it('상점 식별자가 없고 소유 상점도 없으면 승인된 직원 상점을 선택하지 않는다', async () => {
    const { db, findUnique } = storeDb(null);
    expect(await findStoreAccess('u1', null, db)).toBeNull();
    expect(findUnique).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ where: { userId: 'u1' } }));
  });

  it.each([['u1', 'OWNER'], ['u2', 'STAFF']])('지정한 상점의 소유자 %s를 확인해 %s 역할을 반환한다', async (ownerId, role) => {
    const { db, findUnique } = storeDb({ ...store, userId: ownerId });
    expect(await findStoreAccess('u1', 'shop', db)).toEqual({ role, store });
    expect(findUnique).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: { storeSlug: 'shop', OR: [{ userId: 'u1' }, { staff: { some: { userId: 'u1', status: 'APPROVED' } } }] },
    }));
  });

  it.each(['other-shop', ''])('지정한 상점 %j에 권한이 없으면 소유 상점으로 변경하지 않는다', async (slug) => {
    const { db, findUnique } = storeDb(null);
    expect(await findStoreAccess('u1', slug, db)).toBeNull();
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ storeSlug: slug }) }));
  });
});
