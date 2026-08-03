import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';
import { getSaleStatusByDate } from '@/lib/sale-date';
import { isMatchedVariantSoldOut } from '@/lib/variant-signature';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

function mapStatus(product: any, optionData: unknown) {
  if (product == null) return 'SOLD_OUT';
  
  // 관리자 승인이 안 되었거나 비공개면 판매 종료로 처리
  if (!product.isAdminApproved || !product.isPublic) {
    return 'SALES_ENDED';
  }

  const now = new Date();
  const saleStatus = getSaleStatusByDate(product.salesStartDate, product.salesEndDate, now);
  
  // 판매 기간이 아니면(예정 or 완료) 판매 종료로 처리
  if (saleStatus !== 'active') {
    return 'SALES_ENDED';
  }

  // 명시적으로 품절 상태(2)인 경우 처리 (현재 GCS 관례가 있다면)
  if (product.status === 2) {
    return 'SOLD_OUT';
  }
  if (isMatchedVariantSoldOut(product.variants ?? [], optionData)) {
    return 'SOLD_OUT';
  }

  return 'AVAILABLE';
}

function toTypeGroup(type: number | null | undefined): 0 | 1 {
  return type === 0 ? 0 : 1;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, 'UNAUTHORIZED', '로그인이 필요한 서비스입니다.');
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return apiError(401, 'UNAUTHORIZED', '사용자를 찾을 수 없습니다.');
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
            salesStartDate: true,
            salesEndDate: true,
            isAdminApproved: true,
            isPublic: true,
            receiveMethod: true,
            price: true,
            team: { select: { teamName: true } },
            images: { select: { thumbnailImgUrl: true }, take: 1 },
            variants: {
              select: {
                optionSignature: true,
                isSoldOut: true,
              },
            },
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
        status: mapStatus(p, r.optionData),
        type: toTypeGroup(p?.type ?? null),
        receiveMethod: toTypeGroup(p?.type ?? null) === 1 ? 1 : (p?.receiveMethod ?? 0),
      };
    });

    const hasNext = cartItems.length > size;
    if (hasNext) cartItems = cartItems.slice(0, size);

    return NextResponse.json({ status: 'success', data: { cartItems } });
  } catch (error: any) {
    console.error('Cart list error:', error);
    return apiError(500, 'SERVER_ERROR', '장바구니 정보를 불러오는 중 문제가 발생했습니다.');
  }
}
