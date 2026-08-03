import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';
import { apiError as errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

function parseSingleQueryParam(values: string[]) {
  if (values.length === 0) return { ok: true as const, value: null as string | null };
  if (values.length > 1) return { ok: false as const, value: null as string | null };
  const value = values[0]?.trim() ?? '';
  if (!value) return { ok: false as const, value: null as string | null };
  return { ok: true as const, value };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedYearId = parseSingleQueryParam(url.searchParams.getAll('yearId'));
    const parsedCategoryId = parseSingleQueryParam(url.searchParams.getAll('categoryId'));

    if (!parsedYearId.ok || !parsedCategoryId.ok) {
      return errorResponse(400, 'INVALID_INPUT', '요청 파라미터 형식 오류');
    }

    const selectedYearId = parsedYearId.value;
    const selectedCategoryId = parsedCategoryId.value;

    const repo = prisma as any;

    if (selectedYearId) {
      const year = await repo.projectYear.findUnique({
        where: { id: selectedYearId },
        select: { id: true },
      });
      if (!year) {
        return errorResponse(400, 'YEAR_NOT_FOUND', '유효하지 않은 yearId입니다.');
      }
    }

    if (selectedCategoryId) {
      const category = await repo.projectCategory.findUnique({
        where: { id: selectedCategoryId },
        select: { id: true },
      });
      if (!category) {
        return errorResponse(400, 'CATEGORY_NOT_FOUND', '유효하지 않은 categoryId입니다.');
      }
    }

    const baseVisibleWhere: any = {
      isPublic: true,
      softDeletedAt: null,
    };

    const [allVisibleProjects, filteredProjects] = await Promise.all([
      repo.project.findMany({
        where: baseVisibleWhere,
        select: {
          yearId: true,
          categoryId: true,
          projectYear: { select: { id: true, year: true } },
          category: { select: { id: true, category: true } },
        },
      }),
      repo.project.findMany({
        where: {
          ...baseVisibleWhere,
          ...(selectedYearId ? { yearId: selectedYearId } : {}),
          ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        },
        select: {
          id: true,
          teamId: true,
          title: true,
          thumbnailUrl: true,
          createdAt: true,
          yearId: true,
          categoryId: true,
          team: { select: { teamName: true } },
          projectYear: { select: { year: true } },
          category: { select: { category: true } },
        },
      }),
    ]);

    // Optional personalization (public API): if not logged in, isScrap=false
    let scrapProjectIds = new Set<string>();
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email && filteredProjects.length > 0) {
        const user = await prisma.user.findFirst({ where: { email: session.user.email },
          select: { id: true },
        });
        if (user) {
          const scraps = await repo.scrap.findMany({
            where: {
              userId: user.id,
              projectId: { in: filteredProjects.map((p: any) => p.id) },
            },
            select: { projectId: true },
          });
          scrapProjectIds = new Set(
            scraps.map((s: any) => s.projectId).filter((id: any): id is string => typeof id === 'string')
          );
        }
      }
    } catch (authError) {
      // Public endpoint should still succeed without personalization if session parsing fails.
      console.warn('archive projects optional auth failed:', authError);
    }

    const yearsMap = new Map<string, { yearId: string; year: number }>();
    const categoriesMap = new Map<string, { categoryId: string; category: string }>();

    for (const row of allVisibleProjects as any[]) {
      if (row.projectYear?.id && typeof row.projectYear.year === 'number') {
        yearsMap.set(row.projectYear.id, {
          yearId: row.projectYear.id,
          year: row.projectYear.year,
        });
      } else if (row.yearId) {
        yearsMap.set(row.yearId, { yearId: row.yearId, year: 0 });
      }

      if (row.category?.id && typeof row.category.category === 'string') {
        categoriesMap.set(row.category.id, {
          categoryId: row.category.id,
          category: row.category.category,
        });
      } else if (row.categoryId) {
        categoriesMap.set(row.categoryId, { categoryId: row.categoryId, category: '' });
      }
    }

    const sectionsMap = new Map<
      string,
      {
        yearId: string;
        year: number;
        categoryId: string;
        category: string;
        latestCreatedAt: Date;
        projects: Array<{
          projectId: string;
          teamId: string;
          teamName: string;
          title: string;
          thumbnailUrl: string;
          isScrap: boolean;
          createdAt: Date;
        }>;
      }
    >();

    for (const project of filteredProjects as any[]) {
      const year = Number(project.projectYear?.year ?? 0);
      const categoryName = String(project.category?.category ?? '');
      const key = `${project.yearId}::${project.categoryId}`;

      if (!sectionsMap.has(key)) {
        sectionsMap.set(key, {
          yearId: project.yearId,
          year,
          categoryId: project.categoryId,
          category: categoryName,
          latestCreatedAt: project.createdAt,
          projects: [],
        });
      }

      const section = sectionsMap.get(key)!;
      if (project.createdAt > section.latestCreatedAt) {
        section.latestCreatedAt = project.createdAt;
      }

      section.projects.push({
        projectId: project.id,
        teamId: project.teamId,
        teamName: project.team?.teamName ?? '',
        title: project.title,
        thumbnailUrl: normalizeImageUrl(project.thumbnailUrl) ?? '',
        isScrap: scrapProjectIds.has(project.id),
        createdAt: project.createdAt,
      });
    }

    const sections = Array.from(sectionsMap.values())
      .map((section) => ({
        yearId: section.yearId,
        year: section.year,
        categoryId: section.categoryId,
        category: section.category,
        projects: section.projects
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(({ createdAt, ...rest }) => rest),
        _latestCreatedAt: section.latestCreatedAt,
      }))
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b._latestCreatedAt.getTime() - a._latestCreatedAt.getTime();
      })
      .map(({ _latestCreatedAt, ...rest }) => rest);

    const years = Array.from(yearsMap.values()).sort((a, b) => b.year - a.year);
    const categories = Array.from(categoriesMap.values()).sort((a, b) =>
      a.category.localeCompare(b.category, 'ko')
    );

    return NextResponse.json({
      status: 'success',
      data: {
        filters: {
          years,
          categories,
        },
        selectedFilters: {
          yearId: selectedYearId,
          categoryId: selectedCategoryId,
        },
        sections,
      },
    });
  } catch (error) {
    console.error('Archive projects list error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
