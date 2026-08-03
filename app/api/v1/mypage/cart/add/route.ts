import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { getSaleStatusByDate } from '@/lib/sale-date';
import { isMatchedVariantSoldOut } from '@/lib/variant-signature';
import { apiError } from '@/lib/api-response';

function toDbJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function toTypeGroup(type: number): 0 | 1 {
  return type === 0 ? 0 : 1;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, 'UNAUTHORIZED', '로그인이 필요한 서비스입니다.');
    }

    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return apiError(401, 'UNAUTHORIZED', '사용자를 찾을 수 없습니다.');
    }

    const body = await request.json();
    const { productId, quantity, optionData, mergeMode } = body as {
      productId?: string;
      quantity?: number;
      optionData?: any;
      mergeMode?: 'ADD' | 'SET';
    };

    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      return apiError(400, 'INVALID_INPUT', 'productId가 필요합니다.');
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return apiError(400, 'INVALID_INPUT', 'quantity는 1 이상의 정수여야 합니다.');
    }

    // 상품 존재 확인
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        type: true,
        price: true,
        status: true,
        isPublic: true,
        isAdminApproved: true,
        salesStartDate: true,
        salesEndDate: true,
        variants: {
          select: {
            optionSignature: true,
            isSoldOut: true,
          },
        },
      },
    });
    if (!product) {
      return apiError(404, 'PRODUCT_NOT_FOUND', '상품을 찾을 수 없습니다.');
    }

    const saleStatus = getSaleStatusByDate(product.salesStartDate, product.salesEndDate);
    if (!product.isPublic || !product.isAdminApproved || saleStatus !== 'active') {
      return apiError(400, 'PRODUCT_NOT_AVAILABLE', '현재 판매 중인 상품이 아닙니다.');
    }

    if (product.status === 2) {
      return apiError(400, 'PRODUCT_SOLD_OUT', '품절된 상품입니다.');
    }
    if (isMatchedVariantSoldOut(product.variants, optionData)) {
      return apiError(400, 'PRODUCT_SOLD_OUT', '품절된 상품입니다.');
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

    const existingTypeGroups = new Set(existingCartItems.map((item) => toTypeGroup(item.product.type)));
    const targetTypeGroup = toTypeGroup(product.type);
    if (existingTypeGroups.size > 0 && !existingTypeGroups.has(targetTypeGroup)) {
      return apiError(400, 'MIXED_PRODUCT_TYPE_NOT_ALLOWED', '상품 유형이 다른 상품은 동시에 장바구니에 담을 수 없습니다.');
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
      // mergeMode=SET (바로주문)면 선택 수량으로 설정, 아니면 기존처럼 누적
      const normalizedMode = mergeMode === 'SET' ? 'SET' : 'ADD';
      const newQty = normalizedMode === 'SET' ? (quantity ?? 1) : existingItem.quantity + (quantity ?? 1);
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
    return apiError(500, 'SERVER_ERROR', '장바구니에 추가하는 중 문제가 발생했습니다.');
  }
}
