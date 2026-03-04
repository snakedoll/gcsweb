import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const adminUser = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { memberType: true },
    });

    if (!adminUser || Number(adminUser.memberType) !== 2) {
      return errorResponse(403, 'FORBIDDEN', '관리자 권한이 없습니다.');
    }

    const projectId = params?.projectId?.trim();
    if (!projectId) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
    }

    const repo = prisma as any;
    const project = await repo.project.findFirst({
      where: {
        id: projectId,
        softDeletedAt: null,
      },
      select: {
        id: true,
        title: true,
        teamId: true,
        yearId: true,
        categoryId: true,
        thumbnailUrl: true,
        detailUrl: true,
        isPublic: true,
        team: { select: { teamName: true } },
        projectYear: { select: { year: true } },
        category: { select: { category: true } },
      },
    });

    if (!project) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
    }

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          id: project.id,
          title: project.title,
          teamId: project.teamId,
          teamName: project.team?.teamName ?? '',
          yearId: project.yearId,
          year: String(project.projectYear?.year ?? ''),
          categoryId: project.categoryId,
          category: project.category?.category ?? '',
          thumbnailUrl: normalizeImageUrl(project.thumbnailUrl),
          detailUrl: normalizeImageUrl(project.detailUrl),
          isPublic: project.isPublic,
        },
      },
    });
  } catch (error) {
    console.error('Admin project detail error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
