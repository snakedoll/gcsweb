import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError, parseOptionalProductType, requireAdmin } from '../../../_utils';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsedType = parseOptionalProductType(url.searchParams.get('type'));

    if (!parsedType.ok) {
      return jsonError(400, 'INVALID_INPUT', '요청 파라미터 형식이 올바르지 않습니다.');
    }

    const repo = prisma as any;
    const where: any = {
      requestType: 1,
      ...(parsedType.value != null ? { type: parsedType.value } : {}),
    };

    const [totalUpdateRequestCount, requests] = await Promise.all([
      repo.productUpdateRequest.count({
        where: { requestType: 1 },
      }),
      repo.productUpdateRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        select: {
          id: true,
          productId: true,
          teamId: true,
          type: true,
          name: true,
          description: true,
          salesStartDate: true,
          salesEndDate: true,
          goalAmount: true,
          requestedAt: true,
          team: { select: { teamName: true } },
          product: {
            select: {
              currentAmount: true,
              likeCount: true,
            },
          },
          images: {
            select: { thumbnailImgUrl: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      status: 'success',
      data: {
        summary: {
          totalUpdateRequestCount,
        },
        requests: requests.map((r: any) => ({
          requestId: r.id,
          productId: r.productId,
          teamId: r.teamId,
          teamName: r.team?.teamName ?? '',
          type: r.type,
          name: r.name,
          description: r.description ?? '',
          thumbnailUrl: r.images?.[0]?.thumbnailImgUrl ?? '',
          salesStartDate: r.salesStartDate,
          salesEndDate: r.salesEndDate,
          currentAmount: r.type === 0 ? (r.product?.currentAmount ?? 0) : null,
          goalAmount: r.type === 0 ? (r.goalAmount ?? null) : null,
          likeCount: r.product?.likeCount ?? 0,
          requestedAt: r.requestedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Admin update request list error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

