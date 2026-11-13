import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';
import { apiErrors, apiSuccess } from '@/lib/api-response';
import { VISIBLE_PROJECT_WHERE } from '@/lib/archive/visible-project';

export const dynamic = 'force-dynamic';

const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;

function readPositiveInt(value: string | null, fallback: number): number | null {
  if (value === null || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

/**
 * GET /api/v2/mypage/scraps/project?page=&size=
 * 내가 스크랩한 아카이브 프로젝트 목록(최근 스크랩순). v1과 달리 팀명·연도·카테고리를 채우고,
 * 공개·미삭제 프로젝트만 보여 준다(마이페이지 스크랩 개수 v1 info 도 같은 기준).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return apiErrors.unauthorized();

    const url = new URL(request.url);
    const page = readPositiveInt(url.searchParams.get('page'), 1);
    const size = readPositiveInt(url.searchParams.get('size'), DEFAULT_SIZE);
    if (page === null || size === null || size > MAX_SIZE) return apiErrors.invalidInput('유효하지 않은 조회 조건');

    const where: Prisma.ScrapWhereInput = { userId, project: VISIBLE_PROJECT_WHERE };

    const [totalCount, rows] = await Promise.all([
      prisma.scrap.count({ where }),
      prisma.scrap.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size + 1,
        select: {
          project: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              team: { select: { teamName: true } },
              projectYear: { select: { year: true } },
              category: { select: { category: true } },
            },
          },
        },
      }),
    ]);

    const hasNext = rows.length > size;
    const projects = rows.slice(0, size).flatMap(({ project }) =>
      project
        ? [
            {
              projectId: project.id,
              title: project.title,
              teamName: project.team.teamName,
              year: Number(project.projectYear.year),
              category: project.category.category,
              thumbnailUrl: normalizeImageUrl(project.thumbnailUrl),
            },
          ]
        : [],
    );

    return apiSuccess({ projects, totalCount, hasNext, page, size });
  } catch (error) {
    console.error('[v2/mypage/scraps/project] GET error:', error);
    return apiErrors.serverError();
  }
}
