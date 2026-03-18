# 결제 연동 (포트원)

## 개요

- **Buy Now 상품**: 포트원 결제창 SDK (KG이니시스 채널)
- **Fund 상품**: 포트원 빌링키 결제 (헥토파이낸셜 채널)

환경 변수는 `.env`에 설정한다.

---

## 환경 변수

| 변수 | 용도 |
|------|------|
| `PORTONE_STORE_ID` | 포트원 스토어 ID |
| `PORTONE_CHANNEL_KEY` | Buy Now 결제 채널 Key (KG이니시스) |
| `PORTONE_BILLING_CHANNEL_KEY` | Fund 빌링키 채널 Key (헥토파이낸셜) |
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

### 흐름

1. **빌링키 발급**: Fund 주문 페이지에서 "카드 등록" 클릭 → `GET /api/v1/payment/portone/billing-config`로 `storeId`, `channelKey` 조회 → `PortOne.requestIssueBillingKey()` 호출 → 발급된 `billingKey` 입력 필드에 반영
2. **주문 생성 시 결제**: `POST /api/v1/shop/orders` body에 `billingKey` 포함. Fund+카드이고 `billingKey`가 있으면 생성 직후 `chargeWithBillingKey` 호출, 성공 시 `paymentStatus=1` 갱신.
3. **주문 생성 후 결제**: `POST /api/v1/shop/orders/[orderId]/payment/portone/billing` body `{ billingKey }` 로 빌링키 결제 실행. 성공 시 해당 주문 `paymentStatus=1` 갱신.

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
