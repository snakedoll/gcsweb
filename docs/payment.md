# 결제 연동 (포트원)

## 개요

- **Buy Now 상품**: 포트원 결제창 SDK (KG이니시스 채널)
- **Fund 상품**: 포트원 **V1 REST** 빌링키 흐름(아임포트 `subscribe/payments/onetime` → 즉시취소 → 만기 시 `subscribe/payments/again`). 사용 PG는 **`PORTONE_BILLING_PG`** 로 지정한다 (헥토 `settle.*` 또는 KG이니시스 `html5_inicis.{MID}` 등).

환경 변수는 `.env`에 설정한다.

---

## 환경 변수

| 변수 | 용도 |
|------|------|
| `PORTONE_STORE_ID` | 포트원 스토어 ID |
| `PORTONE_CHANNEL_KEY` | Buy Now 결제 채널 Key (KG이니시스) |
| `PORTONE_BILLING_CHANNEL_KEY` | Fund **V2 브라우저 빌링키 UI**용 채널 Key (선택). 현재 구현의 카드등록은 서버 onetime 위주 |
| `PORTONE_API_SECRET` | 포트원 API Secret (결제 조회·빌링키 결제 인증용) |

---

## Buy Now (포트원 결제창)

### 흐름

1. 주문 생성 `POST /api/v1/shop/orders` → `orderId` 반환
2. 클라이언트는 `/shop/orders/buynow/pay?orderId={orderId}` 로 이동
3. pay 페이지에서 `GET /api/v1/shop/orders/[orderId]/payment/portone` 호출 → `storeId`, `channelKey`, `paymentId` 등 수신
4. `@portone/browser-sdk`의 `requestPayment()`로 결제창 호출
5. 사용자 결제 완료 후 `redirectUrl`로 리다이렉트 (`/shop/orders/buynow/result?orderId={orderId}`)
6. result 페이지에서 `POST /api/v1/shop/orders/[orderId]/payment/portone/verify` 호출 → 서버가 포트원 API로 결제 조회 후 금액 검증, `Order.paymentStatus=1` 갱신

### API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/shop/orders/[orderId]/payment/portone` | 결제창용 파라미터 (storeId, channelKey, paymentId 등) |
| POST | `/api/v1/shop/orders/[orderId]/payment/portone/verify` | 결제 검증 (포트원 결제 조회 후 금액 검증) |

---

## Fund (포트원 빌링키)

### 흐름 (현재 코드 기준)

1. **빌링키( customer_uid ) 등록**: Fund 택배 주문 페이지에서 카드 정보 입력 후 **카드 등록** → `POST /api/v1/fund/billing/reserve` → 서버가 아임포트 **`POST /subscribe/payments/onetime`** (`pg` = `PORTONE_BILLING_PG`)으로 소액 승인 후 **`cancel`** 로 환불. 성공 시 반환된 `customerUid`를 주문 시 `billingKey`로 저장.
2. **실결제 시점**: 펀딩 기간 종료·목표 달성 등 조건 충족 시 크론 등에서 **`chargeWithBillingKey`** (`POST .../subscribe/payments/again` 또는 V2 billing-key API) 호출.
3. **보조**: `PORTONE_V1_IMP_CODE` + `PORTONE_BILLING_PG` 가 모두 있으면 `GET /api/v1/payment/portone/billing-config`는 `mode: v1`을 반환한다. 둘 중 하나라도 비면 `mode: v2` + `storeId`/`channelKey`(브라우저 `requestIssueBillingKey`용)를 반환한다.

### KG이니시스로 Fund PG만 바꾸는 경우

- `PORTONE_BILLING_PG`를 **`html5_inicis.{PG상점아이디}`** 로 설정한다 (예: `html5_inicis.MOI6594311`). 일반결제 MID와 **정기·빌링(비인증) 특약이 붙은 MID**가 다를 수 있으니 KG이니시스/포트원에 확인한다.
- `PORTONE_V1_API_KEY` / `PORTONE_V1_API_SECRET` 은 그대로 두면 `chargeWithBillingKey`는 V1 `again` 경로를 사용한다(빌링키 발급 PG와 동일 계열이어야 한다).
- 헥토 전용 값(`settle.*`)은 제거한다.

### API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/payment/portone/billing-config` | 빌링키 발급용 storeId, channelKey 반환 |
| POST | `/api/v1/shop/orders/[orderId]/payment/portone/billing` | 빌링키로 결제 실행 |

### 환경 변수 (Fund 빌링키 발급)

| 변수 | 설명 |
|------|------|
| `PORTONE_BILLING_AUTH_AMOUNT` | 빌링키 발급 시 1원 승인에 쓰는 금액(기본 1). PG/카드사 최소금액 제한 시 `100` 등으로 설정 가능. 승인 후 즉시 취소됨. |

---

## 참고

- [포트원 개발자 문서](https://developers.portone.io)
- 결제 조회: `GET https://api.portone.io/payments/{paymentId}`
- 빌링키 결제: `POST https://api.portone.io/payments/{paymentId}/billing-key`
- 인증 헤더: `Authorization: PortOne {PORTONE_API_SECRET}`
