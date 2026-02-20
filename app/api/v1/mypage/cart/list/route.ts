import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

function mapStatus(product: any) {
  // If product has explicit stock or status, determine sold out
  if (product == null) return 'SOLD_OUT';
  // Prefer explicit stock on product or variant
  if (typeof product.stock === 'number') {
    return product.stock > 0 ? 'AVAILABLE' : 'SOLD_OUT';
  }
  if (typeof product.status === 'number') {
    return product.status === 2 ? 'SOLD_OUT' : 'AVAILABLE';
  }
  return 'AVAILABLE';
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요한 서비스입니다.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' }, { status: 401 });
    }

    const repo: any = prisma as any;
    let cartItems: any[] = [];
    try {
      // Try common cart item models: CartItem or Cart
      if (repo.cartItem && typeof repo.cartItem.findMany === 'function') {
        const rows = await repo.cartItem.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * size,
          take: size + 1,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                status: true,
                type: true,
                team: { select: { teamName: true } },
                images: { select: { thumbnailImgUrl: true }, take: 1 },
              },
            },
          },
        });

        // collect productIds to check likes
        const productIds = rows.map((r: any) => r.product?.id).filter(Boolean);
        let likeSet = new Set<string>();
        try {
          if (repo.like && typeof repo.like.findMany === 'function' && productIds.length) {
            const likes = await repo.like.findMany({ where: { userId: user.id, productId: { in: productIds } }, select: { productId: true } });
            likeSet = new Set(likes.map((l: any) => l.productId));
          }
        } catch (e) {
          // ignore like check errors
        }

        cartItems = rows.map((r: any) => {
          const p = r.product;
          const optionsRaw = r.optionData ?? r.options ?? null;
          let options: any[] = [];
          try {
            if (optionsRaw && typeof optionsRaw === 'string') {
              const parsed = JSON.parse(optionsRaw);
              if (Array.isArray(parsed)) options = parsed;
            } else if (optionsRaw && typeof optionsRaw === 'object') {
              if (Array.isArray(optionsRaw)) options = optionsRaw;
              else if (optionsRaw.optionName) options = [optionsRaw];
            }
          } catch (e) {
            options = [];
          }

          return {
            cartItemId: r.id,
            productId: p?.id ?? null,
            teamName: p?.team?.teamName ?? null,
            productName: p?.name ?? null,
            thumbnailUrl: (p?.images && p.images[0]?.thumbnailImgUrl) ?? null,
            options,
            price: r.price ?? r.unitPrice ?? null,
            quantity: r.quantity ?? 1,
            isLiked: Boolean(p?.id && likeSet.has(p.id)),
            status: mapStatus(p),
          };
        });
      } else if (repo.cart && typeof repo.cart.findMany === 'function') {
        const rows = await repo.cart.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * size, take: size + 1, include: { items: { include: { product: true } } } });
        // Flatten
        cartItems = rows.flatMap((cart: any) => cart.items || []).map((r: any) => ({
          cartItemId: r.id,
          productId: r.product?.id ?? null,
          teamName: r.product?.team?.teamName ?? null,
          productName: r.product?.name ?? null,
          thumbnailUrl: r.product?.thumbnailImgUrl ?? null,
          options: r.optionData ?? [],
          price: r.price ?? null,
          quantity: r.quantity ?? 1,
          isLiked: false,
          status: mapStatus(r.product),
        }));
      }
    } catch (e) {
      console.warn('Cart query failed or model missing:', e);
      cartItems = [];
    }

    const hasNext = cartItems.length > size;
    if (hasNext) cartItems = cartItems.slice(0, size);

    return NextResponse.json({ status: 'success', data: { cartItems } });
  } catch (error: any) {
    console.error('Cart list error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니 정보를 불러오는 중 문제가 발생했습니다.' }, { status: 500 });
  }
}
