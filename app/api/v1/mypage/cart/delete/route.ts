import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized('로그인이 필요한 서비스입니다.');
    }

    const body = await request.json().catch(() => null);
    const cartItemIds = Array.isArray(body?.cartItemIds) ? body.cartItemIds : null;

    if (!cartItemIds || !cartItemIds.length) {
      return apiErrors.invalidInput('삭제할 상품을 선택해 주세요.');
    }

    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return apiErrors.unauthorized('사용자를 찾을 수 없습니다.');
    }

    // CartItem 조회 및 소유권 확인
    const found = await prisma.cartItem.findMany({
      where: { id: { in: cartItemIds } },
      select: { id: true, cart: { select: { userId: true } } },
    });

    if (found.length !== cartItemIds.length) {
      return apiErrors.notFound('존재하지 않는 장바구니 아이템이 있습니다.');
    }

    const notOwner = found.find((f) => f.cart.userId !== user.id);
    if (notOwner) {
      return apiErrors.forbidden('해당 장바구니 항목에 대한 권한이 없습니다.');
    }

    // 삭제
    await prisma.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });

    return NextResponse.json({ status: 'success', message: '선택한 상품이 장바구니에서 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Cart delete error:', error);
    return apiErrors.serverError('서버 내부 오류');
  }
}
