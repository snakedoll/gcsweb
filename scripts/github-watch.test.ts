// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ciLine, commitsToReport, isMainMergeCommit, reviewLine } from './github-watch.mjs';

type Commit = { sha: string };
const shas = (commits: Commit[]) => commits.map((c) => c.sha);

const commit = (sha: string, login: string, message = `${sha} 작업`) => ({
  sha,
  author: { login },
  commit: { message, author: { name: login, date: '2026-11-12T04:00:00Z' } },
});

describe('commitsToReport', () => {
  const mainShas = new Set(['m1', 'm2']);

  it('작업 브랜치: 이미 main 에 있는 커밋과 main 을 합친 머지 커밋은 알리지 않는다', () => {
    const commits = [
      commit('m1', 'snakedoll'),
      commit('m2', 'snakedoll'),
      commit('x1', 'snakedoll', "Merge remote-tracking branch 'origin/main' into minyoung/41-order-no"),
      commit('x2', 'snakedoll', 'feat(qrshop): 결제 확정 때 주문번호 발급'),
    ];
    const result = commitsToReport(commits, { me: 'amophi', mainShas, branch: 'minyoung/41-order-no' });
    expect(shas(result)).toEqual(['x2']);
  });

  it('내 커밋은 어느 브랜치든 알리지 않는다', () => {
    const commits = [commit('a1', 'amophi'), commit('b1', 'junyoung-code')];
    expect(shas(commitsToReport(commits, { me: 'amophi', mainShas, branch: 'main' }))).toEqual(['b1']);
    expect(shas(commitsToReport(commits, { me: 'amophi', mainShas, branch: 'JunYoung' }))).toEqual(['b1']);
  });

  it('main 자체의 새 커밋은 main 커밋 목록에 있어도 알린다', () => {
    const result = commitsToReport([commit('m1', 'snakedoll')], { me: 'amophi', mainShas, branch: 'main' });
    expect(shas(result)).toEqual(['m1']);
  });
});

describe('isMainMergeCommit', () => {
  it.each([
    "Merge remote-tracking branch 'origin/main' into dohwan/33-staff-orders",
    "Merge branch 'main' into mybae",
    "Merge branch 'main'",
  ])('main 을 합친 커밋: %s', (message) => {
    expect(isMainMergeCommit(message)).toBe(true);
  });

  it.each(['Merge pull request #37 from snakedoll/minyoung/36-archive-detail', "Merge branch 'MinYoung' into mybae", 'feat: 기능'])(
    '아님: %s',
    (message) => {
      expect(isMainMergeCommit(message)).toBe(false);
    },
  );
});

describe('ciLine', () => {
  const run = (conclusion: string) => ({ conclusion, workflowName: 'CI', headBranch: 'main', displayTitle: 'Merge pull request #39' });

  it('성공은 ★ 없이', () => {
    expect(ciLine(run('success'))).toBe('CI CI main → success: Merge pull request #39');
  });

  it.each(['failure', 'timed_out', 'startup_failure', 'action_required'])('%s 는 ★', (conclusion) => {
    expect(ciLine(run(conclusion))).toMatch(/^CI ★ /);
  });

  it('취소는 실패로 보지 않는다(같은 브랜치의 새 실행으로 대체됨)', () => {
    const line = ciLine(run('cancelled'));
    expect(line).not.toContain('★');
    expect(line).toContain('취소됨(새 실행으로 대체)');
  });
});

describe('reviewLine', () => {
  const review = (state: string, login = 'snakedoll', body = '아래만 반영 부탁드려요') => ({
    id: 1,
    state,
    body,
    user: { login },
    submitted_at: '2026-11-12T05:01:00Z',
  });
  const ctx = (prAuthor: string) => ({ me: 'amophi', prNumber: '35', prAuthor, title: 'feat(qrshop): 직원 관리' });

  it('내 PR 에 온 변경 요청은 ★ 와 함께 알린다', () => {
    expect(reviewLine(review('CHANGES_REQUESTED'), ctx('amophi'))).toBe(
      '★ 11-12 14:01 snakedoll PR #35 리뷰 변경 요청: feat(qrshop): 직원 관리 — 아래만 반영 부탁드려요',
    );
  });

  it('남의 PR 리뷰는 ★ 없이', () => {
    expect(reviewLine(review('APPROVED', 'junyoung-code', ''), ctx('snakedoll'))).toBe(
      '11-12 14:01 junyoung-code PR #35 리뷰 승인: feat(qrshop): 직원 관리',
    );
  });

  it.each([
    ['내가 쓴 리뷰', review('APPROVED', 'amophi')],
    ['제출 전 리뷰', review('PENDING')],
    ['철회된 리뷰', review('DISMISSED')],
    ['본문 없는 단순 의견(코드 댓글만 단 경우)', review('COMMENTED', 'snakedoll', '')],
  ])('%s 는 알리지 않는다', (_name, rv) => {
    expect(reviewLine(rv, ctx('amophi'))).toBeNull();
  });
});
