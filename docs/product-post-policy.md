# 상품글 정책 (최종본)

## A. 테이블 역할 정의

### 1) Product (운영본)
- 관리자 승인 후 데이터
- Shop/내등록상품/상품글관리 상품목록에 노출되는 데이터
- 구성 테이블
  - `Product`: 운영본 상품정보
  - `ProductImage`: 운영본 이미지
  - `ProductOption`: 운영본 옵션
  - `ProductOptionValue`: 운영본 옵션값

### 2) ProductUpdateRequest (요청본)
- 관리자 승인 전 데이터
- 판매자가 보낸 요청 데이터
- 상품글관리 등록요청/수정요청 목록에 노출되는 데이터
- 구성 테이블
  - `ProductUpdateRequest`: 요청본 상품정보
  - `ProductUpdateRequestImage`: 요청본 이미지
  - `ProductUpdateRequestOption`: 요청본 옵션
  - `ProductUpdateRequestOptionValue`: 요청본 옵션값

## B. 노출 기준

- 내가등록한상품 상품목록: `Product` (운영본)
- 상품글관리 상품목록: `Product` (운영본)
  - `isAdminApproved = true`
- Shop 상품목록: `Product` (운영본)
  - `isAdminApproved = true` AND `isPublic = true`
- Home 상품목록: `Product` (운영본)
  - `isAdminApproved = true` AND `isPublic = true` AND `isHome = true`
- 상품글관리 등록요청 상품목록: `ProductUpdateRequest` (요청본)
- 상품글관리 수정요청 상품목록: `ProductUpdateRequest` (요청본)

## C. 등록 요청 플로우

### 1) 판매자 등록 요청 시
- `ProductUpdateRequest` 관련 4개 테이블 생성
- `ProductUpdateRequestImage.noticeImgUrl = null` 이어야 함
- `Product` 상태 기본값
  - `isAdminApproved = false`
  - `isPublic = false`
  - `isHome = false`

### 2) 관리자 승인 전
- 내등록상품은 `Product`만 보이므로, 요청 데이터는 승인 전까지 노출되지 않음
- 상품글관리 등록요청목록에는 요청본(`ProductUpdateRequest`) 표시

### 3) 관리자 승인 시
- 고시이미지(필수값) 입력 + 필요시 요청본(`ProductUpdateRequest`) 수정
- 승인 결과를 요청본에 반영
- 요청본을 `Product`에 반영
- 처리 완료된 요청본은 삭제

### 4) 관리자 거부 시
- 요청본 row 삭제

## D. 수정 요청 플로우

### 1) 판매자 수정 요청 시
- `Product`는 그대로 유지
- 수정안은 `ProductUpdateRequest` 관련 4개 테이블에 저장
- 수정요청 payload의 `ProductUpdateRequestImage.noticeImgUrl`은 `null` 불가
  - 판매자 화면에는 기존 등록된 상품고시정보이미지가 보여야 함
  - 판매자는 기존 고시이미지를 유지하거나 새 이미지로 교체 가능

### 2) 관리자 승인 전
- Shop/내등록상품/상품글관리 상품목록은 기존 `Product` 그대로 표시
- 상품글관리 수정요청목록에는 요청본(`ProductUpdateRequest`) 표시

### 3) 관리자 승인 시
- 승인 결과를 요청본에 반영
- 요청본을 `Product`에 반영
- 처리 완료된 요청본은 삭제

### 4) 관리자 거부 시
- `Product` 변경 없음
- 요청본 row 삭제

## E. 요청본 개수 정책 (중요)

- 하나의 `Product`당 `ProductUpdateRequest`는 항상 `0`개 또는 `1`개만 유지
- 이미 요청본이 있는 상태에서 같은 상품의 새 수정요청이 들어오면,
  - 기존 요청본을 삭제하지 않고
  - 기존 요청본 데이터를 새 요청 데이터로 overwrite
