# 상품글 정책

## A. 테이블 역할 정의

- `Product`: 관리자 승인 완료된 운영본 (Shop/내등록상품/상품글관리 상품목록에 보이는 데이터)
- `ProductImage`: 운영본 이미지
- `ProductOption`: 운영본 옵션
- `ProductOptionValue`: 운영본 옵션값
- `ProductUpdateRequest`: 판매자가 보낸 등록/수정 요청 데이터(심사본)
- `ProductUpdateRequestImage`: 요청본 이미지
- `ProductUpdateRequestOption`: 요청본 옵션
- `ProductUpdateRequestOptionValue`: 요청본 옵션값

## B. 노출 기준

- Shop 노출 기준은 항상 `Product.isPublic`
- `ProductUpdateRequest`는 Shop 노출에 사용하지 않음
- 테이블 명에 `UpdateRequest`가 포함된 데이터는 요청용 임시 데이터이므로 일반 사용자(소비자)에게 노출되지 않아야 함

## C. 등록 요청 플로우

1. 판매자 등록 요청 시
- `Product` + `ProductUpdateRequest` 동시 생성
- `ProductUpdateRequestImage.noticeImgUrl = null` 이어야 함
- `Product.isAdminApproved = false`
- `Product.isPublic = false`
- `Product.isHome = false`

2. 관리자 승인 시
- 고시이미지 입력 + 필요시 입력값 수정
- 승인 결과를 `Product`와 `ProductUpdateRequest`에 반영

3. 관리자 거부 시
- `Product`(+이미지, 옵션), `ProductUpdateRequest`(+이미지, 옵션) 삭제

## D. 수정 요청 플로우

1. 판매자 수정 요청 시
- `Product`는 그대로 유지
- 수정안은 `ProductUpdateRequest`(+이미지, 옵션)에 저장

2. 관리자 승인 전
- Shop, 내등록상품, 상품글관리 > 상품목록은 기존 `Product` 그대로 표시
- 상품글관리 > 수정요청목록만 요청본(`ProductUpdateRequest`) 표시

3. 관리자 승인 시
- `ProductUpdateRequest` 내용을 `Product`에 반영

4. 관리자 거부 시
- `Product` 변경 없음
- `ProductUpdateRequest` 요청 row 삭제
