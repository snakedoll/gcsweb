import { normalizeImageUrl } from '@/lib/image-url';

export const MAJOR_MEMBER_TYPE = 1;

export type ProjectMemberUser = {
  id: string;
  name: string | null;
  memberType: number;
  major: string | null;
  profileImage: string | null;
};

export type ProjectMemberTeam = {
  userId: string;
  representativeNickname: string;
  teamMember: string[];
  teamMemberNickname: string[];
};

export type ProjectMember = {
  memberId: string;
  isRepresentative: boolean;
  name: string;
  memberType: number;
  major: string | null;
  displayLabel: string;
  profileImageUrl: string | null;
};

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** 대표·팀원 회원 ID를 중복 없이, 대표 먼저 모은다. */
export function collectProjectMemberIds(team: ProjectMemberTeam): string[] {
  return Array.from(new Set([team.userId, ...team.teamMember].filter(nonEmpty)));
}

function toMember(
  memberId: string,
  isRepresentative: boolean,
  user: ProjectMemberUser | undefined,
  fallbackName: string | undefined,
): ProjectMember {
  const name = (nonEmpty(user?.name) ? user.name : fallbackName)?.trim() ?? '';
  const memberType = user?.memberType ?? 0;
  const major = memberType === MAJOR_MEMBER_TYPE && nonEmpty(user?.major) ? user.major.trim() : null;
  return {
    memberId,
    isRepresentative,
    name,
    memberType,
    major,
    displayLabel: major ? `${name} / ${major}` : name,
    profileImageUrl: normalizeImageUrl(user?.profileImage ?? null),
  };
}

/**
 * v2 아카이브 상세의 팀원 목록. 대표가 맨 앞, 이후 Team.teamMember 순서.
 * 회원 정보가 없으면(탈퇴 등) 팀에 저장된 닉네임을 이름으로 쓰고 memberType 0으로 둔다.
 */
export function buildProjectMembers(team: ProjectMemberTeam, users: ProjectMemberUser[]): ProjectMember[] {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const members: ProjectMember[] = [];
  const seen = new Set<string>();

  if (nonEmpty(team.userId)) {
    members.push(toMember(team.userId, true, usersById.get(team.userId), team.representativeNickname));
    seen.add(team.userId);
  }

  team.teamMember.forEach((memberId, index) => {
    if (!nonEmpty(memberId) || seen.has(memberId)) return;
    seen.add(memberId);
    members.push(toMember(memberId, false, usersById.get(memberId), team.teamMemberNickname[index]));
  });

  return members;
}
