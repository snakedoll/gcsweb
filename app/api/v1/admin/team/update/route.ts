import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function PATCH(request: Request) {
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
    const { teamId, teamType, teamName, leaderId, memberIds, accountUrl } = body as {
      teamId?: string;
      teamType?: number;
      teamName?: string;
      leaderId?: string | null;
      memberIds?: string[];
      accountUrl?: string | null;
    };

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'teamId는 필수입니다.' }, { status: 400 });
    }

    // Fetch existing team
    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) {
      return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: '존재하지 않는 팀입니다.' }, { status: 400 });
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
        // clear leader -> keep existing owner? for safety, disallow null leader when teamType is seller
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
      try { new URL(accountUrl); } catch { return NextResponse.json({ status: 'error', code: 'INVALID_INPUT', message: 'accountUrl이 올바른 URL이 아닙니다.' }, { status: 400 }); }
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
      // build nicknames array aligned
      const foundMembers = await prisma.user.findMany({ where: { id: { in: uniqueMemberIds } }, select: { id: true, nickname: true } });
      const byId = new Map(foundMembers.map((u: any) => [u.id, u]));
      data.teamMember = uniqueMemberIds;
      data.teamMemberNickname = uniqueMemberIds.map((id) => byId.get(id)?.nickname ?? '');
    }

    if (accountUrl !== undefined) {
      data.accountUrl = accountUrl || '';
    }

    // If teamType changed, maybe clear accountUrl when switching to general
    if (teamType !== undefined) {
      // store nothing in team record for teamType field (schema doesn't have explicit teamType)
      if (teamType === 0 && accountUrl === undefined) {
        // switching to general, clear accountUrl
        data.accountUrl = '';
      }
    }

    // Apply update
    const updated = await prisma.team.update({ where: { id: teamId }, data });

    // Determine final memberIds for response
    const finalMemberIds = uniqueMemberIds ?? updated.teamMember ?? [];
    const finalLeaderId = leaderId !== undefined ? (leaderId ?? null) : updated.userId;

    const memberCount = (finalMemberIds.filter((id: string) => id !== finalLeaderId)).length;

    const responseTeam = {
      id: updated.id,
      teamName: updated.teamName,
      teamType: teamType !== undefined ? teamType : (updated.accountUrl ? 1 : 0),
      leaderId: finalLeaderId,
      memberIds: finalMemberIds,
      accountUrl: updated.accountUrl || null,
      memberCount,
    };

    return NextResponse.json({ status: 'success', data: { team: responseTeam } });
  } catch (error: any) {
    console.error('Admin team update error:', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 내부 로직 오류' }, { status: 500 });
  }
}
