# CLAUDE.md

AI 에이전트(Claude Code 등)가 이 저장소에서 작업할 때 따르는 팀 공통 안내. 개인 규칙은 각자 `CLAUDE.local.md`(gitignore)에 둔다.

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
- Node 22 기준. 운영은 Railway 변수 `NIXPACKS_NODE_VERSION=22`, CI는 `.github/workflows/ci.yml`에서 22로 고정.

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
