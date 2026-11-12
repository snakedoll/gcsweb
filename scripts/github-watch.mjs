#!/usr/bin/env node
/**
 * GitHub 변경 감시. 팀원 에이전트가 5분마다 저장소 변경을 확인하는 데 쓴다(CLAUDE.md 「GitHub 감시」).
 *
 *   node scripts/github-watch.mjs                  한 번 확인하고 새로 바뀐 것만 출력
 *   node scripts/github-watch.mjs --loop           5분마다 확인 (Claude Code Monitor, 터미널용)
 *   node scripts/github-watch.mjs --session-start  Claude Code SessionStart hook용 JSON 출력
 *
 * 보는 것: 브랜치 push(커밋 메시지)·생성·삭제, 이슈·PR 생성/닫힘/머지/라벨/담당/Draft 전환,
 * 새 댓글, 나에게 온 리뷰 요청, 끝난 CI. 내 활동과 봇 댓글은 뺀다.
 * 읽기만 한다(gh의 조회 API만 호출). 상태는 .git/gh-watch-state.json(커밋되지 않음)에 둔다.
 * Events API는 2025년 이후 응답이 줄어 PR 제목·커밋 메시지가 빠지므로 쓰지 않는다.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 30;

function run(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

function gh(args) {
  const out = run('gh', args).trim();
  return out ? JSON.parse(out) : null;
}

const api = (p) => gh(['api', p]);

function stateFile() {
  return path.resolve(ROOT, run('git', ['rev-parse', '--git-common-dir']).trim(), 'gh-watch-state.json');
}

function loadState() {
  try {
    return JSON.parse(readFileSync(stateFile(), 'utf8'));
  } catch {
    return null;
  }
}

function saveState(state) {
  writeFileSync(stateFile(), JSON.stringify(state));
}

function kst(ts) {
  const d = new Date(new Date(ts).getTime() + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function short(text, n = 70) {
  const line = (text || '').trim().split(/\r?\n/)[0] || '';
  return line.length <= n ? line : `${line.slice(0, n - 1)}…`;
}

const isBot = (login) => login.endsWith('[bot]');

const MAIN_BRANCH = 'main';
const MAIN_SHAS_KEEP = 500;
const CI_FAILED = new Set(['failure', 'timed_out', 'startup_failure', 'action_required']);

/** 작업 브랜치에 main 을 합친 머지 커밋인지. */
export function isMainMergeCommit(message) {
  return /^Merge (remote-tracking )?branch '(origin\/)?main'/.test(message || '');
}

/**
 * 브랜치 push 중 알릴 커밋을 고른다.
 * 내 커밋은 뺀다. 작업 브랜치에서는 이미 main 에 있는 커밋과 main 을 합친 머지 커밋도 뺀다
 * (main 을 합칠 때마다 남의 커밋이 다시 알림으로 오던 잡음).
 */
export function commitsToReport(commits, { me, mainShas, branch }) {
  return commits.filter((c) => {
    if (c.author?.login === me) return false;
    if (branch === MAIN_BRANCH) return true;
    return !mainShas.has(c.sha) && !isMainMergeCommit(c.commit?.message);
  });
}

const REVIEW_LABEL = { APPROVED: '승인', CHANGES_REQUESTED: '변경 요청', COMMENTED: '의견' };

/**
 * 새로 제출된 PR 리뷰 한 줄. 알릴 것이 아니면 null.
 * 내 리뷰, 아직 제출 전(PENDING)·철회(DISMISSED), 본문 없는 단순 의견은 뺀다. 내 PR 에 온 리뷰는 ★.
 */
export function reviewLine(review, { me, prNumber, prAuthor, title }) {
  const login = review.user?.login;
  const label = REVIEW_LABEL[review.state];
  if (!login || login === me || !label) return null;
  if (review.state === 'COMMENTED' && !(review.body || '').trim()) return null;
  const mark = prAuthor === me ? '★ ' : '';
  const body = short(review.body);
  return `${mark}${kst(review.submitted_at)} ${login} PR #${prNumber} 리뷰 ${label}: ${short(title)}${body ? ` — ${body}` : ''}`;
}

