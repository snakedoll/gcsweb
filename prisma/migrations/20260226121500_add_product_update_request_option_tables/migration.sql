-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductUpdateRequestOption" (
    "id" TEXT NOT NULL,
    "productUpdateRequestId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,

    CONSTRAINT "ProductUpdateRequestOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductUpdateRequestOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "additionalPrice" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductUpdateRequestOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequestOption_productUpdateRequestId_idx"
ON "ProductUpdateRequestOption"("productUpdateRequestId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductUpdateRequestOption_productUpdateRequestId_optionName_key"
ON "ProductUpdateRequestOption"("productUpdateRequestId", "optionName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductUpdateRequestOptionValue_optionId_idx"
ON "ProductUpdateRequestOptionValue"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductUpdateRequestOptionValue_optionId_value_key"
ON "ProductUpdateRequestOptionValue"("optionId", "value");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequestOption"
  ADD CONSTRAINT "ProductUpdateRequestOption_productUpdateRequestId_fkey"
  FOREIGN KEY ("productUpdateRequestId") REFERENCES "ProductUpdateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequestOptionValue"
  ADD CONSTRAINT "ProductUpdateRequestOptionValue_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "ProductUpdateRequestOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
