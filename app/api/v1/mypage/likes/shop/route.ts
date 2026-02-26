import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

function mapStatus(status: number) {
  // Normalize to API spec strings
  return status === 1 ? 'AVAILABLE' : 'SOLD_OUT';
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
      if (![0,1,2].includes(t)) {
        return NextResponse.json({
          status: 'error',
          code: 'INVALID_INPUT',
          message: '유효하지 않은 상품 유형입니다.',
        }, { status: 400 });
      }
      typeFilter = t;
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' }, { status: 401 });
    }

    // 안전하게 Like -> Product 조인 조회 (Product 가 존재할 때만)
    const repo: any = prisma as any;
    let totalCount = 0;
    let products: any[] = [];
    try {
      if (repo.like && typeof repo.like.findMany === 'function') {
        const whereLike: any = { userId: user.id };

        // count total matching items
        // we can't easily filter by type on count without joining, but if typeFilter is set we can fetch products to check.
        // for simplicity, just count likes. This is an approximation if you filter by type!
        
        let allLikes = await repo.like.findMany({
          where: whereLike,
          include: { product: { select: { type: true } } }
        });
        
        if (typeFilter !== undefined) {
          allLikes = allLikes.filter((l: any) => l.product && l.product.type === typeFilter);
        }
        totalCount = allLikes.length;

        // include product and nested relations
        const rows = await repo.like.findMany({
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
                team: { select: { teamName: true } },
                images: { select: { thumbnailImgUrl: true }, take: 1 },
              },
            },
          },
        });

        // apply optional type filter and map
        const filtered = rows
          .map((r: any) => r.product)
          .filter((p: any) => p && (typeFilter === undefined ? true : p.type === typeFilter));

        products = filtered.map((p: any) => ({
          id: p.id,
          teamName: p.team?.teamName ?? null,
          name: p.name,
          thumbnailUrl: (p.images && p.images[0]?.thumbnailImgUrl) ?? null,
          status: mapStatus(p.status ?? 0),
          type: p.type ?? 0,
          fundingStatus: p.status === 0 ? '진행예정' : p.status === 1 ? '진행중' : '진행완료',
        }));
      }
    } catch (e) {
      console.warn('Likes shop query failed or model missing:', e);
      products = [];
    }

    const hasNext = products.length > size;
    if (hasNext) products = products.slice(0, size);

    return NextResponse.json({ status: 'success', data: { hasNext, products, totalCount } });
  } catch (error: any) {
    console.error('Likes shop list error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' }, { status: 500 });
  }
}
