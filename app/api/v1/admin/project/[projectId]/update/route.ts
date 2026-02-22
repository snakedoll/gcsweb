import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

type ProjectUpdateBody = {
  projectId?: string;
  title?: string;
  teamId?: string;
  yearId?: string;
  categoryId?: string;
  thumbnailUrl?: string;
  detailUrl?: string;
  isPublic?: boolean;
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidUrlString(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { memberType: true },
    });

    if (!adminUser) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    if (Number(adminUser.memberType) !== 2) {
      return errorResponse(403, 'FORBIDDEN', '어드민 권한이 없습니다.');
    }

    const body = (await request.json().catch(() => ({}))) as ProjectUpdateBody;
    const {
      projectId,
      title,
      teamId,
      yearId,
      categoryId,
      thumbnailUrl,
      detailUrl,
      isPublic,
    } = body;

    if (
      !isNonEmptyString(params?.projectId) ||
      !isNonEmptyString(projectId) ||
      !isNonEmptyString(title) ||
      !isNonEmptyString(teamId) ||
      !isNonEmptyString(yearId) ||
      !isNonEmptyString(categoryId) ||
      !isValidUrlString(thumbnailUrl) ||
      !isValidUrlString(detailUrl) ||
      typeof isPublic !== 'boolean'
    ) {
      return errorResponse(400, 'INVALID_INPUT', '필수 입력값이 누락되었습니다.');
    }

    const safePathProjectId = params.projectId.trim();
    const safeProjectId = projectId.trim();
    const safeTitle = title.trim();
    const safeTeamId = teamId.trim();
    const safeYearId = yearId.trim();
    const safeCategoryId = categoryId.trim();
    const safeThumbnailUrl = thumbnailUrl.trim();
    const safeDetailUrl = detailUrl.trim();
    const safeIsPublic = isPublic;

    if (safePathProjectId !== safeProjectId) {
      return errorResponse(400, 'INVALID_INPUT', '필수 입력값이 누락되었습니다.');
    }

    const repo = prisma as any;

    const existingProject = await repo.project.findUnique({
      where: { id: safeProjectId },
      select: { id: true },
    });

    if (!existingProject) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
    }

    const [team, year, category] = await Promise.all([
      repo.team.findUnique({ where: { id: safeTeamId }, select: { id: true } }),
      repo.projectYear?.findUnique?.({ where: { id: safeYearId }, select: { id: true } }),
      repo.projectCategory?.findUnique?.({ where: { id: safeCategoryId }, select: { id: true } }),
    ]);

    if (!team) {
      return errorResponse(400, 'TEAM_NOT_FOUND', '유효하지 않은 teamId입니다.');
    }

    if (!year) {
      return errorResponse(400, 'YEAR_NOT_FOUND', '유효하지 않은 yearId입니다.');
    }

    if (!category) {
      return errorResponse(400, 'CATEGORY_NOT_FOUND', '유효하지 않은 categoryId입니다.');
    }

    const updated = await repo.project.update({
      where: { id: safeProjectId },
      data: {
        title: safeTitle,
        teamId: safeTeamId,
        yearId: safeYearId,
        categoryId: safeCategoryId,
        thumbnailUrl: safeThumbnailUrl,
        detailUrl: safeDetailUrl,
        isPublic: safeIsPublic,
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
        isHome: true,
        likeCount: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          projectId: updated.id,
          title: updated.title,
          teamId: updated.teamId,
          yearId: updated.yearId,
          categoryId: updated.categoryId,
          thumbnailUrl: updated.thumbnailUrl,
          detailUrl: updated.detailUrl,
          isPublic: updated.isPublic,
          isHome: updated.isHome,
          likeCount: updated.likeCount,
          viewCount: updated.viewCount,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Admin project update error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
