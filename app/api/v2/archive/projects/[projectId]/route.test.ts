// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { GET } from './route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  prisma: {
    project: { updateMany: vi.fn(), findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    scrap: { findFirst: vi.fn() },
  },
}));

type Fn = ReturnType<typeof vi.fn>;
const session = getServerSession as unknown as Fn;
const project = prisma.project as unknown as Record<'updateMany' | 'findUnique', Fn>;
const user = prisma.user as unknown as Record<'findMany', Fn>;
const scrap = prisma.scrap as unknown as Record<'findFirst', Fn>;

const call = (projectId = 'p1') =>
  GET(new Request(`http://localhost:3000/api/v2/archive/projects/${projectId}`), { params: { projectId } });

const PROJECT = {
  id: 'p1',
  title: '2027 불교박람회',
  teamId: 't1',
  yearId: 'y1',
  categoryId: 'c1',
  thumbnailUrl: 'https://cdn.example.com/t.png',
  detailUrl: 'https://cdn.example.com/d.png',
  team: { teamName: '개발팀', userId: 'lead', representativeNickname: '대표닉', teamMember: ['m1'], teamMemberNickname: ['닉1'] },
  projectYear: { year: 2027 },
  category: { category: '불교박람회' },
};

beforeEach(() => {
  vi.resetAllMocks();
  session.mockResolvedValue(null);
  project.updateMany.mockResolvedValue({ count: 1 });
  project.findUnique.mockResolvedValue(PROJECT);
  user.findMany.mockResolvedValue([
    { id: 'lead', name: '배민영', memberType: 1, major: '산업시스템공학과', profileImage: 'https://cdn.example.com/1.png' },
  ]);
  scrap.findFirst.mockResolvedValue(null);
});

describe('GET /api/v2/archive/projects/{projectId}', () => {
  it('공개·미삭제가 아니면(갱신 0건) 404 NOT_FOUND', async () => {
    project.updateMany.mockResolvedValue({ count: 0 });
    const res = await call();
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('NOT_FOUND');
    expect(project.findUnique).not.toHaveBeenCalled();
  });

  it('공개·미삭제 조건으로 viewCount를 올린다', async () => {
    await call();
    expect(project.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', isPublic: true, softDeletedAt: null },
      data: { viewCount: { increment: 1 } },
    });
  });

  it('프로젝트 필드와 members를 내려준다', async () => {
    const body = await (await call()).json();
    expect(body.status).toBe('success');
    expect(body.data.project).toMatchObject({
      projectId: 'p1',
      teamName: '개발팀',
      year: 2027,
      category: '불교박람회',
      projectUrl: 'http://localhost:3000/archive/projects/p1',
      isScrap: false,
    });
    expect(body.data.project.members).toEqual([
      {
        memberId: 'lead',
        isRepresentative: true,
        name: '배민영',
        memberType: 1,
        major: '산업시스템공학과',
        displayLabel: '배민영 / 산업시스템공학과',
        profileImageUrl: 'https://cdn.example.com/1.png',
      },
      { memberId: 'm1', isRepresentative: false, name: '닉1', memberType: 0, major: null, displayLabel: '닉1', profileImageUrl: null },
    ]);
  });

  it('비로그인이면 스크랩을 조회하지 않는다', async () => {
    await call();
    expect(scrap.findFirst).not.toHaveBeenCalled();
  });

  it('로그인 회원이 스크랩했으면 isScrap true', async () => {
    session.mockResolvedValue({ user: { id: 'u9' } });
    scrap.findFirst.mockResolvedValue({ id: 's1' });
    const body = await (await call()).json();
    expect(scrap.findFirst).toHaveBeenCalledWith({ where: { userId: 'u9', projectId: 'p1' }, select: { id: true } });
    expect(body.data.project.isScrap).toBe(true);
  });

  it('세션 확인이 실패해도 비로그인으로 200', async () => {
    session.mockRejectedValue(new Error('boom'));
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).data.project.isScrap).toBe(false);
  });

  it('DB 오류면 500 SERVER_ERROR', async () => {
    project.updateMany.mockRejectedValue(new Error('db down'));
    const res = await call();
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('SERVER_ERROR');
  });
});
