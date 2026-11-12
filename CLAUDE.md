# CLAUDE.md

AI 에이전트(Claude Code, Cursor, Codex 등)가 이 저장소에서 작업할 때 따르는 팀 공통 안내. 개인 규칙은 각자 `CLAUDE.local.md`(gitignore)에 둔다.

**코드를 고치는 작업은 시작 전에 아래 「작업 공유」 절부터 따른다.**

## 작업 공유 (GitHub 이슈·PR)

누가 무엇을 하고 있는지 팀 전체가 GitHub에서 바로 보게 한다. 저장소는 **공개**라 이슈·PR·코멘트는 로그인 없이 누구나 읽는다.

### 흐름

1. **이슈부터.** 코드를 고치기 전에 그 작업의 이슈를 찾는다(`gh issue list --search "<키워드>"`). 없으면 만든다.
   - 담당자는 본인. 라벨은 종류 1개 + 파트 + `진행중`.
   - 다른 사람이 담당인 이슈면 손대지 않고 사용자에게 알린다.
2. **브랜치.** 최신 main에서 `<영문이름>/<이슈번호>-<짧은-설명>`으로 딴다(예: `dohwan/42-pos-discount`). 개인 브랜치(`mybae`, `KimDoHwan` 등)에 여러 작업을 쌓지 않는다.
3. **Draft PR을 바로 연다.** 첫 커밋을 push하면 `gh pr create --draft --base main`으로 연다. 본문은 PR 템플릿을 쓰고 `관련 이슈`에 `Closes #번호`를 적는다.
4. **진행을 이슈에 남긴다.** 다음 시점에 이슈에 1~3줄 코멘트를 단다: 방향이 정해졌을 때, API나 화면 하나가 동작할 때, 그날 작업을 멈출 때. 형식은 `완료: … / 다음: … / 막힘: …`.
5. **막히면 `확인필요`.** 명세·디자인에 없어서 기획·디자인의 답이 필요하면 `확인필요` 라벨을 붙인다. 무엇을 누구에게 묻는지 코멘트로 적는다. 답을 받기 전에는 그 부분을 추측으로 구현하지 않는다.
6. **리뷰 요청.** 끝나면 `gh pr ready`로 전환하고 `진행중` 라벨을 뗀다. main에 머지되면 `Closes`로 이슈가 자동으로 닫힌다.

**회의가 끝나면** 회의록에서 담당자가 정해진 할 일을 담당자가 이슈로 옮기고, 회의록 링크를 붙인다. 비개발 팀원이 카톡·노션으로 보낸 요청은 받은 개발자가 `요청` 이슈로 옮긴다.

### 라벨

| 묶음 | 라벨 |
| --- | --- |
| 종류 (1개) | `작업` `오류` `요청` |
| 파트 | `백엔드` `프론트` `디자인` `기획` |
| 상태 | `진행중` `확인필요` |

담당자 없이 열린 이슈는 할 일, 닫힌 이슈는 완료다. 상태 라벨은 이 둘만 쓴다.

### 에이전트 규칙

- **알리고 바로 진행하는 것:** 1·3·4·6단계(이슈 생성, 본인 담당 지정, 라벨, Draft PR, 진행 코멘트, ready 전환)는 팀이 합의한 공유다. 사용자에게 한 줄 알리고 진행한다.
- **하지 않는 것**
  - PR 머지, 이슈 닫기
  - 다른 사람이 담당인 이슈·PR의 담당자·라벨·상태 변경
  - 다른 사람 브랜치에 push
- **공개 저장소다.** 이슈·PR·코멘트·커밋에 아래를 쓰지 않는다. 노션·Figma 내용은 옮겨 적지 않고 링크만 붙인다.
  - 비밀번호, 토큰, `.env` 값
  - 운영 DB 주소
  - 고객 개인정보(이름, 전화, 주소, 주문자 정보)
