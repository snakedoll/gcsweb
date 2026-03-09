# 결제 연동 (KG이니시스 / 헥토파이낸셜)

## 개요

- **Buy Now 상품**: KG이니시스 모바일 웹 결제
- **Fund 상품**: 헥토파이낸셜 빌링키 결제

테스트용 API Key는 `.env`에 설정 후 사용한다.

---

## 환경 변수

| 변수 | 용도 |
|------|------|
| `KG_INICIS_MID` | 이니시스 상점아이디 |
| `KG_INICIS_SIGNKEY` | 이니시스 서명키 |
| `KG_INICIS_GATEWAY_URL` | 모바일 결제 게이트웨이 URL (예: `https://mobile.inicis.com/smart/payment/`) |
| `KG_INICIS_RETURN_URL` | 결제 완료 후 리다이렉트 수신 URL (예: `http://localhost:3000/api/v1/payment/inicis/return`) |
| `HECTO_API_KEY` | 헥토파이낸셜 API Key |
| `HECTO_API_SECRET` | 헥토파이낸셜 API Secret |
| `HECTO_BILLING_API_URL` | 헥토 빌링키 결제 API Base URL |

---

## Buy Now (KG이니시스 — 모바일 웹 결제)

### 흐름

1. 주문 생성 `POST /api/v1/shop/orders` → `orderId` 반환
2. 클라이언트는 `/shop/orders/buynow/pay?orderId={orderId}` 로 이동
3. pay 페이지에서 `GET /api/v1/shop/orders/[orderId]/payment/inicis` 호출 → `gatewayUrl`, `params` 수신
4. params로 폼을 구성하고 `gatewayUrl`로 form POST → 이니시스 모바일 결제 페이지로 이동
5. 사용자 결제 완료 후, 이니시스가 `P_NEXT_URL` (`KG_INICIS_RETURN_URL`)로 리다이렉트 (GET)
6. return 핸들러에서:
   - `P_STATUS === "00"` 이고 `P_AMT`가 주문 금액과 일치하면 `Order.paymentStatus = 1` 갱신
   - `/shop/orders/buynow/result?status=success` 로 리다이렉트
7. result 페이지에서 결과 표시

### 모바일 결제 파라미터 (P_ prefix)

| 파라미터 | 설명 |
|----------|------|
| `P_INI_PAYMENT` | 결제 수단 (CARD) |
| `P_MID` | 상점 아이디 |
| `P_OID` | 주문 번호 |
| `P_AMT` | 결제 금액 |
| `P_GOODS` | 상품명 |
| `P_UNAME` | 구매자명 |
| `P_MOBILE` | 구매자 연락처 |
| `P_NEXT_URL` | 결제 후 리다이렉트 URL |
| `P_CHARSET` | utf8 |

참고: [KG이니시스 매뉴얼](https://manual.inicis.com)

---

## Fund (헥토파이낸셜 빌링키)

1. (선택) 빌링키 발급: 클라이언트에서 헥토 제공 결제창/팝업으로 카드 등록 후 `billingKey` 획득
2. **주문 생성 시 결제**: `POST /api/v1/shop/orders` body에 `billingKey`(선택) 포함. Fund+카드이고 `billingKey`가 있으면 생성 직후 `chargeWithBillingKey` 호출, 성공 시 `paymentStatus=1` 갱신. 응답 `data.paymentConfirmed`로 결제 완료 여부 확인.
3. **주문 생성 후 결제**: `POST /api/v1/shop/orders/[orderId]/payment/hecto` body `{ billingKey }` 로 빌링키 결제 실행. 성공 시 해당 주문 `paymentStatus=1` 갱신.
4. `lib/payment/hecto.ts`의 `chargeWithBillingKey`는 헥토 API 스펙 확정 후 실제 HTTP 호출 구현 필요(현재 스텁).

참고: [헥토파이낸셜 개발 지원](https://develop.sbsvc.online)
