-- QR샵 주문번호를 결제 확정 때 발급한다(#41).
-- OrderNumber 행은 주문 생성 때 만들어 주문과 상점을 잇고, 번호·일자는 결제 확정 때 채운다. 결제 전에는 null.
-- unique(storeId, orderTimeKey, orderNo)는 null끼리 겹치지 않으므로 그대로 둔다.
-- 컬럼 추가와 NOT NULL 해제만 하고 기존 행은 바꾸지 않는다.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderNumber" ALTER COLUMN "orderNo" DROP NOT NULL,
ALTER COLUMN "orderTimeKey" DROP NOT NULL;
