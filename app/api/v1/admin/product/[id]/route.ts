import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError, requireAdmin } from '../_utils';

/**
 * PATCH /api/v1/admin/product/[id]
 * 상품 게시 여부(isPublic) 및 메인 노출(isHome) 상태 변경
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const productId = params?.id;
    if (!productId) {
      return jsonError(400, 'INVALID_INPUT', '상품 ID가 필요합니다.');
    }

    const body = await request.json().catch(() => ({}));
    const { isHome, isPublic } = body;

    const updateData: any = {};
    if (typeof isHome === 'boolean') updateData.isHome = isHome;
    if (typeof isPublic === 'boolean') updateData.isPublic = isPublic;

    if (Object.keys(updateData).length === 0) {
      return jsonError(400, 'INVALID_INPUT', '변경할 필드(isHome, isPublic)가 필요합니다.');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        id: updated.id,
        isHome: updated.isHome,
        isPublic: updated.isPublic,
      },
    });
  } catch (error) {
    console.error('Admin product status patch error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 로직 오류가 발생했습니다.');
  }
}
