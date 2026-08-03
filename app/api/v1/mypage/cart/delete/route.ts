import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, 'UNAUTHORIZED', '로그인이 필요한 서비스입니다.');
    }

    const body = await request.json().catch(() => null);
    const cartItemIds = Array.isArray(body?.cartItemIds) ? body.cartItemIds : null;

    if (!cartItemIds || !cartItemIds.length) {
      return apiError(400, 'EMPTY_LIST', '삭제할 상품을 선택해 주세요.');
    }

    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return apiError(401, 'UNAUTHORIZED', '사용자를 찾을 수 없습니다.');
    }

    // CartItem 조회 및 소유권 확인
    const found = await prisma.cartItem.findMany({
      where: { id: { in: cartItemIds } },
      select: { id: true, cart: { select: { userId: true } } },
    });

    if (found.length !== cartItemIds.length) {
      return apiError(404, 'CART_ITEM_NOT_FOUND', '존재하지 않는 장바구니 아이템이 있습니다.');
    }

    const notOwner = found.find((f) => f.cart.userId !== user.id);
    if (notOwner) {
      return apiError(403, 'FORBIDDEN', '해당 장바구니 항목에 대한 권한이 없습니다.');
    }

    // 삭제
    await prisma.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });

    return NextResponse.json({ status: 'success', message: '선택한 상품이 장바구니에서 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Cart delete error:', error);
    return apiError(500, 'SERVER_ERROR', '서버 내부 오류');
  }
}
