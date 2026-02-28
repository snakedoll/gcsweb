import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

function mapStatus(product: any) {
  if (product == null) return 'SOLD_OUT';
  if (typeof product.status === 'number' && product.status !== 1) {
    return 'SALES_ENDED';
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

    // 유저의 장바구니(Cart) 찾기
    const cart = await prisma.cart.findFirst({ where: { userId: user.id } });

    if (!cart) {
      return NextResponse.json({ status: 'success', data: { cartItems: [] } });
    }

    // CartItem 조회 (product 관계 포함)
    const rows = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
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
            receiveMethod: true,
            price: true,
            team: { select: { teamName: true } },
            images: { select: { thumbnailImgUrl: true }, take: 1 },
          },
        },
      },
    });

    // 좋아요 확인
    const productIds = rows.map((r) => r.product?.id).filter(Boolean) as string[];
    let likeSet = new Set<string>();
    if (productIds.length) {
      try {
        const likes = await prisma.like.findMany({
          where: { userId: user.id, productId: { in: productIds } },
          select: { productId: true },
        });
        likeSet = new Set(likes.map((l) => l.productId as string));
      } catch (_) { /* ignore */ }
    }

    let cartItems = rows.map((r) => {
      const p = r.product;
      // optionData 파싱
      let options: any[] = [];
      try {
        const raw = r.optionData;
        if (raw && typeof raw === 'object') {
          if (Array.isArray(raw)) options = raw;
          else options = [raw];
        }
      } catch (_) {
        options = [];
      }

      return {
        cartItemId: r.id,
        productId: p?.id ?? null,
        teamName: p?.team?.teamName ?? null,
        productName: p?.name ?? null,
        thumbnailUrl: normalizeImageUrl((p?.images && p.images[0]?.thumbnailImgUrl) ?? null),
        options,
        price: r.price,
        quantity: r.quantity,
        isLiked: Boolean(p?.id && likeSet.has(p.id)),
        status: mapStatus(p),
        type: p?.type ?? 0,
        receiveMethod: p?.receiveMethod ?? 0,
      };
    });

    const hasNext = cartItems.length > size;
    if (hasNext) cartItems = cartItems.slice(0, size);

    return NextResponse.json({ status: 'success', data: { cartItems } });
  } catch (error: any) {
    console.error('Cart list error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '장바구니 정보를 불러오는 중 문제가 발생했습니다.' }, { status: 500 });
  }
}
