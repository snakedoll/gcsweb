import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

type ProjectAddBody = {
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

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidUrlString(value: unknown) {
  if (!isNonEmptyString(value)) return false;
  try {
    new URL(String(value));
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
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

    const body = (await request.json().catch(() => ({}))) as ProjectAddBody;
    const {
      title,
      teamId,
      yearId,
      categoryId,
      thumbnailUrl,
      detailUrl,
      isPublic,
    } = body;

    if (
      !isNonEmptyString(title) ||
      !isNonEmptyString(teamId) ||
      !isNonEmptyString(yearId) ||
      !isNonEmptyString(categoryId) ||
      !isValidUrlString(thumbnailUrl) ||
      !isValidUrlString(detailUrl) ||
      typeof isPublic !== 'boolean'
    ) {
      return errorResponse(400, 'INVALID_INPUT', '필수 입력값이 누락되었거나 형식이 올바르지 않습니다.');
    }

    const safeTitle = (title as string).trim();
    const safeTeamId = (teamId as string).trim();
    const safeYearId = (yearId as string).trim();
    const safeCategoryId = (categoryId as string).trim();
    const safeThumbnailUrl = (thumbnailUrl as string).trim();
    const safeDetailUrl = (detailUrl as string).trim();
    const safeIsPublic = isPublic as boolean;

    const repo = prisma as any;

    const [team, year, category] = await Promise.all([
      repo.team.findUnique({ where: { id: safeTeamId } }),
      repo.projectYear?.findUnique?.({ where: { id: safeYearId } }),
      repo.projectCategory?.findUnique?.({ where: { id: safeCategoryId } }),
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

    const created = await repo.project.create({
      data: {
        title: safeTitle,
        teamId: safeTeamId,
        yearId: safeYearId,
        categoryId: safeCategoryId,
        thumbnailUrl: safeThumbnailUrl,
        detailUrl: safeDetailUrl,
        isPublic: safeIsPublic,
        isHome: false,
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
      },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          projectId: created.id,
          title: created.title,
          teamId: created.teamId,
          yearId: created.yearId,
          categoryId: created.categoryId,
          thumbnailUrl: created.thumbnailUrl,
          detailUrl: created.detailUrl,
          isPublic: created.isPublic,
          isHome: created.isHome,
          likeCount: created.likeCount,
          viewCount: created.viewCount,
          createdAt: created.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Admin project add error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
