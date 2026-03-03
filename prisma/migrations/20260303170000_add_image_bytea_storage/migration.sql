-- AlterTable: Add bytea data column and createdAt to Image
ALTER TABLE "Image" ADD COLUMN "data" BYTEA;
ALTER TABLE "Image" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Image" ALTER COLUMN "imageUrl" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "Image_usage_idx" ON "Image"("usage");
