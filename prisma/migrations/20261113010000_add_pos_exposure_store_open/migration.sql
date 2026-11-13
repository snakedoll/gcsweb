-- 현장 포스 노출 편집과 QR샵 열림/닫힘(#59).
-- 기존 상점은 닫힘으로 시작한다(판매자가 현장 포스 토글로 연다). 기존 상품은 노출, 순서는 0(같으면 등록순)이며
-- 번호는 scripts/backfill-exposure-order.js 로 채운다.

-- AlterTable
ALTER TABLE "OnsiteProduct" ADD COLUMN     "exposureOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isExposed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "OnsiteProductCategory" ADD COLUMN     "exposureOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT false;
