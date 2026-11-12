-- 판매자 환불(전체 주문 조회)의 환불 의도. PortOne 취소 전에 먼저 저장해,
-- 취소 뒤 DB 반영이 실패해도 웹훅(Transaction.Cancelled)이나 재요청이 마무리할 수 있게 한다.
-- 컬럼 추가만 하고 기존 행은 바꾸지 않는다.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN "refundRestoreStock" BOOLEAN,
ADD COLUMN "refundedByUserId" TEXT;