/** 끝난 CI 한 줄. 실패만 ★. 취소(cancelled)는 같은 브랜치에 새 실행이 들어와 대체된 것이라 실패로 보지 않는다. */
export function ciLine(run) {
  const title = short(run.displayTitle);
  if (run.conclusion === 'cancelled') {
    return `CI ${run.workflowName} ${run.headBranch} → 취소됨(새 실행으로 대체): ${title}`;
  }
  const mark = CI_FAILED.has(run.conclusion) ? ' ★' : '';
  return `CI${mark} ${run.workflowName} ${run.headBranch} → ${run.conclusion}: ${title}`;
}

function snapshotItems(items) {
  const snap = {};
  for (const it of items) {
    snap[String(it.number)] = {
      kind: it.pull_request ? 'PR' : '이슈',
      state: it.state,
      title: it.title,
      labels: (it.labels || []).map((l) => l.name).sort(),
      assignees: (it.assignees || []).map((a) => a.login).sort(),
      draft: it.draft ?? null,
      merged: Boolean(it.pull_request?.merged_at),
    };
  }
  return snap;
}

function listBranches(repo) {
  return Object.fromEntries(api(`repos/${repo}/branches?per_page=100`).map((b) => [b.name, b.commit.sha]));
}

function recentMainShas(repo) {
  return (api(`repos/${repo}/commits?sha=${MAIN_BRANCH}&per_page=100`) || []).map((c) => c.sha);
}

function headAuthor(repo, sha) {
  try {
    return api(`repos/${repo}/commits/${sha}`)?.author?.login ?? null;
  } catch {
    return null;
  }
}

function completedRuns(repo) {
  const runs = gh(['run', 'list', '-R', repo, '--limit', '20',
    '--json', 'databaseId,status,conclusion,headBranch,workflowName,displayTitle']) || [];
  return runs.filter((r) => r.status === 'completed');
}

