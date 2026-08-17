-- Rename "Proejct Year" to "Project Year"
ALTER TABLE "Proejct Year" RENAME TO "Project Year";
ALTER TABLE "Proejct Year_pkey" RENAME TO "Project Year_pkey";

-- Drop foreign keys for ProductUpdateRequest and its related tables
ALTER TABLE "ProductUpdateRequestOptionValue" DROP CONSTRAINT "ProductUpdateRequestOptionValue_optionId_fkey";
ALTER TABLE "ProductUpdateRequestOption" DROP CONSTRAINT "ProductUpdateRequestOption_productUpdateRequestId_fkey";
ALTER TABLE "ProductUpdateRequestImage" DROP CONSTRAINT "ProductUpdateRequestImage_productUpdateRequestId_fkey";
ALTER TABLE "ProductUpdateRequest" DROP CONSTRAINT "ProductUpdateRequest_productId_fkey";
ALTER TABLE "ProductUpdateRequest" DROP CONSTRAINT "ProductUpdateRequest_requestedByUserId_fkey";
ALTER TABLE "ProductUpdateRequest" DROP CONSTRAINT "ProductUpdateRequest_teamId_fkey";

-- Drop the tables
DROP TABLE "ProductUpdateRequestOptionValue";
DROP TABLE "ProductUpdateRequestOption";
DROP TABLE "ProductUpdateRequestImage";
DROP TABLE "ProductUpdateRequest";

-- Make noticeImgUrl optional in Image table
ALTER TABLE "Image" ALTER COLUMN "noticeImgUrl" DROP NOT NULL;

-- Create OnsiteProduct table
CREATE TABLE "OnsiteProduct" (
    "id" TEXT NOT NULL,
    "qrItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "option" TEXT,
    "price" INTEGER NOT NULL,
    "emoji" TEXT,
    "initStock" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnsiteProduct_pkey" PRIMARY KEY ("id")
);

-- Create Unique Index for OnsiteProduct
CREATE UNIQUE INDEX "OnsiteProduct_qrItemId_key" ON "OnsiteProduct"("qrItemId");
CREATE INDEX "OnsiteProduct_qrItemId_idx" ON "OnsiteProduct"("qrItemId");
