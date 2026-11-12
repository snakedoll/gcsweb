import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';
import { apiErrors, apiSuccess } from '@/lib/api-response';
import { buildProjectMembers, collectProjectMemberIds } from '@/lib/archive/project-members';

async function findScrapUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  } catch (error) {
    // 공개 API라 세션 확인이 실패해도 비로그인으로 처리한다.
    console.warn('[v2/archive/projects/:id] session lookup failed:', error);
    return null;
  }
}

/**
 * 아카이브 프로젝트 상세. v1 상세에 팀원 목록(members)을 더한 버전.
 * 공개·미삭제 프로젝트만 조회되고, 조회할 때마다 viewCount를 1 올린다.
 */
export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId?.trim();
    if (!projectId) return apiErrors.notFound('프로젝트를 찾을 수 없음');

    // 공개 여부 확인과 조회수 증가를 한 번에 한다.
    const { count } = await prisma.project.updateMany({
      where: { id: projectId, isPublic: true, softDeletedAt: null },
      data: { viewCount: { increment: 1 } },
    });
    if (count === 0) return apiErrors.notFound('프로젝트를 찾을 수 없음');

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        teamId: true,
        yearId: true,
        categoryId: true,
        thumbnailUrl: true,
        detailUrl: true,
        team: {
          select: {
            teamName: true,
            userId: true,
            representativeNickname: true,
            teamMember: true,
            teamMemberNickname: true,
          },
        },
        projectYear: { select: { year: true } },
        category: { select: { category: true } },
      },
    });
    if (!project) return apiErrors.notFound('프로젝트를 찾을 수 없음');

    const memberIds = collectProjectMemberIds(project.team);
    const [users, userId] = await Promise.all([
      memberIds.length
        ? prisma.user.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, name: true, memberType: true, major: true, profileImage: true },
          })
        : Promise.resolve([]),
      findScrapUserId(),
    ]);

    const scrap = userId
      ? await prisma.scrap.findFirst({ where: { userId, projectId }, select: { id: true } })
      : null;

    return apiSuccess({
      project: {
        projectId: project.id,
        title: project.title,
        teamId: project.teamId,
        teamName: project.team.teamName,
        yearId: project.yearId,
        year: Number(project.projectYear.year),
        categoryId: project.categoryId,
        category: project.category.category,
        thumbnailUrl: normalizeImageUrl(project.thumbnailUrl),
        detailUrl: normalizeImageUrl(project.detailUrl),
        projectUrl: `${new URL(request.url).origin}/archive/projects/${project.id}`,
        isScrap: Boolean(scrap),
        members: buildProjectMembers(project.team, users),
      },
    });
  } catch (error) {
    console.error('[v2/archive/projects/:id] GET error:', error);
    return apiErrors.serverError();
  }
}
