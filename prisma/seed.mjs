// 로컬 개발용 테스트 계정 시드.
// 로컬 DB(localhost)에서만 동작하며, 여러 번 실행해도 같은 상태로 맞춘다(upsert).
//
// 명령어: npx prisma db seed
// 
// 계정                비밀번호     권한
// admin@gcs.local    test1234   관리자(memberType=2)
// user@gcs.local     test1234   일반회원
// seller@gcs.local   test1234   QR샵 판매자(상점 @localseller)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const PASSWORD = 'test1234'; // 로그인 규칙: 영문+숫자 8~20자

const ACCOUNTS = [
  { email: 'admin@gcs.local', name: '관리자', nickname: 'local-admin', memberType: 2 },
  { email: 'user@gcs.local', name: '일반회원', nickname: 'local-user', memberType: 0 },
  // QR샵 판매자: 판매 권한은 Store 보유 여부로 판단한다(isSeller와 무관).
  {
    email: 'seller@gcs.local',
    name: '판매자',
    nickname: 'local-seller',
    memberType: 0,
    store: { name: '테스트상점', storeSlug: 'localseller' },
  },
];

function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL이 설정되지 않았습니다.');
  const { hostname } = new URL(raw);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`로컬 DB가 아니므로 시드를 중단합니다 (host: ${hostname}).`);
  }
}

async function main() {
  assertLocalDatabase();
  const prisma = new PrismaClient();
  try {
    const password = await bcrypt.hash(PASSWORD, 10);

    for (const { store, ...account } of ACCOUNTS) {
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

      if (store) {
        await prisma.store.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, ...store },
        });
      }

      console.log(`✓ ${user.email}${store ? ` (상점 @${store.storeSlug})` : ''}`);
    }

    console.log(`비밀번호: ${PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
