import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';
import { getSaleStatusByDate } from '@/lib/sale-date';

export const dynamic = 'force-dynamic';

function mapStatus(product: any) {
  if (product == null) return 'SOLD_OUT';
  
  // 관리자 승인이 안 되었거나 비공개면 판매 종료로 처리
  if (!product.isAdminApproved || !product.isPublic) {
    return 'SALES_ENDED';
  }

  const now = new Date();
  const saleStatus = getSaleStatusByDate(product.salesStartDate, product.salesEndDate, now);
  
  if (saleStatus !== 'active') {
    return 'SALES_ENDED';
  }

  if (product.status === 2) {
    return 'SOLD_OUT';
  }

  return 'AVAILABLE';
}

function getFundingStatusText(product: any) {
  const now = new Date();
  const saleStatus = getSaleStatusByDate(product.salesStartDate, product.salesEndDate, now);
  
  if (saleStatus === 'scheduled') return '진행예정';
  if (saleStatus === 'active') return '진행중';
  return '진행완료';
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: '로그인이 필요한 서비스입니다.',
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const typeParam = url.searchParams.get('type');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    let typeFilter: number | undefined;
    if (typeParam !== null) {
      const t = Number(typeParam);
      if (![0, 1, 2].includes(t)) {
        return NextResponse.json({
          status: 'error',
          code: 'INVALID_INPUT',
          message: '유효하지 않은 상품 유형입니다.',
        }, { status: 400 });
      }
      typeFilter = t;
    }

    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' }, { status: 401 });
    }

    const whereLike = { userId: user.id, productId: { not: null } };

    const totalCount = await prisma.like.count({
      where: {
        ...whereLike,
        ...(typeFilter !== undefined ? { product: { type: typeFilter } } : {})
      }
    });

    // include product and nested relations
    const rows = await prisma.like.findMany({
      where: whereLike,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size + 1,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            salesStartDate: true,
            salesEndDate: true,
            isAdminApproved: true,
            isPublic: true,
            team: { select: { teamName: true } },
            images: { select: { thumbnailImgUrl: true }, take: 1 },
          },
        },
      },
    });

    // apply optional type filter and map
    let products = rows
      .map((r: any) => r.product)
      .filter((p: any) => p && (typeFilter === undefined ? true : p.type === typeFilter))
      .map((p: any) => ({
        id: p.id,
        teamName: p.team?.teamName ?? null,
        name: p.name,
        thumbnailUrl: normalizeImageUrl((p.images && p.images[0]?.thumbnailImgUrl) ?? null),
        status: mapStatus(p),
        type: p.type ?? 0,
        fundingStatus: getFundingStatusText(p),
      }));

    const hasNext = products.length > size;
    if (hasNext) products = products.slice(0, size);

    return NextResponse.json({ status: 'success', data: { hasNext, products, totalCount } });
  } catch (error: any) {
    console.error('Likes shop list error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' }, { status: 500 });
  }
}
