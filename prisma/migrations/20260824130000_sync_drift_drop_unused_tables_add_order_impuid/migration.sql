-- Syncs pre-existing drift between the migration history and schema.prisma.
--
-- IMPORTANT: written idempotently (IF EXISTS / IF NOT EXISTS / CASCADE) because
-- production's live schema was already patched to this target state by hand,
-- outside of Prisma's migration tracking (verified via `railway` against the
-- lively-hope Postgres service on 2026-08-24: News/Review/ReviewImage/
-- FairShopHistoryTable already absent, Order.impUid already present, Like.newsId
-- already absent). A fresh DB built by replaying migration history from scratch
-- is NOT in that state yet, so this migration still needs to do the work there.

-- News/Review/ReviewImage/FairShopHistoryTable: removed from schema.prisma
-- previously; CASCADE also drops their dependent FKs/indexes (Review->User/Product,
-- ReviewImage->Review, FairShopHistoryTable->Order, Like.newsId->News).
DROP TABLE IF EXISTS "ReviewImage" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "News" CASCADE;
DROP TABLE IF EXISTS "FairShopHistoryTable" CASCADE;

-- Like.newsId: dropping the column also drops its FK/unique index if still present.
ALTER TABLE "Like" DROP COLUMN IF EXISTS "newsId";

-- Order.impUid: present in schema.prisma but never added via a tracked migration.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "impUid" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_impUid_key" ON "Order"("impUid");
