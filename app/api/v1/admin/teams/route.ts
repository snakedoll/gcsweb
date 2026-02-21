import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '토큰이 없거나 만료되었습니다.' },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!adminUser || Number(adminUser.memberType) !== 2) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '접근 권한이 없습니다.' },
        { status: 401 }
      );
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
          members.push({ role: '대표', name: leaderUser.name, phone: leaderUser.phone ?? null });
        } else {
          members.push({ role: '대표', name: t.representativeName ?? t.representativeNickname ?? null, phone: null });
        }
      }

      // other members
      if (Array.isArray(memberIds) && memberIds.length) {
        for (let i = 0; i < memberIds.length; i++) {
          const id = memberIds[i];
          if (!id || id === t.userId) continue; // skip leader duplicate
          const u = usersById.get(id);
          if (u) members.push({ role: '팀원', name: u.name, phone: u.phone ?? null });
          else members.push({ role: '팀원', name: (t.teamMemberNickname && t.teamMemberNickname[i]) ?? null, phone: null });
        }
      }

      // teamType: 0 = general, 1 = seller (accountUrl가 있으면 판매팀)
      const teamType = t.accountUrl ? 1 : 0;

      result.push({
        id: t.id,
        teamName: t.teamName,
        teamType,
        accountUrl: t.accountUrl ?? null,
        members,
      });
    }

    return NextResponse.json({ status: 'success', data: { totalCount, teams: result } });
  } catch (error: any) {
    console.error('Admin teams list error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '토큰이 만료되었거나 유효하지 않습니다.' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!adminUser || Number(adminUser.memberType) !== 2) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '접근 권한이 없습니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { teamType, teamName, leaderId, memberIds, accountUrl } = body as {
      teamType?: number;
      teamName?: string;
      leaderId?: string | null;
      memberIds?: string[];
      accountUrl?: string | null;
    };

    if (typeof teamType !== 'number' || ![0, 1].includes(teamType)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'teamType은 0 또는 1이어야 합니다.' }, { status: 400 });
    }
    if (!teamName || typeof teamName !== 'string') {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'teamName은 필수입니다.' }, { status: 400 });
    }
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'memberIds는 최소 한 명 이상의 ID를 포함해야 합니다.' }, { status: 400 });
    }

    if (teamType === 1) {
      // seller: leaderId and accountUrl required
      if (!leaderId || typeof leaderId !== 'string') {
        return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: '판매팀 등록에는 leaderId가 필요합니다.' }, { status: 400 });
      }
      if (!accountUrl || typeof accountUrl !== 'string') {
        return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: '판매팀 등록에는 accountUrl이 필요합니다.' }, { status: 400 });
      }
      try { new URL(accountUrl); } catch { return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'accountUrl이 올바른 URL이 아닙니다.' }, { status: 400 }); }
    }

    // Validate members exist
    const uniqueMemberIds = Array.from(new Set(memberIds));
    const foundMembers = await prisma.user.findMany({ where: { id: { in: uniqueMemberIds } }, select: { id: true, name: true, nickname: true } });
    if (foundMembers.length !== uniqueMemberIds.length) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'memberIds 중 존재하지 않는 사용자가 있습니다.' }, { status: 400 });
    }

    // If leaderId provided, validate exists and not duplicated in memberIds
    let ownerId = memberIds[0];
    let representativeName = null as string | null;
    let representativeNickname = null as string | null;
    if (leaderId) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId }, select: { id: true, name: true, nickname: true } });
      if (!leader) return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'leaderId에 해당하는 사용자가 없습니다.' }, { status: 400 });
      ownerId = leaderId;
      representativeName = leader.name;
      representativeNickname = leader.nickname ?? null;
    } else {
      // choose first member as representative for general team
      const first = await prisma.user.findUnique({ where: { id: uniqueMemberIds[0] }, select: { name: true, nickname: true } });
      representativeName = first?.name ?? null;
      representativeNickname = first?.nickname ?? null;
      ownerId = uniqueMemberIds[0];
    }

    // Prepare teamMemberNicknames aligned with memberIds order
    const membersById = new Map(foundMembers.map((u: any) => [u.id, u]));
    const memberNicknames = uniqueMemberIds.map((id) => membersById.get(id)?.nickname ?? null);

    // accountUrl stored as empty string for non-seller (schema requires string)
    const storedAccountUrl = accountUrl && typeof accountUrl === 'string' ? accountUrl : '';

    const created = await prisma.team.create({
      data: {
        userId: ownerId,
        teamName,
        representativeName: representativeName ?? '',
        representativeNickname: representativeNickname ?? '',
        teamMember: uniqueMemberIds,
        teamMemberNickname: memberNicknames,
        accountUrl: storedAccountUrl,
      },
    });

    const responseTeam: any = {
      id: created.id,
      teamName: created.teamName,
      teamType,
      leaderId: leaderId ?? null,
      memberIds: uniqueMemberIds,
      accountUrl: storedAccountUrl || null,
      memberCount: uniqueMemberIds.length,
    };

    return NextResponse.json({ status: 'success', data: { team: responseTeam } });
  } catch (error: any) {
    console.error('Admin team add error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 로직 오류' }, { status: 500 });
  }
}
