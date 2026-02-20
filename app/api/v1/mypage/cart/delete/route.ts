import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요한 서비스입니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const cartItemIds = Array.isArray(body?.cartItemIds) ? body.cartItemIds : null;

    if (!cartItemIds || !cartItemIds.length) {
      return NextResponse.json({ status: 'error', code: 'EMPTY_LIST', message: '삭제할 상품을 선택해 주세요.' }, { status: 400 });
    }

    const repo: any = prisma as any;

    // get current user id
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' }, { status: 401 });
    }

    // If cartItem model exists, operate on it directly
    if (repo.cartItem && typeof repo.cartItem.findMany === 'function') {
      const found = await repo.cartItem.findMany({ where: { id: { in: cartItemIds } }, select: { id: true, userId: true } });
      if (found.length !== cartItemIds.length) {
        return NextResponse.json({ status: 'error', code: 'CART_ITEM_NOT_FOUND', message: '존재하지 않는 장바구니 아이템이 있습니다.' }, { status: 404 });
      }

      const notOwner = found.find((f: any) => f.userId !== user.id);
      if (notOwner) {
        return NextResponse.json({ status: 'error', code: 'FORBIDDEN', message: '해당 장바구니 항목에 대한 권한이 없습니다.' }, { status: 403 });
      }

      await repo.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });

      return NextResponse.json({ status: 'success', message: '선택한 상품이 장바구니에서 삭제되었습니다.' });
    }

    // Fallback: find carts that contain these items
    if (repo.cart && typeof repo.cart.findMany === 'function') {
      const carts = await repo.cart.findMany({ where: { items: { some: { id: { in: cartItemIds } } } }, include: { items: { where: { id: { in: cartItemIds } }, select: { id: true } } } });
      const foundIds = carts.flatMap((c: any) => c.items.map((i: any) => i.id));
      if (foundIds.length !== cartItemIds.length) {
        return NextResponse.json({ status: 'error', code: 'CART_ITEM_NOT_FOUND', message: '존재하지 않는 장바구니 아이템이 있습니다.' }, { status: 404 });
      }

      // Ensure ownership: every cart containing items must belong to user
      const notOwned = carts.find((c: any) => c.userId !== user.id);
      if (notOwned) {
        return NextResponse.json({ status: 'error', code: 'FORBIDDEN', message: '해당 장바구니 항목에 대한 권한이 없습니다.' }, { status: 403 });
      }

      // Attempt to delete via cartItem model if present
      if (repo.cartItem && typeof repo.cartItem.deleteMany === 'function') {
        await repo.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });
        return NextResponse.json({ status: 'success', message: '선택한 상품이 장바구니에서 삭제되었습니다.' });
      }

      // Unable to safely delete nested items without item model
      return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니 항목을 삭제할 수 없습니다. 서버 설정을 확인하세요.' }, { status: 500 });
    }

    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니 모델을 찾을 수 없습니다.' }, { status: 500 });
  } catch (error: any) {
    console.error('Cart delete error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' }, { status: 500 });
  }
}
