import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';

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
        team: {
          select: {
            teamName: true,
            userId: true,
            representativeName: true,
            representativeNickname: true,
            teamMember: true,
            teamMemberNickname: true,
          },
        },
        projectYear: { select: { year: true } },
        category: { select: { category: true } },
      },
    });

    const rawMemberIds: string[] = Array.isArray(project.team?.teamMember)
      ? project.team.teamMember.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const leaderId = typeof project.team?.userId === 'string' ? project.team.userId : '';
    const uniqueUserIds = Array.from(new Set([leaderId, ...rawMemberIds].filter(Boolean)));

    const teamUsers = uniqueUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uniqueUserIds } },
          select: {
            id: true,
            name: true,
            nickname: true,
            major: true,
            profileImage: true,
          },
        })
      : [];
    const usersById = new Map(teamUsers.map((user) => [user.id, user]));

    const members: Array<{
      userId: string | null;
      role: '대표' | '팀원';
      name: string | null;
      nickname: string | null;
      major: string | null;
      profileImage: string | null;
      isRepresentative: boolean;
    }> = [];

    if (leaderId) {
      const leader = usersById.get(leaderId);
      members.push({
        userId: leaderId,
        role: '대표',
        name: leader?.name ?? project.team?.representativeName ?? null,
        nickname: leader?.nickname ?? project.team?.representativeNickname ?? null,
        major: leader?.major ?? null,
        profileImage: normalizeImageUrl(leader?.profileImage ?? null),
        isRepresentative: true,
      });
    }

    for (let i = 0; i < rawMemberIds.length; i += 1) {
      const memberId = rawMemberIds[i];
      if (!memberId || memberId === leaderId) continue;

      const user = usersById.get(memberId);
      const fallbackNickname =
        Array.isArray(project.team?.teamMemberNickname) && typeof project.team.teamMemberNickname[i] === 'string'
          ? project.team.teamMemberNickname[i]
          : null;

      members.push({
        userId: memberId,
        role: '팀원',
        name: user?.name ?? fallbackNickname,
        nickname: user?.nickname ?? fallbackNickname,
        major: user?.major ?? null,
        profileImage: normalizeImageUrl(user?.profileImage ?? null),
        isRepresentative: false,
      });
    }

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
          thumbnailUrl: normalizeImageUrl(project.thumbnailUrl),
          detailUrl: normalizeImageUrl(project.detailUrl),
          projectUrl,
          isScrap,
          members,
        },
      },
    });
  } catch (error) {
    console.error('Archive project detail error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
