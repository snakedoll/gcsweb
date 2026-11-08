---
name: api-spec
description: gcsweb API 라우트 코드와 노션 'API 명세서' DB를 비교해 누락·불일치를 보고하고, 승인 후 명세 행을 추가하거나 고친다. "API 명세 작성/추가/업데이트", "명세랑 코드 비교", "노션에 API 정리" 요청 시 사용.
argument-hint: "<라우트 경로 또는 app/api/... 파일> [check | write]"
---

# API 명세 비교·작성

원칙: **비교 → 보완점 보고 → 승인 → 노션 쓰기.** 승인 전에는 노션에 쓰지 않고, "한 건만 먼저 써보기"도 하지 않는다. 노션 MCP는 `.mcp.json`의 `notion`(잇장 팀노션)을 쓴다.

- API 명세서 DB: `3ba0e5a4-015e-801c-984c-d87d8db6afa0` (data_source `collection://b110e5a4-015e-8220-b10f-07e252eb3ba3`)
- 기능명세서 DB: data_source `collection://3bf0e5a4-015e-80a3-9e48-000b184f99aa`

## 1. 코드 읽기

대상 `app/api/**/route.ts`와 그 라우트가 쓰는 `lib/` 헬퍼에서 뽑는다.

- Method, URL(경로 파라미터는 `{name}`, 쿼리는 `?key={key}`)
- 권한: `requireAdmin()` / 세션 필요 / 게스트 토큰(`X-Guest-Token`) / 없음
- 요청: Query·Body 필드, 타입, 필수 여부, Zod 제약
- 응답: `apiSuccess` data 필드와 타입
- 실패: `apiErrors.*` / `apiError(status, code, ...)` 호출을 모두 찾아 상태 코드·에러 코드·조건 표로

## 2. 노션 명세 찾기

`notion-query-data-sources`(SQL)로 URL·기능명이 맞는 행을 찾고 `notion-fetch`로 본문을 읽는다. v1 행과 v2 행을 구분한다.

## 3. 보완점 보고 (쓰기 전에 반드시)

표로 보고한다: `항목 | 노션 명세 | 코드 | 제안`.

- 필드 누락·타입 차이·필수 여부 차이
- 코드에 있는데 명세에 없는 에러 케이스, 그 반대
- 속성: 구현/개발 현황 상태, ver, Category, 우선순위
- **v1 행은 수정하지 않는다.** v1을 바꿔야 하면 v1 행 내용을 그대로 복사한 v2 행을 새로 만들고 수정은 v2 행에만 하자고 제안한다.
- 코드와 명세 중 어느 쪽이 맞는지 판단이 필요하면(명세 = 기획 의도일 수 있음) 고치지 말고 묻는다.

## 4. 승인 후 쓰기

새 행 속성: `기능`(예 `QRshop_주문 생성`, 도메인 접두사 통일), `Method`, `URL`, `Category`, `ver`, `구현`, `개발 현황`.
`Assigned`(people)는 MCP로 지정할 수 없으니 사용자에게 직접 지정해 달라고 알린다.

본문은 기존 행과 같은 형식을 따른다.

```
## 1. 개요
- 기능: …
- 엔드포인트: METHOD /api/v2/…
- 권한: …
## 2. 와이어프레임
- [화면 이름](Figma 노드 URL) …
## 3. 요청
- Query Parameters / Body Parameters 표 (필드명 | 타입 | 필수 여부 | 설명 | 제약 사항)
- 요청 예시 (JSON)
## 4. 응답
- 성공 (200 OK) 표 (필드명 | 타입 | 설명) + 성공 예시
- 실패 표 (상태 코드 | 에러 코드 | 설명) + 실패 예시
## 5. 비고
- 서버 계산 규칙, 트랜잭션, 프론트 표시 규칙 등
```

- 응답 형식은 `{ status, code?, message, data }`. 성공은 200, 409만 도메인 에러 코드, 메시지는 짧은 한글 명사구.
- 쓰고 나면 행 URL을 보고하고, 기능명세서의 연결된 행 상태도 바꿔야 하는지 알린다.
