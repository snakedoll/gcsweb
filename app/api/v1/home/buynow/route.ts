import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';
import { apiError as jsonError } from '@/lib/api-response';

export async function GET() {
  try {
    const now = new Date();
    const products = await prisma.product.findMany({
      where: {
        type: 1,
        isHome: true,
        isPublic: true,
        isAdminApproved: true,
        salesEndDate: { gte: now },
      },
      orderBy: [{ publicAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        salesEndDate: true,
        team: { select: { teamName: true } },
        images: {
          select: { thumbnailImgUrl: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          teamName: product.team?.teamName ?? '',
          salesEndDate: product.salesEndDate,
          thumbnailUrl: normalizeImageUrl(product.images?.[0]?.thumbnailImgUrl ?? '') ?? '',
        })),
      },
    });
  } catch (error) {
    console.error('Home buynow products error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