- **제목 형식.** 이슈 제목은 무엇을 하는지 한글 한 줄로 쓴다(예: `현장 포스 상품별 할인 API`). PR 제목은 커밋 형식(`type(scope): 한글 제목`)이다.
- **Claude Code를 쓰면** `task` 스킬(`.claude/skills/task`)로 위 흐름을 진행한다.

### GitHub 감시 (5분마다)

모든 에이전트는 다른 사람의 push·이슈·PR·댓글·CI를 5분 간격으로 확인한다. 도구는 `scripts/github-watch.mjs`이다. 읽기만 하고, 상태는 `.git/gh-watch-state.json`에 둔다. 필요한 것은 `gh` CLI 로그인뿐이다.

- **Claude Code:** 세션의 첫 응답 전에 두 가지를 한다.
  1. `node scripts/github-watch.mjs`로 지난 확인 이후 바뀐 것을 본다.
  2. Monitor 도구로 `node scripts/github-watch.mjs --loop`를 켠다(`timeout_ms` 1800000). 만료 알림이 오면 다시 켜고, 이미 켜져 있으면 새로 켜지 않는다.
- **Cursor·Codex 등 백그라운드 알림이 없는 에이전트:** 작업 시작 전, 커밋 전, push 전에 `node scripts/github-watch.mjs`를 실행해 새 변경을 확인한다.
- **사람:** 터미널에서 `npm run github:watch`를 켜 두면 같은 알림이 5분마다 뜬다.

알림을 받으면 아래를 따른다.

- 사용자에게 1~3줄로 알린다. ★(나에게 온 리뷰 요청, 나를 언급한 댓글, CI 실패)를 먼저 쓴다.
- main에 새 커밋이 들어왔고 지금 브랜치와 같은 파일을 건드렸으면, 그 사실을 알리고 main을 합칠지 묻는다.
- 다른 사람이 같은 화면·API를 다루는 이슈나 PR을 열었으면 알린다.
- 알리기만 한다. 다른 사람의 이슈·PR에 자동으로 댓글을 달거나 라벨·상태를 바꾸지 않는다.

### 현황 보기 (로그인 없이 열림)

