-- FairShop: 분석용 currentStock (미충족 수요 누적, 음수 허용)
ALTER TABLE "FairShopProductTable" ADD COLUMN "currentStock" INTEGER NOT NULL DEFAULT 0;
