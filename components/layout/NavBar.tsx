'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type NavBarVariant =
  | 'default'
  | 'logo-back'
  | 'title-back'
  | 'title'
  | 'home'
  | 'back'
  | 'title-back-trash';

interface NavBarProps {
  variant?: NavBarVariant;
  title?: string;
  userHref?: string;
  cartHref?: string;
  homeHref?: string;
  onBack?: () => void;
  onTrash?: () => void;
}

export default function NavBar({
  variant: variantProp,
  title = '타이틀',
  userHref,
  cartHref = '/cart',
  homeHref = '/',
  onBack,
  onTrash,
}: NavBarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session;
  const isMypageRoot = pathname === '/mypage';
  const isMypage = pathname === '/mypage' || pathname?.startsWith('/mypage/');
  const resolvedUserHref = userHref ?? (isLoggedIn ? '/mypage' : '/login');

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  const handleHeroIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    if (isLoggedIn) {
      router.push('/mypage');
      return;
    }
    router.push('/login');
  };

  const barClass =
    'mx-auto flex h-[44px] w-full max-w-[375px] items-center justify-between px-4 py-[10px]';

  if (variantProp === 'home') {
    return (
      <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
        <div className="h-[34px] w-full bg-neutral-3" />
        <div className={barClass}>
          <Link href={homeHref} aria-label="홈" className="inline-flex h-6 w-6 items-center justify-center">
            <Image src="/assets/icons/icon-home.svg" alt="" width={24} height={24} />
          </Link>
        </div>
      </div>
    );
  }

  if (variantProp === 'back') {
    return (
      <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
        <div className="h-[34px] w-full bg-neutral-3" />
        <div className={barClass}>
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={handleBack}
            className="inline-flex h-6 w-3 items-center justify-center"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
        </div>
      </div>
    );
  }

  if (variantProp === 'title-back') {
    return (
      <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
        <div className="h-[34px] w-full bg-neutral-3" />
        <div className={barClass}>
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={handleBack}
            className="inline-flex h-6 w-3 items-center justify-center"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
          <p className="typo-heading-xxsmall text-neutral-12">{title}</p>
          <span className="inline-flex h-6 w-3 opacity-0" aria-hidden />
        </div>
      </div>
    );
  }

  if (variantProp === 'title') {
    return (
      <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
        <div className="h-[34px] w-full bg-neutral-3" />
        <div className="mx-auto flex h-[44px] w-full max-w-[375px] items-center justify-center px-4 py-[10px]">
          <p className="typo-heading-xxsmall text-neutral-12">{title}</p>
        </div>
      </div>
    );
  }

  if (variantProp === 'logo-back') {
    return (
      <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
        <div className="h-[34px] w-full bg-neutral-3" />
        <div className={barClass}>
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={handleBack}
            className="inline-flex h-6 w-3 items-center justify-center"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
          <Image src="/assets/logos/logo-gcs.svg" alt="GCS" width={53} height={19} />
          <span className="inline-flex h-6 w-3 opacity-0" aria-hidden />
        </div>
      </div>
    );
  }

  if (variantProp === 'title-back-trash') {
    return (
      <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
        <div className="h-[34px] w-full bg-neutral-3" />
        <div className={barClass}>
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={handleBack}
            className="inline-flex h-6 w-3 items-center justify-center"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
          <p className="typo-heading-xxsmall text-neutral-12">{title}</p>
          <button
            type="button"
            aria-label="삭제"
            onClick={onTrash}
            className="inline-flex h-6 w-6 items-center justify-center"
          >
            <Image src="/assets/icons/icon-trash.svg" alt="" width={24} height={24} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-neutral-4 bg-neutral-3 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
      <div className="h-[34px] w-full bg-neutral-3" />
      <div className="mx-auto flex h-[44px] w-full max-w-[375px] items-center justify-between px-4 py-[10px]">
        {isMypageRoot ? (
          <>
            <Link href="/" aria-label="홈으로 가기" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
            </Link>
            <span className="typo-heading-xxsmall text-neutral-12">마이페이지</span>
            <Link
              href="/mypage/settings"
              aria-label="설정"
              className="inline-flex h-6 w-6 items-center justify-center"
            >
              <Image src="/assets/icons/icon-settings.svg" alt="" width={24} height={24} />
            </Link>
          </>
        ) : isMypage ? (
          <>
            <Link
              href={resolvedUserHref}
              aria-label={isLoggedIn ? '마이페이지' : '로그인'}
              className="inline-flex h-6 w-6 items-center justify-center"
              onClick={handleHeroIconClick}
            >
              <Image src="/assets/icons/icon-user-nav.svg" alt="" width={24} height={24} />
            </Link>
            <span className="typo-heading-xxsmall text-neutral-12">마이페이지</span>
            <Link href={cartHref} aria-label="장바구니" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-cart-nav.svg" alt="" width={24} height={24} />
            </Link>
          </>
        ) : (
          <>
            <Link
              href={resolvedUserHref}
              aria-label={isLoggedIn ? '마이페이지' : '로그인'}
              className="inline-flex h-6 w-6 items-center justify-center"
              onClick={handleHeroIconClick}
            >
              <Image src="/assets/icons/icon-user-nav.svg" alt="" width={24} height={24} />
            </Link>
            <Link href={homeHref} aria-label="홈" className="inline-flex items-center justify-center">
              <Image src="/assets/logos/logo-gcs.svg" alt="GCS" width={53} height={19} />
            </Link>
            <Link href={cartHref} aria-label="장바구니" className="inline-flex h-6 w-6 items-center justify-center">
              <Image src="/assets/icons/icon-cart-nav.svg" alt="" width={24} height={24} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
