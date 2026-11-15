-- 현장 포스 결제 완료(#58): 같은 결제가 두 번 처리되지 않게 요청 키를, 정산 추적용으로 결제를 등록한 사람을 남긴다.
-- 두 칸 모두 NULL 허용이라 기존 주문에는 영향이 없다(기존 행은 NULL, NULL은 unique 충돌이 없다).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "soldByUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientRequestId_key" ON "Order"("clientRequestId");
