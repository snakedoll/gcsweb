import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { apiError as jsonError } from '@/lib/api-response';

function getProductStatus(
  salesStartDate: Date,
  salesEndDate: Date,
  now: Date
): 'ACTIVE' | 'COMPLETED' | 'SCHEDULED' {
  if (now > salesEndDate) return 'COMPLETED';
  if (now >= salesStartDate && now <= salesEndDate) return 'ACTIVE';
  return 'SCHEDULED';
}

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const variantId = typeof body?.variantId === 'string' ? body.variantId.trim() : '';
    const isSoldOut = body?.isSoldOut;

    if (!variantId || typeof isSoldOut !== 'boolean') {
      return jsonError(400, 'INVALID_INPUT', '요청 파라미터가 올바르지 않습니다.');
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        product: {
          select: {
            salesStartDate: true,
            salesEndDate: true,
          },
        },
      },
    });

    if (!variant) {
      return jsonError(404, 'NOT_FOUND', '대상 품목이 존재하지 않습니다.');
    }

    const now = new Date();
    const productStatus = getProductStatus(
      variant.product.salesStartDate,
      variant.product.salesEndDate,
      now
    );

    if (productStatus === 'COMPLETED') {
      return jsonError(409, 'INVALID_STATE', '진행완료 상품은 품절여부를 변경할 수 없습니다.');
    }

    if (productStatus !== 'ACTIVE') {
      return jsonError(409, 'INVALID_STATE', '진행중 상품만 품절여부를 변경할 수 있습니다.');
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { isSoldOut },
      select: {
        id: true,
        isSoldOut: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        variantId: updated.id,
        isSoldOut: updated.isSoldOut,
        productStatus: 'ACTIVE',
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Admin Onsite Inventory Soldout PATCH Error]', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
