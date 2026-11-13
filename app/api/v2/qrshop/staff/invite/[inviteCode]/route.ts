import { apiErrors, apiSuccess } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { isUniqueViolation, requireStoreUser } from '@/lib/qrshop/store-api';
import { staffErrors, toInviteStatus } from '@/lib/qrshop/staff';

type Params = { params: { inviteCode: string } };

function findInviteStore(inviteCode: string) {
  return prisma.store.findUnique({
    where: { staffInviteCode: inviteCode },
    select: { storeId: true, name: true, imageUrl: true, userId: true },
  });
}

function findMembership(storeId: string, userId: string) {
  return prisma.storeStaff.findUnique({
    where: { storeId_userId: { storeId, userId } },
    select: { status: true },
  });
}

/**
 * GET /api/v2/qrshop/staff/invite/{inviteCode}
 * 초대 링크로 들어온 사용자에게 상점명과 내 상태를 알려 준다.
 * 상태: none(요청 전) / pending(승인 대기) / approved(현장 포스로 이동) / rejected(다시 요청 가능) / owner(본인 상점).
 * 승인 대기 화면은 이 API를 다시 불러 승인되면 자동으로 이동한다.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireStoreUser();
    if (!auth.ok) return auth.response;

    const store = await findInviteStore(params.inviteCode);
    if (!store) return staffErrors.invalidInvite();

    const isOwner = store.userId === auth.userId;
    const membership = isOwner ? null : await findMembership(store.storeId, auth.userId);

    return apiSuccess({
      store: { name: store.name, imageUrl: store.imageUrl },
      status: toInviteStatus({ isOwner, status: membership?.status ?? null }),
    });
  } catch (error) {
    console.error('[GET /api/v2/qrshop/staff/invite/[inviteCode]]', error);
    return apiErrors.serverError();
  }
}

/**
 * POST /api/v2/qrshop/staff/invite/{inviteCode}
 * 직원 권한을 요청한다. 이미 대기 중이거나 승인됐으면 상태만 돌려준다(중복 요청을 만들지 않는다).
 * 거절된 사용자는 다시 대기 상태가 된다.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const auth = await requireStoreUser();
    if (!auth.ok) return auth.response;

    const store = await findInviteStore(params.inviteCode);
    if (!store) return staffErrors.invalidInvite();
    if (store.userId === auth.userId) return staffErrors.isOwner();

    const membership = await findMembership(store.storeId, auth.userId);
    if (membership?.status === 'PENDING' || membership?.status === 'APPROVED') {
      return apiSuccess({ status: toInviteStatus({ isOwner: false, status: membership.status }) });
    }

    if (membership?.status === 'REJECTED') {
      await prisma.storeStaff.updateMany({
        where: { storeId: store.storeId, userId: auth.userId, status: 'REJECTED' },
        data: { status: 'PENDING', requestedAt: new Date(), approvedAt: null },
      });
    } else {
      try {
        await prisma.storeStaff.create({ data: { storeId: store.storeId, userId: auth.userId } });
      } catch (error) {
        // 같은 사용자가 동시에 두 번 요청한 경우: 먼저 만들어진 요청을 그대로 쓴다.
        if (!isUniqueViolation(error, 'storeId')) throw error;
      }
    }

    const current = await findMembership(store.storeId, auth.userId);
    return apiSuccess({ status: toInviteStatus({ isOwner: false, status: current?.status ?? null }) });
  } catch (error) {
    console.error('[POST /api/v2/qrshop/staff/invite/[inviteCode]]', error);
    return apiErrors.serverError();
  }
}
