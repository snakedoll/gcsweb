const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
class Rollback extends Error {}
const sql = fs.readFileSync('prisma/migrations/20261113010000_add_pos_exposure_store_open/migration.sql', 'utf8');
const stmts = sql.split(/;\s*\n/).map(s => s.replace(/^--.*$/gm, '').trim()).filter(Boolean);
const cols = (c) => c.$queryRawUnsafe(`select table_name||'.'||column_name c from information_schema.columns
  where (table_name, column_name) in (('Store','isOpen'),('OnsiteProduct','isExposed'),('OnsiteProduct','exposureOrder'),('OnsiteProductCategory','exposureOrder'))`);
const counts = (c) => c.$queryRawUnsafe(`select
  (select count(*)::int from "Store") stores,
  (select count(*)::int from "OnsiteProduct") products,
  (select count(*)::int from "OnsiteProductCategory") categories,
  (select coalesce(sum("currentStock"),0)::int from "OnsiteProduct") stock`);
const values = (c) => c.$queryRawUnsafe(`select
  (select count(*)::int from "Store" where "isOpen") open_stores,
  (select count(*)::int from "OnsiteProduct" where not "isExposed") hidden_products,
  (select count(*)::int from "OnsiteProduct" where "exposureOrder"<>0) ordered_products,
  (select count(*)::int from "OnsiteProductCategory" where "exposureOrder"<>0) ordered_categories`);
(async () => {
  console.log('BEFORE cols:', (await cols(p)).length, JSON.stringify((await counts(p))[0]));
  try {
    await p.$transaction(async (tx) => {
      for (const s of stmts) await tx.$executeRawUnsafe(s);
      console.log('IN TX cols:', (await cols(tx)).length, JSON.stringify((await counts(tx))[0]));
      console.log('IN TX values:', JSON.stringify((await values(tx))[0]));
      throw new Rollback();
    }, { timeout: 60000 });
  } catch (e) { if (!(e instanceof Rollback)) { console.log('FAILED', e.message); process.exitCode = 1; } }
  console.log('AFTER cols:', (await cols(p)).length, JSON.stringify((await counts(p))[0]));
})().finally(() => p.$disconnect());
