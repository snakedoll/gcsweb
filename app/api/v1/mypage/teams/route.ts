import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';
import { apiError, apiErrors } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized('로그인이 필요한 서비스입니다.');
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return apiErrors.unauthorized('사용자를 찾을 수 없습니다.');
    }

    // 사용자가 대표인 팀 + 멤버로 포함된 팀 모두 조회
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { userId: user.id },
          { teamMember: { has: user.id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        teamName: true,
        userId: true,
        representativeName: true,
        teamMember: true,
        accountUrl: true,
        isSalesTeam: true,
      },
    });

    const result = [];
    for (const t of teams) {
      const memberIds = Array.isArray(t.teamMember) ? t.teamMember : [];
      const uniqueIds = Array.from(new Set([...memberIds, t.userId]));

      const users = await prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, name: true, phone: true },
      });

      const usersById = new Map(users.map((u) => [u.id, u]));
      const members = [];

      // 대표 먼저
      const leader = usersById.get(t.userId);
      if (leader) {
        members.push({ role: '대표', name: leader.name, phone: leader.phone ?? '' });
      }

      // 나머지 팀원
      for (const id of memberIds) {
        if (id === t.userId) continue;
        const u = usersById.get(id);
        if (u) {
          members.push({ role: '팀원', name: u.name, phone: u.phone ?? '' });
        }
      }

      result.push({
        id: t.id,
        name: t.teamName,
        type: t.isSalesTeam ? '판매팀' : '일반팀',
        members,
        accountUrl: t.accountUrl || null,
      });
    }

    return NextResponse.json({
      status: 'success',
      data: { teams: result },
    });
  } catch (error: any) {
    console.error('My teams error:', error);
    return apiErrors.serverError('서버 오류가 발생했습니다.');
  }
}