function baseline() {
  const repo = gh(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;
  const me = api('user').login;
  const items = api(`repos/${repo}/issues?state=all&per_page=100`) || [];
  const drafts = Object.fromEntries((gh(['pr', 'list', '-R', repo, '--state', 'all', '--limit', '100',
    '--json', 'number,isDraft']) || []).map((p) => [p.number, p.isDraft]));
  for (const it of items) if (it.pull_request) it.draft = drafts[it.number] ?? null;
  return {
    repo,
    me,
    lastCheck: new Date().toISOString(),
    branches: listBranches(repo),
    items: snapshotItems(items),
    seenComments: [],
    seenRuns: completedRuns(repo).map((r) => r.databaseId),
    askedReview: [],
    mainShas: recentMainShas(repo),
  };
}

/** state를 갱신하면서 새로 바뀐 것을 한 줄씩 돌려준다. */
function collect(state) {
  const { repo, me } = state;
  const lines = [];
  const started = Date.now();
  const since = state.lastCheck;

  // 1) 브랜치. main 을 먼저 봐야 같은 주기에 main 을 합친 작업 브랜치에서 main 커밋을 걸러낼 수 있다.
  const mainShas = new Set(state.mainShas ?? recentMainShas(repo));
  const branches = listBranches(repo);
  const names = Object.keys(branches).sort((a, b) => (a === MAIN_BRANCH ? -1 : b === MAIN_BRANCH ? 1 : 0));
  for (const name of names) {
    const sha = branches[name];
    const old = state.branches[name];
    if (!old) {
      if (headAuthor(repo, sha) !== me) lines.push(`브랜치 생성: ${name}`);
      continue;
    }
    if (old === sha) continue;
    let cmp;
    try {
      cmp = api(`repos/${repo}/compare/${old}...${sha}`);
    } catch {
      cmp = { status: 'diverged' };
    }
    if (cmp.status === 'diverged' || cmp.status === 'behind') {
      lines.push(`브랜치 ${name}: 강제 push(기록이 바뀜)`);
      continue;
    }
    const all = cmp.commits || [];
    if (name === MAIN_BRANCH) for (const c of all) mainShas.add(c.sha);
    const commits = commitsToReport(all, { me, mainShas, branch: name });
    for (const c of commits.slice(-5)) {
      const who = c.author?.login || c.commit.author.name;
      lines.push(`${kst(c.commit.author.date)} ${who} push ${name}: ${short(c.commit.message)}`);
    }
    if (commits.length > 5) lines.push(`  …${name}에 커밋 ${commits.length - 5}개 더`);
  }
  for (const name of Object.keys(state.branches)) {
    if (!(name in branches)) lines.push(`브랜치 삭제: ${name}`);
  }
  state.branches = branches;
  state.mainShas = [...mainShas].slice(-MAIN_SHAS_KEEP);

  // 2) 이슈·PR (since 이후 바뀐 것, PR 포함)
  const items = api(`repos/${repo}/issues?state=all&since=${since}&sort=updated&per_page=100`) || [];
  for (const it of items) {
    if (!it.pull_request) continue;
    const pr = api(`repos/${repo}/pulls/${it.number}`);
    it.draft = pr.draft;
    it.pull_request.merged_at = pr.merged_at;
    it.reviewers = (pr.requested_reviewers || []).map((r) => r.login);
  }
  const cur = snapshotItems(items);
  for (const it of items) {
    const num = String(it.number);
    const c = cur[num];
    const p = state.items[num];
    const tag = `${c.kind} #${num}`;
    if (!p) {
      if (it.user.login !== me) {
        lines.push(`${kst(it.created_at)} ${it.user.login} 새 ${tag}${c.draft ? ' [Draft]' : ''}: ${short(c.title)}`
          + (c.labels.length ? ` 라벨 ${c.labels.join(',')}` : '')
          + (c.assignees.length ? ` 담당 ${c.assignees.join(',')}` : ''));
      }
    } else {
      const ch = [];
      if (c.merged && !p.merged) ch.push('머지됨');
      else if (c.state !== p.state) ch.push(c.state === 'closed' ? '닫힘' : '다시 열림');
      if (c.draft === false && p.draft === true) ch.push('Draft→리뷰 요청');
      const diff = (a, b) => a.filter((x) => !b.includes(x));
      if (diff(c.labels, p.labels).length) ch.push(`라벨+${diff(c.labels, p.labels).join(',')}`);
      if (diff(p.labels, c.labels).length) ch.push(`라벨-${diff(p.labels, c.labels).join(',')}`);
      if (diff(c.assignees, p.assignees).length) ch.push(`담당+${diff(c.assignees, p.assignees).join(',')}`);
      if (diff(p.assignees, c.assignees).length) ch.push(`담당-${diff(p.assignees, c.assignees).join(',')}`);
      if (c.title !== p.title) ch.push('제목 변경');
      if (ch.length) lines.push(`${kst(it.updated_at)} ${tag} ${ch.join(' / ')}: ${short(c.title)}`);
    }
    if (it.pull_request) {
      // 리뷰 제출은 이슈·댓글 API에 안 나온다. PR 이 갱신됐으면 리뷰 목록을 따로 본다.
      const seenReviews = new Set(state.seenReviews ?? []);
      for (const rv of api(`repos/${repo}/pulls/${num}/reviews?per_page=100`) || []) {
        if (seenReviews.has(rv.id) || !rv.submitted_at || new Date(rv.submitted_at) < new Date(since)) continue;
        seenReviews.add(rv.id);
        const line = reviewLine(rv, { me, prNumber: num, prAuthor: it.user.login, title: c.title });
        if (line) lines.push(line);
      }
      state.seenReviews = [...seenReviews].slice(-500);
    }
    if ((it.reviewers || []).includes(me) && !state.askedReview.includes(num)) {
      lines.push(`★ ${tag} 리뷰 요청이 나에게 왔음: ${short(c.title)}`);
      state.askedReview.push(num);
    }
  }
  Object.assign(state.items, cur);

  // 3) 새 댓글 (이슈·PR 대화, 코드 리뷰 댓글)
  const seen = new Set(state.seenComments);
  for (const p of [`repos/${repo}/issues/comments?since=${since}&per_page=100`,
    `repos/${repo}/pulls/comments?since=${since}&per_page=100`]) {
    for (const cm of api(p) || []) {
      const key = `${cm.id}@${cm.updated_at}`;
      const login = cm.user.login;
      if (seen.has(key) || login === me || isBot(login)) continue;
      seen.add(key);
      const num = (cm.issue_url || cm.pull_request_url || '').split('/').pop();
      const mention = (cm.body || '').includes(`@${me}`) ? ' ★ 나를 언급' : '';
      lines.push(`${kst(cm.created_at)} ${login} #${num} 댓글${mention}: ${short(cm.body)}`);
    }
  }
  state.seenComments = [...seen].slice(-500);

  // 4) 끝난 CI
  const seenRuns = new Set(state.seenRuns);
  for (const r of completedRuns(repo)) {
    if (seenRuns.has(r.databaseId)) continue;
    seenRuns.add(r.databaseId);
    lines.push(ciLine(r));
  }
  state.seenRuns = [...seenRuns].slice(-200);

  // 조회 사이에 바뀐 것을 놓치지 않도록 1분 겹쳐서 다음 기준을 잡는다(댓글은 id로 중복 제거)
  state.lastCheck = new Date(started - 60 * 1000).toISOString();
  return lines;
}

function capped(lines) {
  if (lines.length <= MAX_LINES) return lines;
  return [...lines.slice(0, MAX_LINES), `…외 ${lines.length - MAX_LINES}건 (GitHub에서 직접 확인)`];
}

function checkOnce() {
  let state = loadState();
  if (!state) {
    saveState(baseline());
    return { first: true, lines: [] };
  }
  const lines = collect(state);
  saveState(state);
  return { first: false, lines };
}

const MONITOR_HINT = 'Monitor 도구로 `node scripts/github-watch.mjs --loop`를 켠다(timeout_ms 1800000, 만료 알림이 오면 다시 켠다). '
  + '이 세션에서 이미 켜져 있으면 다시 켜지 않는다. 알림이 오면 CLAUDE.md 「GitHub 감시」대로 사용자에게 짧게 알린다.';

function sessionStart() {
  let context;
  let message;
  try {
    const { first, lines } = checkOnce();
    if (first) {
      context = '[GitHub 감시] 이 PC에서 처음 실행해 기준점을 잡았다.';
      message = 'GitHub 감시: 기준점을 잡았습니다';
    } else if (lines.length) {
      context = `[GitHub 감시] 지난 확인 이후 바뀐 것 ${lines.length}건:\n${capped(lines).map((l) => `- ${l}`).join('\n')}\n`
        + '사용자와 관련된 것(★, 내 이슈·PR, 내 브랜치와 겹치는 main 변경)이 있으면 첫 응답에서 짧게 알린다.';
      message = `GitHub: 지난번 이후 바뀐 것 ${lines.length}건`;
    } else {
      context = '[GitHub 감시] 지난 확인 이후 바뀐 것 없음.';
    }
    context += `\n이 저장소 규칙: ${MONITOR_HINT}`;
  } catch (e) {
    context = '[GitHub 감시] gh CLI가 없거나 로그인이 안 돼 확인하지 못했다. '
      + `사용자에게 gh 설치와 \`gh auth login\`을 한 번 안내한다. (${short(String(e.message), 120)})`;
  }
  const out = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } };
  if (message) out.systemMessage = message;
  process.stdout.write(JSON.stringify(out));
}

