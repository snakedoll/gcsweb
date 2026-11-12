-- 현장결제 수단(카드/현금/계좌이체). 전체 주문 조회의 결제수단 열과 대시보드 집계에 쓴다.
-- 컬럼 추가만 하고 기존 행은 null로 둔다(이 칸이 생기기 전 현장결제 주문은 수단을 모른다).

-- CreateEnum
CREATE TYPE "OnsitePaymentType" AS ENUM ('CARD', 'CASH', 'TRANSFER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "onsitePaymentType" "OnsitePaymentType";

-- 온라인 결제 주문에는 현장결제 수단이 들어갈 수 없다.
ALTER TABLE "Order"
ADD CONSTRAINT "Order_onsite_payment_type_by_method_check" CHECK (
  "paymentMethod" = 'ON_SITE' OR "onsitePaymentType" IS NULL
);
