import { describe, expect, it } from 'vitest';
import { buildProjectMembers, collectProjectMemberIds, type ProjectMemberTeam, type ProjectMemberUser } from './project-members';

const team = (overrides: Partial<ProjectMemberTeam> = {}): ProjectMemberTeam => ({
  userId: 'lead',
  representativeNickname: '대표닉',
  teamMember: ['m1', 'm2'],
  teamMemberNickname: ['닉1', '닉2'],
  ...overrides,
});

const user = (id: string, overrides: Partial<ProjectMemberUser> = {}): ProjectMemberUser => ({
  id,
  name: `이름-${id}`,
  memberType: 0,
  major: null,
  profileImage: null,
  ...overrides,
});

describe('collectProjectMemberIds', () => {
  it('대표를 먼저, 중복과 빈 값 없이 모은다', () => {
    expect(collectProjectMemberIds(team({ teamMember: ['m1', 'lead', '', 'm1'] }))).toEqual(['lead', 'm1']);
  });
});

describe('buildProjectMembers', () => {
  it('대표가 맨 앞이고 팀원은 teamMember 순서다', () => {
    const members = buildProjectMembers(team(), [user('m2'), user('lead'), user('m1')]);
    expect(members.map((m) => [m.memberId, m.isRepresentative])).toEqual([
      ['lead', true],
      ['m1', false],
      ['m2', false],
    ]);
  });

  it('대표가 팀원 배열에도 있으면 한 번만 넣는다', () => {
    const members = buildProjectMembers(team({ teamMember: ['lead', 'm1'] }), [user('lead'), user('m1')]);
    expect(members.map((m) => m.memberId)).toEqual(['lead', 'm1']);
  });

  it('전공회원이고 전공이 있으면 "이름 / 전공" 라벨을 쓴다', () => {
    const [lead] = buildProjectMembers(team({ teamMember: [] }), [
      user('lead', { name: '배민영', memberType: 1, major: '산업시스템공학과' }),
    ]);
    expect(lead).toMatchObject({ major: '산업시스템공학과', displayLabel: '배민영 / 산업시스템공학과', memberType: 1 });
  });

  it('일반회원이면 전공이 저장돼 있어도 major는 null, 라벨은 이름만', () => {
    const [lead] = buildProjectMembers(team({ teamMember: [] }), [user('lead', { name: '김도환', major: '디자인학과' })]);
    expect(lead).toMatchObject({ major: null, displayLabel: '김도환' });
  });

  it('전공회원이어도 전공이 없으면 이름만', () => {
    const [lead] = buildProjectMembers(team({ teamMember: [] }), [user('lead', { name: '배민영', memberType: 1 })]);
    expect(lead).toMatchObject({ major: null, displayLabel: '배민영' });
  });

  it('회원 정보가 없으면 팀에 저장된 닉네임과 memberType 0을 쓴다', () => {
    const members = buildProjectMembers(team(), [user('m1')]);
    expect(members[0]).toMatchObject({ memberId: 'lead', name: '대표닉', memberType: 0, major: null, profileImageUrl: null });
    expect(members[2]).toMatchObject({ memberId: 'm2', name: '닉2', displayLabel: '닉2' });
  });

  it('프로필 이미지 URL을 정규화해서 내려준다', () => {
    const [lead] = buildProjectMembers(team({ teamMember: [] }), [
      user('lead', { profileImage: 'http://localhost:3000/uploads/a.png' }),
    ]);
    expect(lead.profileImageUrl).toBe('/uploads/a.png');
  });
});