async function loop(intervalSec) {
  let state = loadState() || baseline();
  saveState(state);
  let failing = false;
  for (;;) {
    try {
      const lines = collect(state);
      saveState(state);
      for (const l of capped(lines)) console.log(`[GitHub] ${l}`);
      failing = false;
    } catch (e) {
      // 같은 실패가 5분마다 알림으로 쌓이지 않게 연속 실패는 처음 한 번만 알린다
      if (!failing) console.log(`[GitHub] 확인 실패(다음 주기에 다시 시도): ${short(String(e.message), 120)}`);
      failing = true;
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
}

// 시험이 이 파일을 import 할 때는 실행하지 않는다(직접 실행할 때만 동작).
const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  const args = process.argv.slice(2);
  if (args.includes('--session-start')) {
    sessionStart();
  } else if (args.includes('--loop')) {
    const i = args.indexOf('--interval');
    await loop(i >= 0 ? Number(args[i + 1]) : 300);
  } else {
    try {
      const { first, lines } = checkOnce();
      if (first) console.log('[GitHub] 기준점을 잡았습니다. 다음 실행부터 바뀐 것을 보여 줍니다.');
      else if (!lines.length) console.log('[GitHub] 지난 확인 이후 바뀐 것 없음');
      for (const l of capped(lines)) console.log(`[GitHub] ${l}`);
    } catch (e) {
      console.error(`[GitHub] 확인 실패: ${short(String(e.message), 200)}`);
      console.error('gh CLI 설치와 `gh auth login`이 필요합니다.');
      process.exitCode = 1;
    }
  }
}
