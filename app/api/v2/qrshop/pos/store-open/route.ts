import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiErrors, apiSuccess } from '@/lib/api-response';
import { requirePosAccess } from '@/lib/qrshop/pos-access';

export const dynamic = 'force-dynamic';

const StoreOpenSchema = z.object({ isOpen: z.boolean() });

/**
 * GET /api/v2/qrshop/pos/store-open
 * QR shop 토글 상태. 소유자와 승인된 직원.
 */
export async function GET() {
  try {
    const auth = await requirePosAccess();
    if (!auth.ok) return auth.response;

    const store = await prisma.store.findUniqueOrThrow({
      where: { storeId: auth.access.store.storeId },
      select: { isOpen: true },
    });
    return apiSuccess({ isOpen: store.isOpen });
  } catch (error) {
    console.error('[GET /api/v2/qrshop/pos/store-open]', error);
    return apiErrors.serverError();
  }
}

/**
 * PATCH /api/v2/qrshop/pos/store-open
 * body { isOpen } QR샵을 열거나 닫는다. 닫히면 방문객 주문 생성이 409 STORE_CLOSED. 소유자만.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requirePosAccess({ ownerOnly: true });
    if (!auth.ok) return auth.response;

    const parsed = StoreOpenSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiErrors.invalidInput('유효하지 않은 요청');

    const store = await prisma.store.update({
      where: { storeId: auth.access.store.storeId },
      data: { isOpen: parsed.data.isOpen },
      select: { isOpen: true },
    });
    return apiSuccess({ isOpen: store.isOpen });
  } catch (error) {
    console.error('[PATCH /api/v2/qrshop/pos/store-open]', error);
    return apiErrors.serverError();
  }
}
