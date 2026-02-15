'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

function IconSettings() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="text-[#443e3c]"
    >
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session;
  const isMypageRoot = pathname === '/mypage';
  const isMypage = pathname === '/mypage' || pathname?.startsWith('/mypage/');

  return (
    <div className="w-full border-b border-[#f1f1f1] bg-[#f6f6f5] shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
      <div className="h-[34px] w-full bg-[#f6f6f5]" />
      <div className="mx-auto flex h-[44px] w-full max-w-[375px] items-center justify-between px-4 py-[10px]">
        {isMypageRoot ? (
          <>
            <Link
              href="/"
              aria-label="뒤로 가기"
              className="inline-flex h-6 w-6 items-center justify-center"
            >
              <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
            </Link>
            <span className="text-lg font-bold text-[#443e3c]">마이페이지</span>
            <Link
              href="/mypage/settings"
              aria-label="설정"
              className="inline-flex h-6 w-6 items-center justify-center"
            >
              <IconSettings />
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
            <span className="text-lg font-bold text-[#443e3c]">마이페이지</span>
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
