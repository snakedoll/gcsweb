import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';
import { getSaleStatusByDate } from '@/lib/sale-date';

export const dynamic = 'force-dynamic';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function parseQueryInt(value: string | null, allowed: number[], fallback: number) {
  if (value == null) return { ok: true as const, value: fallback };
  if (!/^\d+$/.test(value)) return { ok: false as const, value: fallback };
  const num = Number(value);
  if (!allowed.includes(num)) return { ok: false as const, value: fallback };
  return { ok: true as const, value: num };
}

function computeProgressStatus(now: Date, salesStartDate: Date, salesEndDate: Date): 0 | 1 | 2 {
  const status = getSaleStatusByDate(salesStartDate, salesEndDate, now);
  if (status === 'scheduled') return 0;
  if (status === 'completed') return 2;
  return 1;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedType = parseQueryInt(url.searchParams.get('type'), [0, 1, 2], 0);
    const parsedStatus = parseQueryInt(url.searchParams.get('status'), [0, 1, 2], 1);

    if (!parsedType.ok || !parsedStatus.ok) {
      return jsonError(400, 'INVALID_INPUT', '요청 파라미터 형식이 올바르지 않습니다.');
    }

    const type = parsedType.value;
    const status = parsedStatus.value;
    const now = new Date();
    const products = await prisma.product.findMany({
      where: {
        isPublic: true,
        isAdminApproved: true,
        type,
      },
      orderBy: [{ publicAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        teamId: true,
        type: true,
        name: true,
        description: true,
        salesStartDate: true,
        salesEndDate: true,
        currentAmount: true,
        goalAmount: true,
        likeCount: true,
        team: { select: { teamName: true } },
        images: {
          select: { thumbnailImgUrl: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const filteredByStatus = products.filter((product) => {
      const computed = computeProgressStatus(now, product.salesStartDate, product.salesEndDate);
      return computed === status;
    });

    let likedProductIds = new Set<string>();
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email && filteredByStatus.length > 0) {
        const user = await prisma.user.findFirst({ where: { email: session.user.email },
          select: { id: true },
        });

        if (user) {
          const likes = await prisma.like.findMany({
            where: {
              userId: user.id,
              productId: { in: filteredByStatus.map((p) => p.id) },
            },
            select: { productId: true },
          });

          likedProductIds = new Set(
            likes
              .map((like) => like.productId)
              .filter((id): id is string => typeof id === 'string')
          );
        }
      }
    } catch (e) {
      console.warn('shop products optional auth failed:', e);
    }

    return NextResponse.json({
      status: 'success',
      data: {
        products: filteredByStatus.map((product) => ({
          id: product.id,
          teamId: product.teamId,
          teamName: product.team?.teamName ?? '',
          name: product.name,
          description: product.description ?? '',
          type: product.type,
          thumbnailUrl: normalizeImageUrl(product.images?.[0]?.thumbnailImgUrl ?? '') ?? '',
          salesStartDate: product.salesStartDate,
          salesEndDate: product.salesEndDate,
          currentAmount: product.type === 0 ? product.currentAmount ?? 0 : null,
          goalAmount: product.type === 0 ? product.goalAmount ?? null : null,
          likeCount: product.likeCount ?? 0,
          isLiked: likedProductIds.has(product.id),
        })),
      },
    });
  } catch (error) {
    console.error('Shop products list error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
