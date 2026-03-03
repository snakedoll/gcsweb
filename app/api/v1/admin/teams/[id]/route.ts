import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        teamName: true,
        userId: true,
        representativeName: true,
        representativeNickname: true,
        teamMember: true,
        teamMemberNickname: true,
        accountUrl: true,
        isSalesTeam: true,
        totalSales: true,
        createdAt: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: '팀을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Resolve member user info where possible
    const memberIds: string[] = Array.isArray(team.teamMember) ? team.teamMember.filter(Boolean) : [];
    const uniqueIds = Array.from(new Set([...(memberIds ?? []), team.userId]));

    const users = uniqueIds.length
      ? await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true, phone: true } })
      : [];

    const usersById = new Map(users.map((u: any) => [u.id, u]));

    const members: any[] = [];

    // leader: userId
    if (team.userId) {
      const leaderUser = usersById.get(team.userId);
      if (leaderUser) {
        members.push({ role: '대표', id: leaderUser.id, name: leaderUser.name, phone: leaderUser.phone ?? null });
      } else {
        members.push({ role: '대표', id: team.userId, name: team.representativeName ?? team.representativeNickname ?? null, phone: null });
      }
    }

    // other members
    if (Array.isArray(memberIds) && memberIds.length) {
      for (let i = 0; i < memberIds.length; i++) {
        const id = memberIds[i];
        if (!id || id === team.userId) continue; // skip leader duplicate
        const u = usersById.get(id);
        const fallbackName = Array.isArray(team.teamMemberNickname) && team.teamMemberNickname.length > i 
          ? team.teamMemberNickname[i] 
          : null;
        if (u) members.push({ role: '팀원', id: u.id, name: u.name, phone: u.phone ?? null });
        else members.push({ role: '팀원', id: id, name: fallbackName, phone: null });
      }
    }

    const teamType = team.isSalesTeam ? 1 : 0;

    const data = {
      id: team.id,
      teamName: team.teamName,
      teamType,
      accountUrl: normalizeImageUrl(team.accountUrl ?? null),
      totalSales: team.totalSales ?? null,
      createdAt: team.createdAt,
      members,
    };

    return NextResponse.json({ status: 'success', data });
  } catch (error: any) {
    console.error('Admin team detail error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '토큰이 없거나 만료되었습니다.' }, { status: 401 });
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

    // Fetch existing team
    const existing = await prisma.team.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: '팀을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Validate provided fields
    if (teamType !== undefined && ![0, 1].includes(teamType)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'teamType은 0 또는 1이어야 합니다.' }, { status: 400 });
    }

    if (memberIds !== undefined && (!Array.isArray(memberIds) || memberIds.length === 0)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'memberIds는 최소 한 명 이상이어야 합니다.' }, { status: 400 });
    }

    if (leaderId !== undefined && leaderId !== null && typeof leaderId !== 'string') {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'leaderId 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    if (accountUrl !== undefined && accountUrl !== null && typeof accountUrl !== 'string') {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'accountUrl 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    // If memberIds provided, validate users exist
    let uniqueMemberIds: string[] | undefined = undefined;
    if (memberIds !== undefined) {
      uniqueMemberIds = Array.from(new Set(memberIds));
      const foundMembers = await prisma.user.findMany({ where: { id: { in: uniqueMemberIds } }, select: { id: true } });
      if (foundMembers.length !== uniqueMemberIds.length) {
        return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'memberIds 중 존재하지 않는 사용자가 있습니다.' }, { status: 400 });
      }
    }

    // If leaderId provided, validate exists
    let newOwnerId = existing.userId;
    let representativeName = existing.representativeName ?? '';
    let representativeNickname = existing.representativeNickname ?? '';
    if (leaderId !== undefined) {
      if (leaderId === null) {
        newOwnerId = existing.userId;
      } else {
        const leader = await prisma.user.findUnique({ where: { id: leaderId }, select: { id: true, name: true, nickname: true } });
        if (!leader) return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'leaderId에 해당하는 사용자가 없습니다.' }, { status: 400 });
        newOwnerId = leader.id;
        representativeName = leader.name ?? '';
        representativeNickname = leader.nickname ?? '';
      }
    }

    // If accountUrl provided and non-null, validate URL format
    if (accountUrl !== undefined && accountUrl !== null) {
      if (!accountUrl.trim().startsWith('/')) {
        try { new URL(accountUrl); } catch { return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'accountUrl이 올바른 URL이 아닙니다.' }, { status: 400 }); }
      }
    }

    // Prepare update payload
    const data: any = {};
    if (teamName !== undefined) data.teamName = teamName;
    if (leaderId !== undefined) {
      data.userId = newOwnerId;
      data.representativeName = representativeName;
      data.representativeNickname = representativeNickname;
    }
    if (uniqueMemberIds !== undefined) {
      const foundMembers = await prisma.user.findMany({ where: { id: { in: uniqueMemberIds } }, select: { id: true, nickname: true } });
      const byId = new Map(foundMembers.map((u: any) => [u.id, u]));
      data.teamMember = uniqueMemberIds;
      data.teamMemberNickname = uniqueMemberIds.map((id) => byId.get(id)?.nickname ?? '');
    }

    if (accountUrl !== undefined) {
      data.accountUrl = accountUrl ? (normalizeImageUrl(accountUrl) ?? accountUrl) : '';
    }

    if (teamType !== undefined) {
      data.isSalesTeam = teamType === 1;
      if (teamType === 0 && accountUrl === undefined) {
        data.accountUrl = '';
      }
    }

    const updated = await prisma.team.update({ where: { id: params.id }, data });

    const finalMemberIds = uniqueMemberIds ?? updated.teamMember ?? [];
    const finalLeaderId = leaderId !== undefined ? (leaderId ?? null) : updated.userId;

    const isNowSalesTeam = teamType !== undefined ? teamType === 1 : updated.isSalesTeam;
    if (isNowSalesTeam) {
       const allTeamMemberIds = Array.from(new Set([...finalMemberIds, finalLeaderId].filter(Boolean) as string[]));
       await prisma.user.updateMany({
         where: { id: { in: allTeamMemberIds } },
         data: { isSeller: true },
       });
    }

    const responseTeam = {
      id: updated.id,
      teamName: updated.teamName,
      teamType: teamType !== undefined ? teamType : (updated.isSalesTeam ? 1 : 0),
      leaderId: finalLeaderId,
      memberIds: finalMemberIds,
      accountUrl: normalizeImageUrl(updated.accountUrl || null),
      memberCount: finalMemberIds.length,
    };

    return NextResponse.json({ status: 'success', data: { team: responseTeam } });
  } catch (error: any) {
    console.error('Admin team update error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 로직 오류' }, { status: 500 });
  }
}
