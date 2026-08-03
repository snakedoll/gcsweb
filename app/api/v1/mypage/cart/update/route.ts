import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

type OptionInput = { optionName: string; optionValue: string };

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, 'UNAUTHORIZED', '로그인이 필요한 서비스입니다.');
    }

    const body = await request.json().catch(() => ({}));
    const { cartItemId, quantity, options } = body as { cartItemId?: string; quantity?: number; options?: OptionInput[] };

    if (!cartItemId || typeof cartItemId !== 'string') {
      return apiError(400, 'INVALID_INPUT', 'cartItemId가 필요합니다.');
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return apiError(400, 'INVALID_QUANTITY', '수량은 1개 이상이어야 합니다.');
    }

    if (options !== undefined && !Array.isArray(options)) {
      return apiError(400, 'INVALID_OPTION', 'options 형식이 올바르지 않습니다.');
    }

    // CartItem 조회
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true, cart: { select: { userId: true } } },
    });

    if (!cartItem) {
      return apiError(404, 'CART_ITEM_NOT_FOUND', '해당 장바구니 아이템을 찾을 수 없습니다.');
    }

    // 본인 장바구니인지 확인
    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user || cartItem.cart.userId !== user.id) {
      return apiError(403, 'UNAUTHORIZED', '권한이 없습니다.');
    }

    // 수량 검증
    if (quantity !== undefined && cartItem.product) {
      if (typeof cartItem.product.status === 'number' && cartItem.product.status === 2) {
        return apiError(400, 'INVALID_QUANTITY', '상품이 품절되었습니다.');
      }
    }

    // 옵션 검증
    if (options !== undefined) {
      for (const opt of options) {
        if (!opt || typeof opt.optionName !== 'string' || typeof opt.optionValue !== 'string') {
          return apiError(400, 'INVALID_OPTION', '옵션 형식이 올바르지 않습니다.');
        }
      }
    }

    // 업데이트
    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (options !== undefined) updateData.optionData = options;

    await prisma.cartItem.update({ where: { id: cartItemId }, data: updateData });

    return NextResponse.json({ status: 'success', message: '장바구니 상품이 수정되었습니다.' });
  } catch (error: any) {
    console.error('Cart update error:', error);
    return apiError(500, 'SERVER_ERROR', '서버 내부 오류');
  }
}
