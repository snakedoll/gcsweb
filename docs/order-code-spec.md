# 주문번호 생성 규칙

## 1. 기본 원칙
- `Order.id`는 기존처럼 `cuid()`를 유지한다. 내부 식별자/관계키 용도다.
- 현장 조회용 주문번호는 별도 필드 `orderCode`로 관리한다.
- 주문순번은 별도 필드 `orderSeq`로 저장한다.

## 2. 주문번호 포맷
- 포맷: `YYMMDD(6) + ProductType(1) + OrderNumber(3) + CheckCharacter(1)`
- 예시: `260321F037W`
- 길이: 총 11자

## 3. 구성 요소 정의
- `YYMMDD`: `Asia/Seoul` 기준 주문 생성일
- `ProductType`:
  - `F`: Fund
  - `B`: BuyNow
- `OrderNumber`: 3자리 zero-pad (`001`~`999`)
- `CheckCharacter`: 검증문자

## 4. 체크문자 규칙
- 문자셋: `ABCDEFGHKMNPQRSTWXYZ` (20자, 혼동 문자 제외)
- 입력값(base): `YYMMDD + ProductType + OrderNumber`
- 계산식:

```ts
const ALPHABET = "ABCDEFGHKMNPQRSTWXYZ"; // length 20

function checkChar(base: string): string {
  let acc = 0;
  for (const ch of base) {
    acc = (acc * 31 + ch.charCodeAt(0)) % ALPHABET.length;
  }
  return ALPHABET[acc];
}
```

- 최종: `orderCode = base + checkChar(base)`

## 5. 순번 정책
- `orderSeq`는 날짜키 기준 분리로 처리한다.
- 동일 `orderSeq` 재사용 허용 범위:
  - 다른 날짜면 허용
  - 같은 날짜라도 `ProductType`이 다르면 허용

## 6. 동시성/중복 방지
- DB 트랜잭션으로 순번 발급 및 주문 생성을 하나의 원자 작업으로 처리한다.
- 유니크 제약:
  - `orderCode` unique
  - `(orderDateKey, productType, orderSeq)` unique
- 충돌 대응:
  - unique/직렬화 충돌 시 짧은 backoff 후 재시도 (예: 최대 3회)

## 7. 3자리 초과 정책
- 기본: 3자리 유지 (`001`~`999`)
- 초과 시: 주문 생성 실패 처리(예: 409) + 에러 메세지 "하루 주문량 초과"
- 비고: 가변 길이(`1000`)로 늘리는 방식은 포맷 깨짐 때문에 적용하지 않는다.

## 8. 저장 필드 권장
- `Order.id` (기존): `cuid()`
- `Order.orderDateKey`: `YYMMDD` (string)
- `Order.productTypeCode`: `F|B` 
  - 주문한 상품 정보에서 참조한다. 우리 사이트는 한 주문에 하나의 상품유형만 담기므로(바이나우는 바이나우끼리, 펀드는 동일한 펀드상품끼리만 구매 가능), 주문한 상품을 기준으로 `F|B`를 일관되게 결정할 수 있다.
- `Order.orderSeq`: number
- `Order.orderCode`: string (unique)

## 비고
- 날짜 판단/자정 기준은 반드시 `Asia/Seoul`로 고정한다.
- `orderCode`는 생성 후 변경하지 않는다(immutable).
- 검색/정렬/분석의 기준 컬럼은 `createdAt` 및 구조화 필드(`orderDateKey`, `orderSeq`)를 우선 사용한다.