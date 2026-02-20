import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

type OptionInput = { optionName: string; optionValue: string };

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요한 서비스입니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { cartItemId, quantity, options } = body as { cartItemId?: string; quantity?: number; options?: OptionInput[] };

    if (!cartItemId || typeof cartItemId !== 'string') {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'cartItemId가 필요합니다.' }, { status: 400 });
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_QUANTITY', message: '수량은 1개 이상이어야 합니다.' }, { status: 400 });
    }

    if (options !== undefined && !Array.isArray(options)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_OPTION', message: 'options 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const repo: any = prisma as any;

    // Find cart item in common patterns
    let cartItem: any = null;
    if (repo.cartItem && typeof repo.cartItem.findUnique === 'function') {
      cartItem = await repo.cartItem.findUnique({ where: { id: cartItemId }, include: { product: true } });
    }

    if (!cartItem && repo.cart) {
      // some schemas store carts and items nested
      const maybe = await repo.cart.findFirst({ where: { items: { some: { id: cartItemId } } }, include: { items: { where: { id: cartItemId }, include: { product: true } } } });
      if (maybe && maybe.items && maybe.items.length) cartItem = maybe.items[0];
    }

    if (!cartItem) {
      return NextResponse.json({ status: 'error', code: 'CART_ITEM_NOT_FOUND', message: '해당 장바구니 아이템을 찾을 수 없습니다.' }, { status: 404 });
    }

    // If quantity provided, check simple stock availability if product has stock/status
    if (quantity !== undefined && cartItem.product) {
      const product = cartItem.product;
      // check simple numeric stock
      if (typeof product.stock === 'number' && quantity > product.stock) {
        return NextResponse.json({ status: 'error', code: 'INVALID_QUANTITY', message: '재고 한도를 초과했습니다.' }, { status: 400 });
      }
      // if product.status indicates sold out (2) and quantity >0 -> invalid
      if (typeof product.status === 'number' && product.status === 2) {
        return NextResponse.json({ status: 'error', code: 'INVALID_QUANTITY', message: '상품이 품절되었습니다.' }, { status: 400 });
      }
    }

    // Basic option validation: try to ensure provided option values exist for the product when possible
    if (options !== undefined && cartItem.product) {
      try {
        const productId = cartItem.product.id;
        for (const opt of options) {
          if (!opt || typeof opt.optionName !== 'string' || typeof opt.optionValue !== 'string') {
            return NextResponse.json({ status: 'error', code: 'INVALID_OPTION', message: '옵션 형식이 올바르지 않습니다.' }, { status: 400 });
          }
        }
        // Try to validate against ProductOption and ProductOptionValue if available
        if (repo.productOption && repo.productOptionValue) {
          for (const opt of options) {
            const optionRow = await repo.productOption.findFirst({ where: { productId, optionName: opt.optionName } });
            if (!optionRow) {
              return NextResponse.json({ status: 'error', code: 'INVALID_OPTION', message: `존재하지 않는 옵션명입니다: ${opt.optionName}` }, { status: 400 });
            }
            const valueRow = await repo.productOptionValue.findFirst({ where: { optionId: optionRow.id, value: opt.optionValue } });
            if (!valueRow) {
              return NextResponse.json({ status: 'error', code: 'INVALID_OPTION', message: `유효하지 않은 옵션값입니다: ${opt.optionValue}` }, { status: 400 });
            }
          }
        }
      } catch (e) {
        // ignore validation errors and proceed conservatively
        console.warn('Option validation skipped or failed:', e);
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (options !== undefined) updateData.optionData = options;

    try {
      if (repo.cartItem && typeof repo.cartItem.update === 'function') {
        await repo.cartItem.update({ where: { id: cartItemId }, data: updateData });
      } else if (repo.cart && typeof repo.cart.update === 'function') {
        // Update nested item inside cart: find cart id first
        const owningCart = await repo.cart.findFirst({ where: { items: { some: { id: cartItemId } } } });
        if (!owningCart) {
          return NextResponse.json({ status: 'error', code: 'CART_ITEM_NOT_FOUND', message: '해당 장바구니 아이템을 찾을 수 없습니다.' }, { status: 404 });
        }
        // Some schemas don't support nested updates; perform raw update on item model if exists
        if (repo.cartItem) {
          await repo.cartItem.update({ where: { id: cartItemId }, data: updateData });
        } else {
          // fallback: no way to update nested item safely
          return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니 항목을 업데이트할 수 없습니다.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니 모델이 존재하지 않습니다.' }, { status: 500 });
      }
    } catch (e) {
      console.error('Cart update DB error:', e);
      return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니를 업데이트하는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', message: '장바구니 상품이 수정되었습니다.' });
  } catch (error: any) {
    console.error('Cart update error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' }, { status: 500 });
  }
}
