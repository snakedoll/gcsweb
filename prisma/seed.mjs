// 테스트 계정과 QR샵 시험 데이터 시드. 로컬 DB와 PR 미리보기 DB에서 같은 계정·데이터를 쓴다.
// 여러 번 실행해도 같은 상태로 맞춘다. 시험 상품은 없을 때만 만들어 PR에서 바꾼 재고·순서를 덮지 않는다.
//
// 명령어: npx prisma db seed
// 배포(npm start)에서는 `--if-enabled`로 돌며, 실행 조건이 아니면 아무것도 하지 않고 넘어간다.
//
// 실행 조건: localhost DB이거나 SEED_TEST_ACCOUNTS=true. Railway production 환경에서는 절대 돌지 않는다.
//
// 계정               비밀번호    권한
// admin@test.com    test1234   관리자(memberType=2)
// user@test.com     test1234   일반회원
// seller@test.com   test1234   QR샵 상점 주인(상점 @teststore)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const PASSWORD = 'test1234'; // 로그인 규칙: 영문+숫자 8~20자

const ACCOUNTS = [
  { email: 'admin@test.com', legacyEmail: 'admin@gcs.local', name: '관리자', nickname: 'local-admin', memberType: 2 },
  { email: 'user@test.com', legacyEmail: 'user@gcs.local', name: '일반회원', nickname: 'local-user', memberType: 0 },
  // QR샵 판매자: 판매 권한은 Store 보유 여부로 판단한다(isSeller와 무관).
  {
    email: 'seller@test.com',
    legacyEmail: 'seller@gcs.local',
    name: '판매자',
    nickname: 'local-seller',
    memberType: 0,
    store: { name: '테스트상점', storeSlug: 'teststore' },
  },
];

// 판매자 상점의 시험 데이터: 기본·품절 상품, 옵션 상품(품절 옵션 포함), 미분류 상품.
const PRODUCTS = [
  { category: '엽서', name: '엽서 A', price: 1000, stock: 30 },
  { category: '엽서', name: '엽서 B', price: 1200, stock: 0 },
  {
    category: '키링',
    name: '키링',
    price: 5000,
    options: [
      { name: '빨강', surcharge: 500, stock: 5 },
      { name: '파랑', surcharge: 0, stock: 0 },
    ],
  },
  { category: null, name: '스티커', price: 500, stock: 20 },
];

/** 실행해도 되는 DB인지. 아니면 이유를 돌려준다. */
function refusalReason() {
  if (process.env.RAILWAY_ENVIRONMENT_NAME === 'production') return 'Railway production 환경';
  const raw = process.env.DATABASE_URL;
  if (!raw) return 'DATABASE_URL 없음';
  if (LOCAL_HOSTS.has(new URL(raw).hostname)) return null;
  if (process.env.SEED_TEST_ACCOUNTS === 'true') return null;
  return '로컬 DB가 아니고 SEED_TEST_ACCOUNTS=true도 아님';
}

async function upsertAccount(prisma, password, { store, legacyEmail, ...account }) {
  // 옛 시드 계정(@gcs.local)이 있으면 새 이메일로 바꿔 상점·데이터를 그대로 잇는다.
  const [current, legacy] = await Promise.all([
    prisma.user.findUnique({ where: { email: account.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: legacyEmail }, select: { id: true } }),
  ]);
  if (!current && legacy) {
    await prisma.user.update({ where: { id: legacy.id }, data: { email: account.email } });
    console.log(`  ${legacyEmail} → ${account.email}`);
  }

  const fields = {
    password,
    name: account.name,
    memberType: account.memberType,
    signupMethod: 'EMAIL',
    isVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
  const user = await prisma.user.upsert({
    where: { email: account.email },
    update: fields,
    create: { email: account.email, nickname: account.nickname, ...fields },
    select: { id: true, email: true },
  });

  const saved = store
    ? await prisma.store.upsert({
        where: { userId: user.id },
        update: store,
        create: { userId: user.id, ...store },
        select: { storeId: true },
      })
    : null;

  console.log(`✓ ${user.email}${store ? ` (상점 @${store.storeSlug})` : ''}`);
  return saved;
}

async function seedProducts(prisma, storeId) {
  let created = 0;
  for (const product of PRODUCTS) {
    const exists = await prisma.onsiteProduct.findFirst({ where: { storeId, name: product.name }, select: { productId: true } });
    if (exists) continue;

    const category = product.category
      ? await prisma.onsiteProductCategory.upsert({
          where: { storeId_name: { storeId, name: product.category } },
          update: {},
          create: { storeId, name: product.category },
          select: { categoryId: true },
        })
      : null;
    const options = product.options ?? [];
    const stock = options.length ? options.reduce((sum, option) => sum + option.stock, 0) : product.stock;

    await prisma.onsiteProduct.create({
      data: {
        storeId,
        categoryId: category?.categoryId ?? null,
        name: product.name,
        price: product.price,
        hasOption: options.length > 0,
        initStock: stock,
        currentStock: stock,
        options: options.length
          ? { create: options.map((option) => ({ name: option.name, surcharge: option.surcharge, initStock: option.stock, currentStock: option.stock })) }
          : undefined,
      },
    });
    created += 1;
  }
  console.log(`✓ 시험 상품 ${created}개 추가 (이미 있는 상품은 그대로)`);
}

async function main() {
  const ifEnabled = process.argv.includes('--if-enabled');
  const refusal = refusalReason();
  if (refusal) {
    if (ifEnabled) return; // 운영 배포: 조용히 넘어간다
    throw new Error(`시드를 중단합니다: ${refusal}`);
  }

  const prisma = new PrismaClient();
  try {
    const password = await bcrypt.hash(PASSWORD, 10);
    for (const account of ACCOUNTS) {
      const store = await upsertAccount(prisma, password, account);
      if (store) await seedProducts(prisma, store.storeId);
    }
    console.log(`비밀번호: ${PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed]', error.message ?? error);
  // 배포 중 시드 실패가 미리보기 서버 시작을 막지 않게 한다.
  process.exit(process.argv.includes('--if-enabled') ? 0 : 1);
});
