---
name: pr-desc
description: gcsweb PR 본문을 .github/pull_request_template.md 형식에 맞춰 커밋·diff에서 작성한다. "PR 본문/설명 써줘", "PR 내용 작성", "PR 템플릿 채워줘" 요청 시 사용. PR을 만들거나 push하지 않고 제목과 본문만 낸다.
argument-hint: "[base 브랜치] (생략 시 main)"
---

# PR 본문 작성

## 1. 범위 파악

- base는 인자로 받은 브랜치, 없으면 `main`. 비교는 항상 원격 기준으로 한다.
  - `git fetch origin <base> <현재 브랜치>` 후 `origin/<base>...HEAD`를 본다.
  - 로컬에 push 안 된 커밋이 있으면(`git log origin/<현재 브랜치>..HEAD`) 목록을 보여주고 "push 전 커밋도 포함할지" 묻는다.
- 커밋 목록: `git log --format='%h %s%n%b' origin/<base>..HEAD`
- 변경 파일: `git diff --stat origin/<base>...HEAD`
- 실제 내용은 파일별 `git diff origin/<base>...HEAD -- <파일>`. lock 파일, 마이그레이션 SQL이 아닌 대용량 생성 파일은 stat만 본다.
- 이미 main에 들어간 머지 커밋(`Merge ... into`)은 요약에서 뺀다.

## 2. 템플릿 읽기

- `.github/pull_request_template.md`를 읽어 섹션 제목·순서·체크박스를 그대로 쓴다. 템플릿에 없는 섹션은 만들지 않는다. 단 "머지 후 참고"는 필요할 때만 맨 끝에 추가 가능.
- 템플릿 파일이 없으면 `.github/`, 루트, `docs/`에서 `pull_request_template.md`(대소문자 무관)를 찾고, 그래도 없으면 사용자에게 알린다. 이름이 다른 비슷한 파일(`PR_template.md` 등)이 있으면 "GitHub가 인식하지 않는 이름"이라고 짚는다.
- `<!-- -->` 주석은 출력에서 지운다.

## 3. 섹션별 채우는 규칙

### 변경 요약
- 첫 줄: 이 PR의 목적 한 문장.
- 이어서 목적 단위 불릿 3~7개. 커밋 제목을 그대로 나열하지 말고 사용자 관점으로 묶는다(같은 기능의 feat + fix는 하나로).
- 경로는 대표 경로만 백틱으로(`app/api/v2/qrshop/orders`, `components/qrshop/v2/*`).

### 관련 명세
- 노션 링크는 diff로 알 수 없으므로 **추측해서 쓰지 않는다**. 빈칸으로 두고 마지막에 질문으로 모은다.
- 버전 체크:
  - `app/api/v2/`, `.../(v2)/`, `components/*/v2/` 변경 → `v2 신규` 체크
  - `app/api/v1/`, `app/QRshop/v1`, v1 컴포넌트 변경이 있으면 체크하지 말고 **경고**로 짚는다 (CLAUDE.md: v1 수정 금지)
  - 앱 코드 변경이 없으면(문서·설정·스킬만) `해당 없음`으로 쓰고 `v1 영향 없음` 체크

### DB 변경
- `prisma/schema.prisma`, `prisma/migrations/` 둘 다 변경 없음 → `DB 변경 없음`만 체크.
- 변경 있음:
  - schema와 migrations가 **둘 다** 있으면 "같이 커밋" 체크. 한쪽만 있으면 체크하지 말고 경고.
  - 새 migration SQL을 읽어 `DROP`, `ALTER COLUMN ... SET NOT NULL`, `ALTER COLUMN ... TYPE`, `TRUNCATE`, `DELETE` 를 찾는다. 있으면 "데이터 손실 위험" 체크하지 말고 해당 SQL 줄을 본문 주석 위치에 인용한다. 없으면 체크.
  - `db:push` 체크와 ERD 반영 체크는 diff로 확인 불가 → 체크하지 말고 질문으로 모은다.

### 디자인 확인
- `app/**/page.tsx`, `app/**/layout.tsx`, `components/**`, `*.css`, `tailwind.config.*`, `public/**` 변경 없음 → `화면 변경 없음` 체크.
- 변경 있음 → 바뀐 화면(라우트) 목록을 적고, Figma 링크·스크린샷 칸은 비워 둔다.

## 4. 제목

- 커밋이 하나의 목적이면 커밋 컨벤션 형식 그대로: `type(scope): 한글 제목`.
- 여러 scope에 걸치면 가장 큰 목적의 type + scope 생략: `chore: 팀 개발 환경 정비 (...)`.
- 브랜치 이름(`Mybae` 등)을 제목으로 쓰지 않는다.

## 5. 출력

1. **제목** 한 줄
2. **본문**: 템플릿 형식 그대로, 복사해서 붙여넣을 수 있게 ```markdown 코드블록 하나로
3. **확인 필요**: 빈칸으로 둔 항목(노션 링크, Figma 링크, ERD 반영, db:push 여부)을 질문 목록으로
4. **경고**(있을 때만): v1 수정, schema/migration 한쪽만 변경, 위험 SQL, `.env`·디버그 코드·의도치 않은 `package.json` 변경, GitHub가 인식하지 않는 템플릿·워크플로 경로(`.github/workflow/` 등)

- `gh pr create`, `git push`, GitHub MCP의 PR 생성 도구는 실행하지 않는다. 사용자가 명시적으로 "PR까지 만들어줘"라고 할 때만.
- 사용자가 답을 주면 해당 칸을 채운 최종본을 다시 낸다.