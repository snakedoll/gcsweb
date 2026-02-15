'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session;
  const isMypageRoot = pathname === '/mypage';
  const isMypage = pathname === '/mypage' || pathname?.startsWith('/mypage/');

  return (
    <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
      <div className="h-[34px] w-full bg-neutral-3" />
      <div className="mx-auto flex h-[44px] w-full max-w-[375px] items-center justify-between px-4 py-[10px]">
        {isMypageRoot ? (
          <>
            <Link href="/" aria-label="뒤로 가기" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
            </Link>
            <span className="typo-heading-xxsmall text-neutral-12">마이페이지</span>
            <Link href="/mypage/settings" aria-label="설정" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-settings.svg" alt="" width={24} height={24} />
            </Link>
          </>
        ) : isMypage ? (
          <>
            <Link
              href={isLoggedIn ? '/mypage' : '/login'}
              aria-label={isLoggedIn ? '마이페이지' : '로그인'}
              className="inline-flex h-6 w-6 items-center justify-center"
            >
              <Image src="/assets/icons/icon-user-nav.svg" alt="" width={24} height={24} />
            </Link>
            <span className="typo-heading-xxsmall text-neutral-12">마이페이지</span>
            <Link href="/cart" aria-label="장바구니" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-cart-nav.svg" alt="" width={24} height={24} />
            </Link>
          </>
        ) : (
          <>
            <Link
              href={isLoggedIn ? '/mypage' : '/login'}
              aria-label={isLoggedIn ? '마이페이지' : '로그인'}
              className="inline-flex h-6 w-6 items-center justify-center"
            >
              <Image src="/assets/icons/icon-user-nav.svg" alt="" width={24} height={24} />
            </Link>
            <Link href="/" aria-label="홈" className="inline-flex items-center justify-center">
              <Image src="/assets/logos/logo-gcs.svg" alt="GCS" width={53} height={19} />
            </Link>
            <Link href="/cart" aria-label="장바구니" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-cart-nav.svg" alt="" width={24} height={24} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