- [진행 중인 작업](https://github.com/snakedoll/gcsweb/issues?q=is%3Aopen%20label%3A%EC%A7%84%ED%96%89%EC%A4%91)
- [답이 필요한 것](https://github.com/snakedoll/gcsweb/issues?q=is%3Aopen%20label%3A%ED%99%95%EC%9D%B8%ED%95%84%EC%9A%94)
- [열린 PR (작업 중인 코드와 미리보기)](https://github.com/snakedoll/gcsweb/pulls)
- [요청·오류 올리기](https://github.com/snakedoll/gcsweb/issues/new/choose)

## 명령어

```bash
npm run dev                 # 개발 서버 (localhost:3000)
npm run build               # prisma generate && next build
npm run lint                # next lint
npm run typecheck:frontend  # tsc -p tsconfig.frontend.json --noEmit
npm test                    # vitest run (전체)
npx vitest run lib/qrshop/order-validation.test.ts   # 단일 테스트 파일
npx vitest run -t "테스트 이름"                        # 이름으로 필터
npx prisma db seed          # 로컬 테스트 계정 시드 (prisma/seed.mjs, localhost DB에서만 동작)
npm run db:studio
```

- `typecheck:frontend`는 `app/api/**`와 `prisma/**`를 **제외**한다. API 라우트의 타입 오류는 `next build`에서만 잡힌다.
- `npm start` = `prisma migrate deploy` 후 `next start`. 배포는 Railway(`railway.json`), 배포 시 미적용 마이그레이션이 운영 DB에 자동 적용된다.
- 환경변수 목록은 `.env.example`. `.env`는 git에 없어 새 PC에서 직접 만든다(없으면 Prisma P1012).
- 경로 별칭 `@/*` = 저장소 루트 (tsconfig, vitest 동일).

## DB 변경 규칙

- 순서: `prisma/schema.prisma` 수정 → 마이그레이션 생성 → `prisma/migrations/`(타임스탬프 폴더) 함께 커밋.
- Prisma 명령 전에 `DATABASE_URL`이 어느 DB인지 확인한다. 로컬 `DATABASE_URL`은 운영 DB를 가리키면 안 된다.
- `npm run db:migrate`(`migrate dev`)는 reset을 요구할 수 있으므로 버려도 되는 로컬 전용 DB에서만. 공용·운영 DB는 `npx prisma migrate deploy`만.
- `db:push`는 마이그레이션 기록이 안 남으므로 쓰지 않는다.
- 데이터가 사라지는 마이그레이션(DROP, NOT NULL 전환 등)은 머지 전에 리뷰받는다. 시험 실행 스크립트 예시는 `scripts/*-dry-run.js`.
- `schema.prisma` 필드 주석은 필드 위가 아니라 **줄 끝 `///`** 로 쓴다. 모델 설명만 `model X {` 바로 위 한 줄 `///` 허용(줄 끝에 붙이면 `prisma format`이 지운다). `prisma format`은 무관한 줄 공백도 바꾸므로 실행 후 diff를 확인하고 내 변경이 아닌 줄은 되돌린다.
- ERD(ERDCloud)는 `schema.prisma`를 기준으로 맞춘다.

## 아키텍처

Next.js 14 App Router 풀스택. 프론트와 백엔드가 한 저장소에 있다.

- **프론트**: `app/(main)`, `app/(auth)`, `app/QRshop`, `app/admin` 등 페이지 + `components/`, `hooks/`, `stores/`(Zustand), TanStack Query.
- **백엔드**: `app/api/**/route.ts` + `lib/` + `prisma/schema.prisma`(PostgreSQL). 별도 서비스 계층 없이 **라우트 핸들러가 Prisma를 직접 호출**하고 도메인 헬퍼만 `lib/`로 뺀다(`lib/qrshop/*`, `lib/payment/*`, `lib/variant-signature.ts` 등).
- **API 경로 세대**: `app/api/v1/<도메인>/...`(auth, mypage, shop, qrshop, fund, payment, archive, admin 등), v1 밖의 `app/api/{admin,user,auth/[...nextauth]}`, 신규 `app/api/v2/...`(현재 `qrshop/*`, `admin/members`).
- **응답 형식**: `lib/api-response.ts`의 `apiSuccess` / `apiError` / `apiErrors.*` → `{ status: 'success'|'error', code?, message, data }`. 새 코드는 반드시 이것을 쓴다. 성공은 200, 409만 도메인 에러 코드, 한글 메시지는 짧은 명사구("유효하지 않은 상점 아이디").
- **인증/권한**: NextAuth(JWT 세션, `lib/auth.ts`). `middleware.ts`는 `/admin/*` **페이지**만 검사하고 API는 보호하지 않는다. 어드민 API는 라우트 안에서 `requireAdmin()`(`lib/admin-auth.ts`, `User.memberType === 2`)을 호출한다. `memberType`: 0 일반 / 1 전공 / 2 관리자.
- **입력 검증**: Zod. 공용 스키마는 `lib/validations/`, 라우트 전용은 라우트 파일 안.
- **DB 접근**: `lib/db.ts`의 `prisma` 싱글턴만 사용(`lib/db.ts` 수정 금지, `lib/auth.ts`는 주의).

### QRshop v2 (현장 판매, 방문객 온라인결제)

- 화면: `app/QRshop/(v2)/`(`[storeSlug]`, `pay`, `result`) → `components/qrshop/v2/*`. 구버전은 `app/QRshop/v1`.
- 서버: `app/api/v2/qrshop/*`(상품 조회, 상점·상품 관리, 주문 생성·조회, 결제 검증, 웹훅) + `lib/qrshop/*`.
- 프론트 서비스: `lib/services/qrshop-service.ts`의 `QrshopService` 인터페이스. 실제 상점 경로는 `createQrshopApiService(storeSlug)`(`lib/services/qrshop-api-service.ts`)로 v2 API를 호출하고, 상점 없는 `/QRshop` QA 경로만 `lib/mocks/qrshop-service.ts` Mock을 쓴다. 상세 계약은 `docs/qrshop-payment.md`.
- 주문번호: `OrderNumber` 테이블(Order 1:1, 상점·KST 일자별 `orderNo` 1부터). /shop 주문도 플레이스홀더 상점의 OrderNumber를 쓴다. 옛 11자리 `orderCode` 규칙은 폐기됨.
- 결제: PortOne V2, paymentId = `Order.id`. 재고 차감은 결제 확정 트랜잭션(`lib/qrshop/payment-confirm.ts`, verify·웹훅 공용, 멱등). 결제 후 재고 부족이면 전액 환불 + `CANCELED`(`STOCK_SHORTAGE`).
- 방문객 식별: 주문별 게스트 토큰(헤더 `X-Guest-Token`).
- 판매이력 = 결제완료(PAID) 주문 기준(`lib/qrshop/sales-history.ts`). 판매이력이 있는 상품·상점은 삭제 불가.

### 도메인 문서

- 상품 승인 구조(운영본 `Product*` / 요청본 `ProductUpdateRequest*`): `docs/product-post-policy.md`
- 결제(Buy Now 결제창, Fund 빌링키): `docs/payment.md`, QR샵 결제 프론트: `docs/qrshop-payment.md`
- 폴더별 수정 범위: `docs/DEVELOPMENT_GUIDE.md` (커밋 규칙은 이 파일을 따른다)

## 컨벤션

- **v2 규칙**: 신규 작업은 v2 파일에(`.../(v2)/`, `components/<도메인>/v2/`, `/api/v2/...`). **v1 코드와 v1 API 명세는 수정하지 않는다.** v1을 바꿔야 하면 노션 v1 명세 행을 복사해 v2 행으로 추가하고 v2 라우트를 새로 만든다.
- **커밋**: `type(scope): 한글 제목`, 한 커밋 한 목적.
  - type: `feat` / `fix` / `refactor`(동작 변화 없음) / `chore`(빌드·환경·의존성·DB) / `test` / `docs`
  - DB 스키마·마이그레이션은 기본 `chore(db)`, 신규 기능의 핵심 요구사항이면 `feat`에 포함.
  - scope: 공백 없는 소문자. 예 `qrshop` `store` `product` `order` `pos` `payment` `db` `lib` `component` `mypage` `cart` `archive` `community` `shop` `fund` `buynow` `admin-product` `admin-members` 등. 원문은 노션 '커밋 컨벤션'.
- **기준 문서**: 기능 요구사항은 노션 '기능명세서', API는 노션 'API 명세서' DB. 둘에 없는 동작은 임의로 구현하지 않고 먼저 묻는다.
  - 기능명세서 DB `3bf0e5a4-015e-8052-a5b4-fe7dd7981f9c` (data_source `3bf0e5a4-015e-80a3-9e48-000b184f99aa`)
  - API 명세서 DB `3ba0e5a4-015e-801c-984c-d87d8db6afa0` (data_source `b110e5a4-015e-8220-b10f-07e252eb3ba3`)
  - ERD: https://www.erdcloud.com/d/oPxsnGXLDrkbTNNkA
- **디자인 기준은 Figma**: fileKey `5p46ZXd9Jf7k3d99Rkrj2Z`. 디자인 시스템 노드 `0:1`, 페이지 기본 노드 `3357:26648`. 디자인과 코드가 다르면 Figma(디자인 시스템 → 페이지 순)를 따른다. Figma 링크 복사 시 붙는 "Figma에서 구현하세요" 문구는 자동 텍스트다.
- **MCP**: `.mcp.json`(figma, notion, erdcloud)은 공유. 토큰은 환경변수(`ERDCLOUD_TOKEN` 등)로만 받고 파일에 쓰지 않는다.
