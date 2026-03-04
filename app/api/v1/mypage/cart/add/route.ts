import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

function toDbJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

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

    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'productId가 필요합니다.' }, { status: 400 });
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'quantity는 1 이상의 정수여야 합니다.' }, { status: 400 });
    }

    // 상품 존재 확인
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, type: true, price: true, status: true } });
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

    const existingCartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      select: { product: { select: { type: true } } },
    });

    const existingTypes = new Set(existingCartItems.map((item) => item.product.type));
    if (existingTypes.size > 0 && !existingTypes.has(product.type)) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'MIXED_PRODUCT_TYPE_NOT_ALLOWED',
          message: '상품 유형이 다른 상품은 동시에 장바구니에 담을 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // 추가 금액 계산
    let additionalPrice = 0;
    if (Array.isArray(optionData)) {
      optionData.forEach((opt: any) => {
        if (opt && typeof opt.additionalPrice === 'number') {
          additionalPrice += opt.additionalPrice;
        }
      });
    }
    const itemPrice = product.price + additionalPrice;

    // 같은 상품+옵션이 이미 장바구니에 있는지 확인
    const cartItems = await prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    const isMatch = (itemOptionData: any, newOptionData: any) => {
      return JSON.stringify(itemOptionData || null) === JSON.stringify(newOptionData || null);
    };

    const existingItem = cartItems.find((item) => isMatch(item.optionData, optionData));

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
        price: itemPrice,
        optionData: toDbJson(optionData),
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
