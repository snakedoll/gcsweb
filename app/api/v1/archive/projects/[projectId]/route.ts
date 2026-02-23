import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const pathProjectId = isNonEmptyString(params?.projectId) ? params.projectId.trim() : '';
    if (!pathProjectId) {
      return errorResponse(400, 'INVALID_INPUT', '형식 오류');
    }

    const repo = prisma as any;

    // Public-visible project only
    const found = await repo.project.findFirst({
      where: {
        id: pathProjectId,
        isPublic: true,
        softDeletedAt: null,
      },
      select: { id: true },
    });

    if (!found) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '해당 프로젝트를 찾을 수 없습니다.');
    }

    // Increase view count on read, then return current state.
    const project = await repo.project.update({
      where: { id: pathProjectId },
      data: { viewCount: { increment: 1 } },
      select: {
        id: true,
        title: true,
        teamId: true,
        yearId: true,
        categoryId: true,
        thumbnailUrl: true,
        detailUrl: true,
        team: { select: { teamName: true } },
        projectYear: { select: { year: true } },
        category: { select: { category: true } },
      },
    });

    let isScrap = false;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });

        if (user) {
          const scrap = await repo.scrap.findFirst({
            where: {
              userId: user.id,
              projectId: pathProjectId,
            },
            select: { id: true },
          });
          isScrap = Boolean(scrap);
        }
      }
    } catch (authError) {
      // Public endpoint: if session parsing fails unexpectedly, degrade gracefully.
      console.warn('archive project detail optional auth failed:', authError);
      isScrap = false;
    }

    const reqUrl = new URL(request.url);
    const projectUrl = `${reqUrl.origin}/archive/projects/${project.id}`;

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          projectId: project.id,
          title: project.title,
          teamId: project.teamId,
          teamName: project.team?.teamName ?? '',
          yearId: project.yearId,
          year: Number(project.projectYear?.year ?? 0),
          categoryId: project.categoryId,
          category: project.category?.category ?? '',
          thumbnailUrl: project.thumbnailUrl,
          detailUrl: project.detailUrl,
          projectUrl,
          isScrap,
        },
      },
    });
  } catch (error) {
    console.error('Archive project detail error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
