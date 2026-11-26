// #59 마이그레이션(20261113010000_add_pos_exposure_store_open) 뒤 한 번 실행: 기존 카테고리·상품의 노출 순서를 등록순 1부터 채운다.
// 이미 순서가 매겨진 묶음(번호가 0이 아닌 행이 있는 상점·카테고리)은 건드리지 않는다. 판매자가 저장한 순서를 덮지 않기 위해서다.
// 기본은 시험 실행(롤백). 실제 반영은 --apply.
//   NODE_PATH="$(pwd)/node_modules" node --env-file=.env scripts/backfill-exposure-order.js [--apply]
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();
const apply = process.argv.includes('--apply');
class Rollback extends Error {}

const CATEGORY_SQL = `
  with fresh as (select "storeId" from "OnsiteProductCategory" group by 1 having max("exposureOrder") = 0),
  ranked as (
    select c."categoryId", row_number() over (partition by c."storeId" order by c."createdAt", c."categoryId") n
    from "OnsiteProductCategory" c join fresh using ("storeId"))
  update "OnsiteProductCategory" c set "exposureOrder" = ranked.n from ranked where c."categoryId" = ranked."categoryId"`;

const PRODUCT_SQL = `
  with fresh as (
    select "storeId", "categoryId" from "OnsiteProduct" group by 1, 2 having max("exposureOrder") = 0),
  ranked as (
    select o."productId", row_number() over (partition by o."storeId", o."categoryId" order by o."createdAt", o."productId") n
    from "OnsiteProduct" o join fresh on fresh."storeId" = o."storeId" and fresh."categoryId" is not distinct from o."categoryId")
  update "OnsiteProduct" o set "exposureOrder" = ranked.n from ranked where o."productId" = ranked."productId"`;

const stats = (c) => c.$queryRawUnsafe(`select
  (select count(*)::int from "OnsiteProductCategory" where "exposureOrder" = 0) categories_zero,
  (select count(*)::int from "OnsiteProduct" where "exposureOrder" = 0) products_zero,
  (select count(*)::int from (select 1 from "OnsiteProduct" group by "storeId", "categoryId", "exposureOrder" having count(*) > 1) d) product_ties,
  (select count(*)::int from "OnsiteProduct" where not "isExposed") hidden_products,
  (select count(*)::int from "Store" where "isOpen") open_stores`);

(async () => {
  console.log(apply ? 'MODE: apply' : 'MODE: dry-run (rollback)');
  console.log('BEFORE', JSON.stringify((await stats(p))[0]));
  try {
    await p.$transaction(async (tx) => {
      const categories = await tx.$executeRawUnsafe(CATEGORY_SQL);
      const products = await tx.$executeRawUnsafe(PRODUCT_SQL);
      console.log('UPDATED categories:', categories, 'products:', products);
      console.log('IN TX ', JSON.stringify((await stats(tx))[0]));
      if (!apply) throw new Rollback();
    }, { timeout: 60000 });
  } catch (e) {
    if (!(e instanceof Rollback)) { console.log('FAILED', e.message); process.exitCode = 1; }
  }
  console.log('AFTER ', JSON.stringify((await stats(p))[0]));
})().finally(() => p.$disconnect());
