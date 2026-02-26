import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function parseBooleanQuery(value: string | null): boolean | undefined | 'invalid' {
  if (value == null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return 'invalid';
}

function sanitizeIdList(values: string[]) {
  const trimmed = values.map((v) => v.trim());
  if (trimmed.some((v) => !v)) return { ok: false as const, values: [] as string[] };
  return { ok: true as const, values: Array.from(new Set(trimmed)) };
}

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const keyword = (url.searchParams.get('keyword') ?? '').trim();
    const sort = (url.searchParams.get('sort') ?? 'latest').trim();
    const isPublic = parseBooleanQuery(url.searchParams.get('isPublic'));
    const parsedYearIds = sanitizeIdList(url.searchParams.getAll('yearIds'));
    const parsedCategoryIds = sanitizeIdList(url.searchParams.getAll('categoryIds'));

    if (!['latest', 'view'].includes(sort)) {
      return errorResponse(400, 'INVALID_INPUT', '요청 파라미터 형식이 올바르지 않습니다.');
    }

    if (isPublic === 'invalid' || !parsedYearIds.ok || !parsedCategoryIds.ok) {
      return errorResponse(400, 'INVALID_INPUT', '요청 파라미터 형식이 올바르지 않습니다.');
    }

    const yearIds = parsedYearIds.values;
    const categoryIds = parsedCategoryIds.values;

    const repo = prisma as any;

    if (yearIds.length > 0) {
      const years = await repo.projectYear.findMany({
        where: { id: { in: yearIds } },
        select: { id: true },
      });

      if (years.length !== yearIds.length) {
        return errorResponse(400, 'YEAR_NOT_FOUND', '유효하지 않은 yearIds가 포함되어 있습니다.');
      }
    }

    if (categoryIds.length > 0) {
      const categories = await repo.projectCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true },
      });

      if (categories.length !== categoryIds.length) {
        return errorResponse(400, 'CATEGORY_NOT_FOUND', '유효하지 않은 categoryIds가 포함되어 있습니다.');
      }
    }

    const where: any = {
      softDeletedAt: null,
    };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { team: { is: { teamName: { contains: keyword, mode: 'insensitive' } } } },
      ];
    }

    if (yearIds.length > 0) {
      where.yearId = { in: yearIds };
    }

    if (categoryIds.length > 0) {
      where.categoryId = { in: categoryIds };
    }

    if (typeof isPublic === 'boolean') {
      where.isPublic = isPublic;
    }

    const orderBy =
      sort === 'view'
        ? [{ viewCount: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

    const [summary, projects] = await Promise.all([
      repo.project.aggregate({
        where,
        _count: { _all: true },
        _sum: { viewCount: true },
      }),
      repo.project.findMany({
        where,
        orderBy,
        select: {
          id: true,
          teamId: true,
          title: true,
          yearId: true,
          categoryId: true,
          thumbnailUrl: true,
          isPublic: true,
          isHome: true,
          likeCount: true,
          viewCount: true,
          createdAt: true,
          team: {
            select: {
              teamName: true,
            },
          },
          projectYear: {
            select: {
              year: true,
            },
          },
          category: {
            select: {
              category: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      status: 'success',
      data: {
        summary: {
          totalProjectCount: summary?._count?._all ?? 0,
          totalViewCount: summary?._sum?.viewCount ?? 0,
        },
        projects: projects.map((project: any) => ({
          id: project.id,
          teamId: project.teamId,
          teamName: project.team?.teamName ?? '',
          title: project.title,
          yearId: project.yearId,
          year: String(project.projectYear?.year ?? ''),
          categoryId: project.categoryId,
          category: project.category?.category ?? '',
          thumbnailUrl: normalizeImageUrl(project.thumbnailUrl),
          isPublic: project.isPublic,
          isHome: project.isHome,
          likeCount: project.likeCount,
          viewCount: project.viewCount,
          createdAt: project.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Admin project list error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
