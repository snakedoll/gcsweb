-- CreateTable
CREATE TABLE IF NOT EXISTS "Term" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mainTitle" TEXT NOT NULL,
    "subTitle" TEXT,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Term_type_idx" ON "Term"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Term_order_idx" ON "Term"("order");
