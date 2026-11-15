// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { GET } from './route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  prisma: { scrap: { count: vi.fn(), findMany: vi.fn() } },
}));

type Fn = ReturnType<typeof vi.fn>;
const session = getServerSession as unknown as Fn;
const scrap = prisma.scrap as unknown as Record<'count' | 'findMany', Fn>;

const call = (qs = '') => GET(new Request(`http://localhost:3000/api/v2/mypage/scraps/project${qs}`));

const row = (id: string) => ({
  project: {
    id,
    title: `프로젝트 ${id}`,
    thumbnailUrl: 'https://cdn.example.com/t.png',
    team: { teamName: '개발팀' },
    projectYear: { year: 2027 },
    category: { category: '불교박람회' },
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  session.mockResolvedValue({ user: { id: 'u1' } });
  scrap.count.mockResolvedValue(1);
  scrap.findMany.mockResolvedValue([row('p1')]);
});

describe('GET /api/v2/mypage/scraps/project', () => {
  it('로그인하지 않으면 401', async () => {
    session.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(scrap.findMany).not.toHaveBeenCalled();
  });

  it('공개·미삭제 프로젝트만 조회하고 totalCount도 같은 조건으로 센다', async () => {
    await call();
    const where = { userId: 'u1', project: { isPublic: true, softDeletedAt: null } };
    expect(scrap.count).toHaveBeenCalledWith({ where });
    expect(scrap.findMany.mock.calls[0][0].where).toEqual(where);
  });

  it('팀명·연도·카테고리를 채워 돌려준다', async () => {
    const { data } = await (await call()).json();
    expect(data).toMatchObject({ totalCount: 1, hasNext: false, page: 1, size: 20 });
    expect(data.projects).toEqual([
      {
        projectId: 'p1',
        title: '프로젝트 p1',
        teamName: '개발팀',
        year: 2027,
        category: '불교박람회',
        thumbnailUrl: 'https://cdn.example.com/t.png',
      },
    ]);
  });

  it('size+1개를 읽어 다음 페이지 여부를 정하고 size개만 돌려준다', async () => {
    scrap.findMany.mockResolvedValue([row('p1'), row('p2'), row('p3')]);
    const { data } = await (await call('?page=2&size=2')).json();
    expect(scrap.findMany.mock.calls[0][0]).toMatchObject({ skip: 2, take: 3 });
    expect(data.hasNext).toBe(true);
    expect(data.projects.map((p: { projectId: string }) => p.projectId)).toEqual(['p1', 'p2']);
  });

  it.each(['?page=0', '?size=0', '?size=51', '?page=abc'])('잘못된 조회 조건(%s)은 400', async (qs) => {
    const res = await call(qs);
    expect(res.status).toBe(400);
    expect(scrap.findMany).not.toHaveBeenCalled();
  });

  it('DB 오류면 500', async () => {
    scrap.findMany.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await call()).status).toBe(500);
  });
});
