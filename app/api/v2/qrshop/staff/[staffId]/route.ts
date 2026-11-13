import { z } from 'zod';
import { apiErrors, apiSuccess } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { requireStoreUser, storeErrors } from '@/lib/qrshop/store-api';
import { findOwnedStore, loadStaffSnapshot, staffErrors } from '@/lib/qrshop/staff';

type Params = { params: { staffId: string } };

const decisionSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });

/**
 * PATCH /api/v2/qrshop/staff/{staffId}
 * 승인 대기 직원을 승인하거나 거절한다. 상점 소유자만. 응답은 갱신된 직원 관리 패널 데이터.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireStoreUser();
    if (!auth.ok) return auth.response;

    const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiErrors.invalidInput('유효하지 않은 요청');

    const store = await findOwnedStore(auth.userId);
    if (!store) return storeErrors.notFound();

    const approved = parsed.data.status === 'APPROVED';
    // 대기 상태일 때만 바꾼다. 같은 요청이 동시에 와도 한 번만 처리된다.
    const { count } = await prisma.storeStaff.updateMany({
      where: { id: params.staffId, storeId: store.storeId, status: 'PENDING' },
      data: { status: parsed.data.status, approvedAt: approved ? new Date() : null },
    });

    if (count === 0) {
      const exists = await prisma.storeStaff.findFirst({
        where: { id: params.staffId, storeId: store.storeId },
        select: { id: true },
      });
      return exists ? staffErrors.notPending() : staffErrors.notFound();
    }

    return apiSuccess(await loadStaffSnapshot(store));
  } catch (error) {
    console.error('[PATCH /api/v2/qrshop/staff/[staffId]]', error);
    return apiErrors.serverError();
  }
}

/**
 * DELETE /api/v2/qrshop/staff/{staffId}
 * 등록된 직원을 삭제한다. 삭제된 직원은 즉시 접근이 막히고, 초대 링크로 다시 요청할 수 있다. 상점 소유자만.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireStoreUser();
    if (!auth.ok) return auth.response;

    const store = await findOwnedStore(auth.userId);
    if (!store) return storeErrors.notFound();

    const { count } = await prisma.storeStaff.deleteMany({
      where: { id: params.staffId, storeId: store.storeId, status: 'APPROVED' },
    });

    if (count === 0) {
      const exists = await prisma.storeStaff.findFirst({
        where: { id: params.staffId, storeId: store.storeId },
        select: { id: true },
      });
      return exists ? staffErrors.notRegistered() : staffErrors.notFound();
    }

    return apiSuccess(await loadStaffSnapshot(store));
  } catch (error) {
    console.error('[DELETE /api/v2/qrshop/staff/[staffId]]', error);
    return apiErrors.serverError();
  }
}
