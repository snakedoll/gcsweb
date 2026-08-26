import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';
import { apiError, apiErrors } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized('로그인이 필요한 서비스입니다.');
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return apiErrors.unauthorized('사용자를 찾을 수 없습니다.');
    }

    const totalCount = await prisma.scrap.count({
      where: { userId: user.id, projectId: { not: null } }
    });

    const rows = await prisma.scrap.findMany({
      where: { userId: user.id, projectId: { not: null } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size + 1,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    let projects = rows
      .map((r: any) => r.project)
      .filter((p: any) => p)
      .map((p: any) => ({
        id: p.id,
        teamName: null,
        title: p.title,
        thumbnailUrl: normalizeImageUrl(p.thumbnailUrl ?? null),
        keywords: [],
      }));

    const hasNext = projects.length > size;
    if (hasNext) projects = projects.slice(0, size);

    return NextResponse.json({ status: 'success', data: { hasNext, projects, totalCount } });
  } catch (error: any) {
    console.error('Scraps project list error:', error);
    return apiErrors.serverError('서버 내부 오류');
  }
}
