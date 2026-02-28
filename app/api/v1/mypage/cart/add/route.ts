import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요한 서비스입니다.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity, optionData } = body as { productId?: string; quantity?: number; optionData?: any };

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'productId가 필요합니다.' }, { status: 400 });
    }

    // 상품 존재 확인
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, price: true, status: true } });
    if (!product) {
      return NextResponse.json({ status: 'error', code: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (product.status !== 1) {
      return NextResponse.json({ status: 'error', code: 'PRODUCT_NOT_AVAILABLE', message: '현재 판매 중인 상품이 아닙니다.' }, { status: 400 });
    }

    // 유저의 장바구니 조회 또는 생성
    let cart = await prisma.cart.findFirst({ where: { userId: user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: user.id } });
    }

    // 같은 상품+옵션이 이미 장바구니에 있는지 확인
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    if (existingItem) {
      // 이미 있으면 수량 증가
      const newQty = existingItem.quantity + (quantity ?? 1);
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });

      return NextResponse.json({
        status: 'success',
        data: { cartItemId: existingItem.id, quantity: newQty },
        message: '장바구니 수량이 업데이트되었습니다.',
      });
    }

    // 새로 추가
    const cartItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity: quantity ?? 1,
        price: product.price,
        optionData: optionData ?? null,
      },
    });

    return NextResponse.json({
      status: 'success',
      data: { cartItemId: cartItem.id },
      message: '장바구니에 추가되었습니다.',
    });
  } catch (error: any) {
    console.error('Cart add error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니에 추가하는 중 문제가 발생했습니다.' }, { status: 500 });
  }
}
