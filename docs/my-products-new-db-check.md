# /mypage/my-products/new 등록 요청 시 DB 적합성 검토

## 1. 페이지 구현 요약

- **단계 구성**: 3단계(옵션에 따라 1~3단계)
  - **Step1**: 판매팀, 상품명, 상품 설명, 상품 유형(Fund/Buy Now/Partner Up), 수령 방식(택배/현장 수령), 판매 시작·종료일, 썸네일·상세 이미지
  - **Step2**: 상품 유형별 분기
    - **Fund + 택배**: 목표금액, 제작 시작·종료일, 배송 시작·종료일
    - **Fund + 현장 수령**: 목표금액, 수령 시작·종료일, 수령 장소
    - **Buy Now**: 가격, 옵션(옵션명 + 값·추가가격 배열)
  - **Step3**(Fund만): 가격, 옵션(동일 구조)
- **등록 요청**: 현재 **API 연동 미구현**(TODO). 폼 데이터만 조합 후 `router.push('/mypage/my-products')` 처리.

---

## 2. 등록 시 DB에 넣어야 할 데이터(폼 기준)

| 구분 | 폼 필드 | 비고 |
|------|---------|------|
| 공통 | teamId, name, description, type, receiveMethod, salesStartDate, salesEndDate | Step1 |
| 공통 | 썸네일 1장, 상세 이미지 N장 | Step1 |
| Fund 택배 | goalAmount, productionStartDate, productionEndDate, deliveryStartDate, deliveryEndDate | Step2 |
| Fund 현장 | goalAmount, pickupStartDate, pickupEndDate, pickupLocation | Step2 |
| Buy Now / Fund Step3 | price, options: [{ optionName, values: [{ value, extraPrice }] }] | Step2 또는 Step3 |

---

## 3. 현재 DB 스키마(Prisma) vs 제공 ERD

### 3.1 Product 테이블

| ERD 필드 | 현재 Prisma Product | 비고 |
|----------|---------------------|------|
| productId / userId | id (cuid) / **teamId** | 현재는 팀 단위 등록(teamId), ERD는 userId. 프로젝트는 팀 기준으로 일치. |
| categoryId | **없음** | ERD에는 있음. 현재 폼에 카테고리 선택 없음. |
| title | name | 동일 개념. |
| description | description | 있음. |
| price | price | 있음. |
| minOrderQuantity / maxOrderQuantity | **없음** | ERD에만 있음. 폼에도 없음. |
| imageUrls (JSON) | **ProductImage** 테이블로 분리 | thumbnailImgUrl, detailImgUrl[] 구조로 저장 가능. |
| status (pending/approved/rejected) | status Int (0=pending, 1=active, 2=completed) | 등록 요청 시 0(pending) 저장 가능. rejected는 값 미정의. |
| 기타 | salesStartDate, salesEndDate, goalAmount, receiveMethod | 있음. |
| productionStartDate, deliveryStartDate | 있음. | |
| **productionEndDate**, **deliveryEndDate** | **없음** | Fund 택배의 제작·배송 **종료일** 저장 불가. |
| **pickupStartDate**, **pickupEndDate**, **pickupLocation** | **없음** | Fund 현장 수령 정보 저장 불가. |

### 3.2 ProductOption / ProductOptionValue (ERD: ProductOption)

| ERD ProductOption | 현재 Prisma | 비고 |
|-------------------|-------------|------|
| name, price, stock | ProductOption: optionName. ProductOptionValue: value, additionalPrice | 옵션명·값·추가가격 구조로 폼과 일치. 옵션별 price/stock은 Variant 쪽에 있음. |
| - | ProductVariant (variantName, unitPrice, stock) | 옵션 조합별 가격·재고는 Variant로 저장 가능. |

폼의 `options: [{ optionName, values: [{ value, extraPrice }] }]` → **ProductOption** + **ProductOptionValue**로 그대로 매핑 가능.

### 3.3 ProductImage

| ERD | 현재 Prisma ProductImage | 비고 |
|-----|--------------------------|------|
| imageUrls | thumbnailImgUrl, detailImgUrl (배열) | 썸네일 1장 + 상세 N장 저장 가능. |

### 3.4 Team / isSalesTeam

ERD의 Team에 isSalesTeam 등 팀 구분 필드 있음. 현재 스키마에 **isSalesTeam** 이미 반영됨.

---

## 4. 결론: 등록 요청 시 DB 적합성

### 4.1 현재 구조로 저장 가능한 항목

- **Product**: teamId, name, description, type, status(0), price, goalAmount, salesStartDate, salesEndDate, receiveMethod, productionStartDate, deliveryStartDate
- **ProductOption** + **ProductOptionValue**: 상품 유형별 옵션(optionName, value, additionalPrice)
- **ProductImage**: 썸네일 1장, 상세 이미지 배열
- **ProductVariant**: 옵션 조합별 unitPrice/stock이 필요하면 추가 구현 가능

즉, **Buy Now**와 **Fund 중 택배 배송(제작·배송 종료일 없이)** 까지는 현재 테이블만으로 등록 요청 데이터를 넣을 수 있음.

### 4.2 부족한 필드(등록 API 구현 시 필요)

1. **Fund + 현장 수령**
   - `pickupStartDate`, `pickupEndDate`, `pickupLocation` → **Product에 컬럼 없음.**

2. **Fund + 택배**
   - `productionEndDate`, `deliveryEndDate` → **Product에 컬럼 없음.** (현재는 Start만 존재)

위 필드를 쓰려면 **Product 테이블에 컬럼 추가**하거나, 별도 보조 테이블/JSON 필드로 보완해야 함.

### 4.3 ERD 대비 추가 검토 사항

- **ProductCategory**: ERD에는 categoryId 있음. 현재 폼·API에 카테고리 없음. 추후 상품 카테고리 도입 시 Product에 categoryId 추가 필요.
- **status**: rejected 등 “승인 거절” 상태를 쓸 경우 status 값 정의 추가 필요.
- **minOrderQuantity / maxOrderQuantity**: ERD에만 있고 폼에도 없음. 필요 시 Product에 추가.

---

## 5. 요약 표

| 항목 | 현재 DB로 저장 가능 여부 | 비고 |
|------|--------------------------|------|
| 팀·기본 정보·가격·일정(시작일) | ✅ 가능 | |
| 옵션(이름·값·추가가격) | ✅ 가능 | ProductOption + ProductOptionValue |
| 썸네일·상세 이미지 | ✅ 가능 | ProductImage |
| Fund 택배 – 제작·배송 **종료일** | ❌ 불가 | productionEndDate, deliveryEndDate 없음 |
| Fund 현장 – 수령 기간·장소 | ❌ 불가 | pickupStartDate, pickupEndDate, pickupLocation 없음 |
| 등록 API | 미구현 | 등록 요청 버튼은 TODO 상태 |

**정리**: 현재 DB는 **옵션/이미지/팀/기본 상품 정보**까지는 ERD와 유사하게 갖추고 있어, “등록 요청” 시 **Buy Now** 및 **Fund 택배(종료일 제외)** 는 테이블 구조만으로 저장 가능하다. **Fund 현장 수령**과 **Fund 택배의 종료일**을 저장하려면 **Product에 해당 컬럼을 추가**하는 것이 필요하다.
