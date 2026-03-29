-- FairShop (QRshop) 재고·주문 이력
CREATE TABLE "FairShopProductTable" (
    "id" TEXT NOT NULL,
    "qrItemId" TEXT NOT NULL,
    "initStock" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FairShopProductTable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FairShopProductTable_qrItemId_key" ON "FairShopProductTable"("qrItemId");

CREATE TABLE "FairShopHistoryTable" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" INTEGER NOT NULL,
    "paymentAmount" INTEGER NOT NULL,
    "linesSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairShopHistoryTable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FairShopHistoryTable_orderId_key" ON "FairShopHistoryTable"("orderId");

CREATE INDEX "FairShopHistoryTable_createdAt_idx" ON "FairShopHistoryTable"("createdAt");

ALTER TABLE "FairShopHistoryTable" ADD CONSTRAINT "FairShopHistoryTable_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
