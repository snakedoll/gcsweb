import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요한 서비스입니다.' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    const repo: any = prisma as any;
    let projects: any[] = [];
    try {
      // Scrap 모델이 존재하면 사용, 없으면 빈 배열 반환
      if (repo.scrap && typeof repo.scrap.findMany === 'function') {
        const rows = await repo.scrap.findMany({
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

        projects = rows
          .map((r: any) => r.project)
          .filter((p: any) => p)
          .map((p: any) => ({
            id: p.id,
            teamName: null,
            title: p.title,
            thumbnailUrl: p.thumbnailUrl ?? null,
            keywords: [],
          }));
      }
    } catch (e) {
      console.warn('Scraps project query failed or model missing:', e);
      projects = [];
    }

    const hasNext = projects.length > size;
    if (hasNext) projects = projects.slice(0, size);

    return NextResponse.json({ status: 'success', data: { hasNext, projects } });
  } catch (error: any) {
    console.error('Scraps project list error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' }, { status: 500 });
  }
}
