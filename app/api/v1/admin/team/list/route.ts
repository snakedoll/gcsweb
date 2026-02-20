import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '토큰이 없거나 만료되었습니다.' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!adminUser || Number(adminUser.memberType) !== 2) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '접근 권한이 없습니다.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const name = url.searchParams.get('name') ?? '';

    const where: any = {};
    if (name.trim().length) {
      where.teamName = { contains: name.trim(), mode: 'insensitive' };
    }

    const totalCount = await prisma.team.count({ where });

    const teams = await prisma.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        teamName: true,
        userId: true,
        representativeName: true,
        representativeNickname: true,
        teamMember: true,
        teamMemberNickname: true,
        accountUrl: true,
      },
    });

    // Resolve member user info where possible
    const result = [] as any[];
    for (const t of teams) {
      const memberIds: string[] = Array.isArray(t.teamMember) ? t.teamMember.filter(Boolean) : [];
      // include owner(userId) to fetch leader info
      const uniqueIds = Array.from(new Set([...(memberIds ?? []), t.userId]));

      const users = uniqueIds.length
        ? await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true, phone: true } })
        : [];

      const usersById = new Map(users.map((u: any) => [u.id, u]));

      const members: any[] = [];

      // leader: userId
      if (t.userId) {
        const leaderUser = usersById.get(t.userId);
        if (leaderUser) {
          members.push({ isLeader: true, name: leaderUser.name, phone: leaderUser.phone ?? null });
        } else {
          members.push({ isLeader: true, name: t.representativeName ?? t.representativeNickname ?? null, phone: null });
        }
      }

      // other members
      if (Array.isArray(memberIds) && memberIds.length) {
        for (let i = 0; i < memberIds.length; i++) {
          const id = memberIds[i];
          if (!id || id === t.userId) continue; // skip leader duplicate
          const u = usersById.get(id);
          if (u) members.push({ isLeader: false, name: u.name, phone: u.phone ?? null });
          else members.push({ isLeader: false, name: (t.teamMemberNickname && t.teamMemberNickname[i]) ?? null, phone: null });
        }
      }

      const teamType = t.accountUrl ? 1 : 0;

      result.push({ id: t.id, teamName: t.teamName, teamType, accountUrl: t.accountUrl ?? null, members });
    }

    return NextResponse.json({ status: 'success', data: { totalCount, teams: result } });
  } catch (error: any) {
    console.error('Admin team list error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' }, { status: 500 });
  }
}
