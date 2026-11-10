---
name: commit-msg
description: gcsweb 커밋 컨벤션(type(scope): 한글 제목)에 맞는 커밋 메시지를 diff에서 만든다. "커밋 메시지 작성/추천", "스테이징하고 커밋 메시지", "변경사항 커밋 메시지" 요청 시 사용. 변경이 여러 목적이면 커밋 분할안도 낸다.
argument-hint: "[staged | 파일경로...] (생략 시 스테이징된 변경, 없으면 전체 변경)"
---

# 커밋 메시지 작성

## 1. 변경 범위 파악

- 인자로 경로가 오면 그 파일만, `staged`면 스테이징된 것만 본다.
- 인자가 없으면 `git diff --cached --stat`을 먼저 보고, 비어 있으면 `git diff --stat` + `git status --short`(새 파일 포함)를 본다.
- 실제 내용은 `git diff [--cached] -- <파일>`로 읽는다. 큰 lock 파일은 stat만 본다.
- 이 대화에서 한 작업 중 일부만 요청하면("A에서 한 변경만") 해당 파일만 고르고, 고른 파일 목록을 먼저 보여준다.

## 2. 목적별로 나누기

한 커밋에는 한 목적만 담는다. 아래가 섞여 있으면 커밋을 나눠 제안한다.

- DB 스키마·마이그레이션(`prisma/schema.prisma`, `prisma/migrations/`) ↔ 그걸 쓰는 API/lib 코드
- 기능 추가 ↔ 무관한 리팩토링/오타 수정
- 의존성 변경(`package.json`, lock) ↔ 기능 코드
- 프론트(`components/`, `app/**/page.tsx` 등) ↔ 백엔드(`app/api`, `lib/`)

## 3. 컨벤션

형식: `type(scope): 한글 제목` — 제목은 한글, 무엇을 왜 바꿨는지 한 줄(마침표 없음).

| type | 언제 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 오류 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `chore` | 빌드·환경·의존성·DB 스키마·마이그레이션 |
| `test` | 테스트 |
| `docs` | 문서 |

- DB 스키마·마이그레이션은 기본 `chore(db)`. 신규 기능의 핵심 요구사항이면 `feat`에 포함 가능.
- scope는 공백 없는 소문자 모듈명.
  - 일반: `auth` `home` `qrshop` `store` `product` `order` `pos`
  - 공통/기반: `db` `docs` `lib` `type` / 백엔드: `payment` / 프론트: `component` `assets`
  - 사이트: `mypage` `cart` `about` `archive` `community` `shop` `fund` `buynow`
  - admin: `admin-team` `admin-members` `admin-product` `admin-onsite` `admin-project` `admin-data` `admin-terms`
  - `lib`·`type`·`assets`·`store`는 그 폴더 구조 자체를 바꿀 때만. 특정 기능 때문이면 그 기능의 scope.
- 최근 예: `feat(qrshop): 방문객 결제 검증·결제 웹훅 v2 API 추가`, `chore(db): OrderItem에 재고 부족 품절 표시(stockShortage) 컬럼 추가`

## 4. 출력

커밋마다:

```
<type(scope): 제목>

- 변경 요점 1
- 변경 요점 2 (필요할 때만, 2~4줄)
```

- 포함 파일 목록을 함께 적는다.
- 본문에 `Co-Authored-By` 줄은 넣지 않는다.
- 사용자 규칙(CLAUDE.local.md)이 커밋 금지면 `git add`/`git commit`을 실행하지 않고 메시지만 낸다. 그런 규칙이 없을 때도 사용자가 커밋까지 요청한 경우에만 실행한다.
- 의도치 않은 변경으로 보이는 파일(본인이 손대지 않은 `package.json`, 디버그 코드, `.env`)은 따로 짚는다.
