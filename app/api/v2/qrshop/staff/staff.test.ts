// @vitest-environment node
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { requireStoreUser } from '@/lib/qrshop/store-api';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { loadStaffSnapshot } from '@/lib/qrshop/staff';
import { GET as getStaff } from './route';
import { DELETE as removeStaff, PATCH as decideStaff } from './[staffId]/route';
import { GET as getMe } from './me/route';
import { GET as getInvite, POST as requestInvite } from './invite/[inviteCode]/route';

vi.mock('@/lib/qrshop/store-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/qrshop/store-api')>();
  return { ...actual, requireStoreUser: vi.fn() };
});
vi.mock('@/lib/qrshop/store-access', () => ({ getStoreAccess: vi.fn() }));
vi.mock('@/lib/qrshop/staff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/qrshop/staff')>();
  return { ...actual, loadStaffSnapshot: vi.fn() };
});
vi.mock('@/lib/db', () => ({
  prisma: {
    store: { findUnique: vi.fn() },
    storeStaff: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

type Fn = ReturnType<typeof vi.fn>;
const auth = requireStoreUser as unknown as Fn;
const access = getStoreAccess as unknown as Fn;
const snapshot = loadStaffSnapshot as unknown as Fn;
const store = prisma.store as unknown as Record<'findUnique', Fn>;
const staff = prisma.storeStaff as unknown as Record<'findUnique' | 'findFirst' | 'create' | 'updateMany' | 'deleteMany', Fn>;

const OWNED = { storeId: 's1', staffInviteCode: 'code' };
const SNAPSHOT = { inviteUrl: 'https://x/join/code', pending: [], registered: [] };
const INVITE_STORE = { storeId: 's1', name: '잇장샵', imageUrl: null, userId: 'owner' };

const json = (body: unknown) => new Request('http://localhost/api', { method: 'PATCH', body: JSON.stringify(body) });
const decide = (body: unknown) => decideStaff(json(body), { params: { staffId: 'm1' } });
const remove = () => removeStaff(new Request('http://localhost/api', { method: 'DELETE' }), { params: { staffId: 'm1' } });
const invite = { params: { inviteCode: 'code' } };

beforeEach(() => {
  vi.resetAllMocks();
  auth.mockResolvedValue({ ok: true, userId: 'u1' });
  store.findUnique.mockResolvedValue(OWNED);
  snapshot.mockResolvedValue(SNAPSHOT);
});

describe('GET /api/v2/qrshop/staff', () => {
  it('로그인하지 않았으면 401', async () => {
    auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await getStaff()).status).toBe(401);
  });

  it('소유한 상점이 없으면 404 (승인된 직원도 직원 관리는 못 한다)', async () => {
    store.findUnique.mockResolvedValue(null);
    expect((await getStaff()).status).toBe(404);
  });

  it('직원 관리 패널 데이터를 돌려준다', async () => {
    const res = await getStaff();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual(SNAPSHOT);
    expect(store.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
  });
});

describe('PATCH /api/v2/qrshop/staff/{staffId}', () => {
  it.each([{}, { status: 'PENDING' }, null])('잘못된 요청은 400: %j', async (body) => {
    expect((await decide(body)).status).toBe(400);
  });

  it('승인: 대기 중인 내 상점 직원만 APPROVED + 승인 시각', async () => {
    staff.updateMany.mockResolvedValue({ count: 1 });
    const res = await decide({ status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(staff.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', storeId: 's1', status: 'PENDING' },
      data: { status: 'APPROVED', approvedAt: expect.any(Date) },
    });
    expect((await res.json()).data).toEqual(SNAPSHOT);
  });

  it('거절: REJECTED, 승인 시각 없음', async () => {
    staff.updateMany.mockResolvedValue({ count: 1 });
    await decide({ status: 'REJECTED' });
    expect(staff.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REJECTED', approvedAt: null } }),
    );
  });

  it('대기 중이 아니면 409 STAFF_NOT_PENDING', async () => {
    staff.updateMany.mockResolvedValue({ count: 0 });
    staff.findFirst.mockResolvedValue({ id: 'm1' });
    const res = await decide({ status: 'APPROVED' });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('STAFF_NOT_PENDING');
  });

  it('내 상점 직원이 아니면 404', async () => {
    staff.updateMany.mockResolvedValue({ count: 0 });
    staff.findFirst.mockResolvedValue(null);
    expect((await decide({ status: 'APPROVED' })).status).toBe(404);
  });
});

describe('DELETE /api/v2/qrshop/staff/{staffId}', () => {
  it('등록된(승인된) 직원만 삭제한다', async () => {
    staff.deleteMany.mockResolvedValue({ count: 1 });
    const res = await remove();
    expect(res.status).toBe(200);
    expect(staff.deleteMany).toHaveBeenCalledWith({ where: { id: 'm1', storeId: 's1', status: 'APPROVED' } });
  });

  it('대기 중인 직원이면 409 STAFF_NOT_REGISTERED (거절을 써야 한다)', async () => {
    staff.deleteMany.mockResolvedValue({ count: 0 });
    staff.findFirst.mockResolvedValue({ id: 'm1' });
    const res = await remove();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('STAFF_NOT_REGISTERED');
  });

  it('없으면 404', async () => {
    staff.deleteMany.mockResolvedValue({ count: 0 });
    staff.findFirst.mockResolvedValue(null);
    expect((await remove()).status).toBe(404);
  });
});

describe('GET /api/v2/qrshop/staff/me', () => {
  it('로그인하지 않았으면 401', async () => {
    access.mockResolvedValue({ ok: false, reason: 'UNAUTHORIZED' });
    expect((await getMe()).status).toBe(401);
  });

  it('접근할 상점이 없으면 data=null', async () => {
    access.mockResolvedValue({ ok: true, userId: 'u1', access: null });
    expect((await (await getMe()).json()).data).toBeNull();
  });

  it('역할과 상점을 돌려준다', async () => {
    access.mockResolvedValue({
      ok: true,
      userId: 'u1',
      access: { role: 'STAFF', store: { storeId: 's1', name: '잇장샵', storeSlug: 'itjang', createdAt: new Date() } },
    });
    expect((await (await getMe()).json()).data).toEqual({
      role: 'STAFF',
      store: { storeId: 's1', name: '잇장샵', storeSlug: 'itjang' },
    });
  });
});

describe('GET /api/v2/qrshop/staff/invite/{inviteCode}', () => {
  it('없는 초대 코드는 404', async () => {
    store.findUnique.mockResolvedValue(null);
    expect((await getInvite(new Request('http://localhost'), invite)).status).toBe(404);
  });

  it('본인 상점이면 owner', async () => {
    store.findUnique.mockResolvedValue({ ...INVITE_STORE, userId: 'u1' });
    const body = await (await getInvite(new Request('http://localhost'), invite)).json();
    expect(body.data).toEqual({ store: { name: '잇장샵', imageUrl: null }, status: 'owner' });
    expect(staff.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'none'],
    [{ status: 'PENDING' }, 'pending'],
    [{ status: 'APPROVED' }, 'approved'],
    [{ status: 'REJECTED' }, 'rejected'],
  ])('직원 상태 %j → %s', async (membership, expected) => {
    store.findUnique.mockResolvedValue(INVITE_STORE);
    staff.findUnique.mockResolvedValue(membership);
    const body = await (await getInvite(new Request('http://localhost'), invite)).json();
    expect(body.data.status).toBe(expected);
  });
});

describe('POST /api/v2/qrshop/staff/invite/{inviteCode}', () => {
  const post = () => requestInvite(new Request('http://localhost', { method: 'POST' }), invite);

  beforeEach(() => store.findUnique.mockResolvedValue(INVITE_STORE));

  it('없는 초대 코드는 404', async () => {
    store.findUnique.mockResolvedValue(null);
    expect((await post()).status).toBe(404);
  });

  it('본인 상점에는 요청할 수 없다 (409 STAFF_IS_OWNER)', async () => {
    store.findUnique.mockResolvedValue({ ...INVITE_STORE, userId: 'u1' });
    const res = await post();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('STAFF_IS_OWNER');
  });

  it('처음 요청하면 대기 상태로 만든다', async () => {
    staff.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'PENDING' });
    const body = await (await post()).json();
    expect(staff.create).toHaveBeenCalledWith({ data: { storeId: 's1', userId: 'u1' } });
    expect(body.data).toEqual({ status: 'pending' });
  });

  it.each([
    ['PENDING', 'pending'],
    ['APPROVED', 'approved'],
  ])('이미 %s 이면 새로 만들지 않고 상태만 돌려준다', async (status, expected) => {
    staff.findUnique.mockResolvedValue({ status });
    const body = await (await post()).json();
    expect(staff.create).not.toHaveBeenCalled();
    expect(staff.updateMany).not.toHaveBeenCalled();
    expect(body.data).toEqual({ status: expected });
  });

  it('거절된 직원은 다시 대기 상태가 된다', async () => {
    staff.findUnique.mockResolvedValueOnce({ status: 'REJECTED' }).mockResolvedValueOnce({ status: 'PENDING' });
    const body = await (await post()).json();
    expect(staff.updateMany).toHaveBeenCalledWith({
      where: { storeId: 's1', userId: 'u1', status: 'REJECTED' },
      data: { status: 'PENDING', requestedAt: expect.any(Date), approvedAt: null },
    });
    expect(body.data).toEqual({ status: 'pending' });
  });

  it('동시에 두 번 요청해 unique 충돌이 나도 대기 상태로 응답한다', async () => {
    staff.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'PENDING' });
    staff.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x', meta: { target: ['storeId', 'userId'] } }),
    );
    const res = await post();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ status: 'pending' });
  });
});
