-- AlterTable
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "isHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isAdminApproved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductImage"
ADD COLUMN IF NOT EXISTS "noticeImgUrl" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductUpdateRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestType" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "goalAmount" INTEGER,
    "salesStartDate" TIMESTAMP(3) NOT NULL,
    "salesEndDate" TIMESTAMP(3) NOT NULL,
    "productionStartDate" TIMESTAMP(3),
    "productionEndDate" TIMESTAMP(3),
    "deliveryStartDate" TIMESTAMP(3),
    "deliveryEndDate" TIMESTAMP(3),
    "pickupStartDate" TIMESTAMP(3),
    "pickupEndDate" TIMESTAMP(3),
    "pickupLocation" TEXT,
    "receiveMethod" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductUpdateRequestImage" (
    "id" TEXT NOT NULL,
    "productUpdateRequestId" TEXT NOT NULL,
    "thumbnailImgUrl" TEXT NOT NULL,
    "detailImgUrl" TEXT[] NOT NULL,
    "noticeImgUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUpdateRequestImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequest_productId_idx" ON "ProductUpdateRequest"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequest_requestedByUserId_idx" ON "ProductUpdateRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequest_teamId_idx" ON "ProductUpdateRequest"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequest_requestType_idx" ON "ProductUpdateRequest"("requestType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequest_requestedAt_idx" ON "ProductUpdateRequest"("requestedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequestImage_productUpdateRequestId_idx" ON "ProductUpdateRequestImage"("productUpdateRequestId");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequest"
  ADD CONSTRAINT "ProductUpdateRequest_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequest"
  ADD CONSTRAINT "ProductUpdateRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequest"
  ADD CONSTRAINT "ProductUpdateRequest_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequestImage"
  ADD CONSTRAINT "ProductUpdateRequestImage_productUpdateRequestId_fkey"
  FOREIGN KEY ("productUpdateRequestId") REFERENCES "ProductUpdateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
