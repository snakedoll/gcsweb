---
name: migration-check
description: gcsweb DB 마이그레이션 점검. 대상 DB 확인, 미적용 마이그레이션(migrate status), schema.prisma와 DB 차이(migrate diff), 데이터 손실 위험 SQL 검사, 트랜잭션 시험 실행(롤백)까지 한다. "migrate status", "마이그레이션 확인/만들기/적용", "스키마 바꿨는데 DB 반영" 요청 시 사용.
argument-hint: "[status | diff | dry-run <마이그레이션 폴더명>]"
---

# DB 마이그레이션 점검

원칙: **읽기 → 보고 → 승인 → 적용.** 승인 전에는 DB에 쓰는 명령을 실행하지 않는다.

## 1. 대상 DB부터 확인 (항상)

`.env`의 `DATABASE_URL`에서 **호스트·포트·DB 이름만** 뽑아 보여준다. 비밀번호·전체 URL은 출력하지 않는다.

```bash
node --env-file=.env -e "const u=new URL(process.env.DATABASE_URL); console.log(u.hostname+':'+u.port+u.pathname)"
```

- `localhost`/`127.0.0.1`이 아니면(예: Railway `*.rlwy.net`, `*.railway.app`) **운영/공용 DB로 간주**하고, 이후 명령마다 이 사실을 다시 알린다.
- `.env`가 없으면 멈추고 알린다(Prisma P1012).

## 2. 상태 (`status`)

```bash
npx prisma migrate status
```

- 미적용 마이그레이션 목록, 실패(failed) 기록, DB에만 있는 마이그레이션(드리프트 신호)을 표로 정리한다.
- 운영 DB는 배포 시 `npm start`가 `migrate deploy`를 자동 실행한다는 점을 함께 알린다.

## 3. 차이와 SQL 만들기 (`diff`)

`migrate dev`는 쓰지 않는다(드리프트가 있으면 DB reset을 요구함). SQL은 diff로 만든다.

```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

- 결과가 비어 있으면 "DB와 스키마 일치"로 보고하고 끝.
- 새 마이그레이션이 필요하면 `prisma/migrations/<YYYYMMDDHHMMSS>_<snake_case_설명>/migration.sql` 경로를 **제안**한다(기존 폴더 이름 형식을 따른다). 파일 생성은 사용자 확인 후.

## 4. 위험 SQL 검사

SQL에 아래가 있으면 ⚠️로 표시하고, 영향받는 행 수를 읽기 전용 쿼리로 세서 함께 보여준다.

| 패턴 | 위험 |
|---|---|
| `DROP TABLE`, `DROP COLUMN` | 데이터 삭제 |
| `ALTER COLUMN ... SET NOT NULL` | 기존 NULL 행이 있으면 실패 |
| `ALTER COLUMN ... TYPE` | 형 변환 실패·정밀도 손실 |
| `DROP TYPE`, enum 값 제거 | 기존 값 사용 행이 있으면 실패 |
| `CREATE UNIQUE INDEX` | 중복 행이 있으면 실패 |
| FK `ON DELETE CASCADE` 추가 | 연쇄 삭제 |

데이터 손실이 있는 마이그레이션은 머지 전에 팀 리뷰가 필요하다고 알린다.

## 5. 시험 실행 (`dry-run`)

`scripts/rollback-dry-run-template.js` 패턴을 따른다: 트랜잭션 안에서 SQL 실행 → 전후 스냅샷(행 수·합계) 비교 → 의도적으로 예외를 던져 롤백.

- 스크립트는 `scripts/<설명>-dry-run.js`로 만들고 실행은 `NODE_PATH="$(pwd)/node_modules" node scripts/<파일>`.
- BEFORE / IN TX / AFTER 스냅샷과 "rolled back (before == after): true"를 보여준다.
- 운영 DB에서 시험 실행할 때는 실행 전에 한 번 더 확인받는다.

## 6. 적용

- 사용자가 결과를 보고 승인한 경우에만 `npx prisma migrate deploy`.
- 적용 후 `npx prisma migrate status`로 확인하고, `npx prisma generate`가 필요한지 알린다.
- ERDCloud ERD도 같은 작업에서 맞춘다(`schema.prisma`가 기준). 반영은 PR이 승인된 뒤(머지 직전)에 한다. 사용자가 ERDCloud 화면에서 스냅샷을 만들면, ERDCloud MCP로 바꿀 테이블·컬럼 목록을 보여 주고 ok 후 반영한다(CLAUDE.md 「DB 변경 규칙」).
- 커밋은 `schema.prisma` + 마이그레이션 폴더를 함께, 기본 `chore(db): ...`.
