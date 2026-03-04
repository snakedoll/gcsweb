import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

type ProjectAddBody = {
  title?: string;
  teamId?: string;
  yearId?: string;
  categoryId?: string;
  year?: string;
  category?: string;
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
  if (value.trim().startsWith('/')) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function parseYearValue(value: unknown) {
  if (!isNonEmptyString(value)) return null;
  const normalized = value.trim();

  // 정책: year는 신규 태그 생성 시 사용하는 4자리 문자열
  if (!/^\d{4}$/.test(normalized)) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const adminUser = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { memberType: true },
    });

    if (!adminUser) {
      return errorResponse(401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    if (Number(adminUser.memberType) !== 2) {
      return errorResponse(403, 'FORBIDDEN', '관리자 권한이 없습니다.');
    }

    const body = (await request.json().catch(() => ({}))) as ProjectAddBody;
    const { title, teamId, yearId, categoryId, year, category, thumbnailUrl, detailUrl, isPublic } = body;

    if (!isNonEmptyString(title) || !isNonEmptyString(teamId) || !isValidUrlString(thumbnailUrl) || !isValidUrlString(detailUrl) || typeof isPublic !== 'boolean') {
      return errorResponse(400, 'INVALID_INPUT', '필수 입력값이 누락되었거나 형식이 올바르지 않습니다.');
    }

    const safeTitle = title.trim();
    const safeTeamId = teamId.trim();
    const safeThumbnailUrl = normalizeImageUrl(thumbnailUrl.trim()) ?? thumbnailUrl.trim();
    const safeDetailUrl = normalizeImageUrl(detailUrl.trim()) ?? detailUrl.trim();
    const safeIsPublic = isPublic;
    const safeYearId = isNonEmptyString(yearId) ? yearId.trim() : '';
    const safeCategoryId = isNonEmptyString(categoryId) ? categoryId.trim() : '';
    const safeCategoryName = isNonEmptyString(category) ? category.trim() : '';
    const parsedYear = parseYearValue(year);

    if (!safeYearId && isNonEmptyString(year) && parsedYear == null) {
      return errorResponse(400, 'INVALID_YEAR', 'year는 4자리 숫자 문자열이어야 합니다. 예: 2025');
    }

    // 정책:
    // - yearId / year 중 최소 1개 필수
    // - categoryId / category 중 최소 1개 필수
    if (!safeYearId && parsedYear == null) {
      return errorResponse(400, 'YEAR_NOT_FOUND', '유효한 yearId 또는 year 값이 필요합니다.');
    }

    if (!safeCategoryId && !safeCategoryName) {
      return errorResponse(400, 'CATEGORY_NOT_FOUND', '유효한 categoryId 또는 category 값이 필요합니다.');
    }

    const repo = prisma as any;

    const team = await repo.team.findUnique({ where: { id: safeTeamId } });
    if (!team) {
      return errorResponse(400, 'TEAM_NOT_FOUND', '유효하지 않은 teamId입니다.');
    }

    let yearRecord = safeYearId
      ? await repo.projectYear?.findUnique?.({ where: { id: safeYearId } })
      : await repo.projectYear?.findFirst?.({ where: { year: parsedYear } });

    if (!yearRecord && !safeYearId && parsedYear != null) {
      yearRecord = await repo.projectYear.create({ data: { year: parsedYear } });
    }

    if (!yearRecord) {
      return errorResponse(400, 'YEAR_NOT_FOUND', '유효하지 않은 yearId/year 입니다.');
    }

    let categoryRecord = safeCategoryId
      ? await repo.projectCategory?.findUnique?.({ where: { id: safeCategoryId } })
      : await repo.projectCategory?.findFirst?.({ where: { category: safeCategoryName } });

    if (!categoryRecord && !safeCategoryId && safeCategoryName) {
      categoryRecord = await repo.projectCategory.create({ data: { category: safeCategoryName } });
    }

    if (!categoryRecord) {
      return errorResponse(400, 'CATEGORY_NOT_FOUND', '유효하지 않은 categoryId/category 입니다.');
    }

    const created = await repo.project.create({
      data: {
        title: safeTitle,
        teamId: safeTeamId,
        yearId: yearRecord.id,
        categoryId: categoryRecord.id,
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
          thumbnailUrl: normalizeImageUrl(created.thumbnailUrl),
          detailUrl: normalizeImageUrl(created.detailUrl),
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
