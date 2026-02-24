# Product 테이블 컬럼 추가 정리 (팀 공유용)

**작성일**: 2025-02-25  
**목적**: `/mypage/my-products/new` 상품 등록 요청 시 수집하는 데이터를 DB에 저장하기 위해 부족했던 컬럼을 추가했습니다.

---

## 1. 어떤 테이블에 무엇을 추가했는지

| 테이블 | 추가한 속성(컬럼) | 타입 | NULL | 설명 |
|--------|-------------------|------|------|------|
| **Product** | `productionEndDate` | DateTime | O | 제작 종료일 |
| **Product** | `deliveryEndDate`   | DateTime | O | 배송 종료일 |
| **Product** | `pickupStartDate`   | DateTime | O | 수령 시작일 |
| **Product** | `pickupEndDate`    | DateTime | O | 수령 종료일 |
| **Product** | `pickupLocation`   | String (TEXT) | O | 수령 장소 |

모두 **Product** 테이블에만 추가했으며, 다른 테이블은 변경하지 않았습니다.

---

## 2. 각 속성을 넣은 이유 (요구사항 기준)

- **상품 등록 플로우**
  - 3단계 구성, 상품 유형(Fund / Buy Now / Partner Up)과 수령 방식(택배 / 현장 수령)에 따라 입력 항목이 달라짐.
  - “등록 요청” 시 이 입력값들을 그대로 DB에 넣을 수 있어야 함.

- **기존 Product만으로는 부족했던 부분**
  - Fund + **택배**: 제작 **종료일**, 배송 **종료일** → 기존에는 시작일만 있어 종료일을 저장할 수 없었음.
  - Fund + **현장 수령**: 수령 **시작일**, 수령 **종료일**, **수령 장소** → 저장할 컬럼이 없었음.

그래서 위 5개 컬럼을 Product에 추가했습니다.

| 추가 속성 | 이유 (어디서 쓰이는지) |
|-----------|------------------------|
| `productionEndDate` | **Fund + 택배** 2단계에서 입력하는 “제작 종료일”을 저장하기 위해. |
| `deliveryEndDate`   | **Fund + 택배** 2단계에서 입력하는 “배송 종료일”을 저장하기 위해. |
| `pickupStartDate`   | **Fund + 현장 수령** 2단계에서 입력하는 “수령 시작일”을 저장하기 위해. |
| `pickupEndDate`     | **Fund + 현장 수령** 2단계에서 입력하는 “수령 종료일”을 저장하기 위해. |
| `pickupLocation`    | **Fund + 현장 수령** 2단계에서 입력하는 “수령 장소”를 저장하기 위해. |

- **NULL 허용**
  - 상품 유형/수령 방식에 따라 해당 필드가 없을 수 있으므로, 모두 **nullable**로 두었습니다.
  - 예: Buy Now 상품은 `productionEndDate`, `pickupLocation` 등이 없음.

---

## 3. 마이그레이션 정보

- **마이그레이션 이름**: `20260225100000_add_product_fund_pickup_delivery_fields`
- **경로**: `prisma/migrations/20260225100000_add_product_fund_pickup_delivery_fields/migration.sql`
- **적용 방법**
  - 로컬: `npx prisma migrate dev`
  - 배포: `npx prisma migrate deploy`
- 적용 후 `npx prisma generate`로 클라이언트 재생성 권장.

---

## 4. 정리 (한 줄 요약)

- **테이블**: **Product** 하나만 수정.
- **추가한 속성**: `productionEndDate`, `deliveryEndDate`, `pickupStartDate`, `pickupEndDate`, `pickupLocation` (총 5개).
- **이유**: 상품 등록 화면에서 입력하는 “Fund 택배의 제작/배송 종료일”과 “Fund 현장 수령의 수령 기간·장소”를 DB에 저장하기 위함.

이 문서를 팀원들과 공유하면, “어느 테이블에 어떤 컬럼을 왜 추가했는지”를 그대로 전달할 수 있습니다.

---

## 5. 관련 구현 (등록 요청 API)

- **엔드포인트**: `POST /api/v1/mypage/products`
- **역할**: `/mypage/my-products/new`에서 “등록 요청” 시 위 Product/옵션/이미지 데이터를 DB에 저장.
- **이미지 업로드**: `POST /api/v1/images`에 `usage=PRODUCT_THUMBNAIL` 또는 `usage=PRODUCT_DETAIL`로 먼저 업로드한 뒤, 반환된 URL을 등록 API body에 `thumbnailImgUrl`, `detailImgUrls`로 전달.
