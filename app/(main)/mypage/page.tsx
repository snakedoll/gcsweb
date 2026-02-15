'use client';

import { Footer, NavBar } from '@/components/layout';
import { useUser } from '@/hooks/useUser';
import { typography } from '@/lib/styles/typography';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId } from 'react';

// 아이콘 컴포넌트 (Figma 디자인 기준)
function IconCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M18.333 5H15L13.333 3.333H6.667L5 5H1.667C0.75 5 0 5.75 0 6.667V16.667C0 17.583 0.75 18.333 1.667 18.333H18.333C19.25 18.333 20 17.583 20 16.667V6.667C20 5.75 19.25 5 18.333 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14.167C11.841 14.167 13.333 12.675 13.333 10.833C13.333 8.992 11.841 7.5 10 7.5C8.159 7.5 6.667 8.992 6.667 10.833C6.667 12.675 8.159 14.167 10 14.167Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M10 2.5C6.548 2.5 3.75 5.298 3.75 8.75V11.25L2.5 12.5V13.75H17.5V12.5L16.25 11.25V8.75C16.25 5.298 13.452 2.5 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 13.75V14.375C7.5 15.412 8.338 16.25 9.375 16.25H10.625C11.662 16.25 12.5 15.412 12.5 14.375V13.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M17.5 6.667C17.5 4.075 15.425 2 12.833 2C11.267 2 9.875 2.825 9 4.075C8.125 2.825 6.733 2 5.167 2C2.575 2 0.5 4.075 0.5 6.667C0.5 12.5 9 18 9 18C9 18 17.5 12.5 17.5 6.667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4.167 2.5H15.833C16.294 2.5 16.667 2.873 16.667 3.333V17.5L10 14.167L3.333 17.5V3.333C3.333 2.873 3.706 2.5 4.167 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NOTIFICATION_COUNT = 5;
const LIKES_COUNT = 5;
const SCRAP_COUNT = 5;

export default function MypagePage() {
  const router = useRouter();
  const clipPathId = useId();
  const { profile, isLoading, isAuthenticated } = useUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f8f6f4]">
        <p className={cn(typography.bodyXSmall, 'text-neutral-7')}>로딩 중...</p>
      </div>
    );
  }

  const displayName = profile?.name ?? profile?.nickname ?? profile?.email ?? '사용자';
  const roleLabel = profile?.role === 'admin' ? '관리자' : '회원';

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8f6f4]">
      <NavBar />
      <div className="mx-auto w-full max-w-[375px] flex-1 px-4 pb-8 pt-6">
        {/* 프로필 영역: 이미지(카메라 오버레이) + 이름 + 역할 + 알림/찜/스크랩 카드 */}
        <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            {/* 프로필 이미지: 오른쪽 하단 노치로 카메라 영역이 움푹 파인 형태 (Figma 디자인) */}
            <div className="relative h-20 w-20 shrink-0">
              <svg width="0" height="0" className="absolute" aria-hidden>
                <defs>
                  <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
                    {/* 원형 프로필 + 오른쪽 하단 원형 노치(cutout) - Figma 디자인 */}
                    <path
                      fillRule="evenodd"
                      d="M 1 0.5 A 0.5 0.5 0 0 1 0.5 1 A 0.5 0.5 0 0 1 0 0.5 A 0.5 0.5 0 0 1 0.5 0 A 0.5 0.5 0 0 1 1 0.5 Z
                         M 0.9 0.72 A 0.18 0.18 0 0 1 0.72 0.9 A 0.18 0.18 0 0 1 0.54 0.72 A 0.18 0.18 0 0 1 0.72 0.54 A 0.18 0.18 0 0 1 0.9 0.72 Z"
                    />
                  </clipPath>
                </defs>
              </svg>
              <div
                className="absolute inset-0 overflow-hidden bg-neutral-4"
                style={{ clipPath: `url(#${clipPathId})` }}
              >
                {profile?.profileImage ? (
                  <Image
                    src={profile.profileImage}
                    alt="프로필"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-7">
                    <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#443e3c] text-white shadow-sm [&_svg]:h-4 [&_svg]:w-4">
                <IconCamera />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-neutral-10', typography.bodySmallBold)}>{displayName}</p>
              <p className={cn('truncate text-neutral-7', typography.bodyXSmall)}>{roleLabel}</p>
            </div>
          </div>
          {/* 알림 / 찜한 상품 / 스크랩 카드 */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link
              href="/mypage/notifications"
              className="flex flex-col items-center gap-1 rounded-lg border border-[#e5e3e1] bg-[#fafafa] px-3 py-3 transition-colors hover:bg-neutral-4"
            >
              <IconBell />
              <span className={cn(typography.bodyXSmall, 'text-neutral-10')}>알림 <span className="text-[#E8754D]">{NOTIFICATION_COUNT}</span></span>
            </Link>
            <Link
              href="/mypage/likes"
              className="flex flex-col items-center gap-1 rounded-lg border border-[#e5e3e1] bg-[#fafafa] px-3 py-3 transition-colors hover:bg-neutral-4"
            >
              <IconHeart />
              <span className={cn(typography.bodyXSmall, 'text-neutral-10')}>찜한 상품 <span className="text-[#E8754D]">{LIKES_COUNT}</span></span>
            </Link>
            <Link
              href="/mypage/scraps"
              className="flex flex-col items-center gap-1 rounded-lg border border-[#e5e3e1] bg-[#fafafa] px-3 py-3 transition-colors hover:bg-neutral-4"
            >
              <IconBookmark />
              <span className={cn(typography.bodyXSmall, 'text-neutral-10')}>스크랩 <span className="text-[#E8754D]">{SCRAP_COUNT}</span></span>
            </Link>
          </div>
        </section>

        {/* 나의 쇼핑 정보 */}
        <section className="mb-4 rounded-xl bg-white shadow-sm overflow-hidden">
          <h2 className={cn('border-b border-neutral-4 px-4 py-3 text-neutral-10', typography.bodyXSmallBold)}>
            나의 쇼핑 정보
          </h2>
          <ul className="divide-y divide-neutral-4">
            <li>
              <Link
                href="/mypage/orders"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                주문 내역
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
            <li>
              <Link
                href="/mypage/returns"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                반품/교환 내역
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
            <li>
              <Link
                href="/mypage/reviews"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                상품 리뷰
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
          </ul>
        </section>

        {/* 나의 창작 정보 */}
        <section className="mb-4 rounded-xl bg-white shadow-sm overflow-hidden">
          <h2 className={cn('border-b border-neutral-4 px-4 py-3 text-neutral-10', typography.bodyXSmallBold)}>
            나의 창작 정보
          </h2>
          <ul className="divide-y divide-neutral-4">
            <li>
              <Link
                href="/mypage/creator-guide"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                창작자 가이드
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
            <li>
              <Link
                href="/mypage/my-products"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                내가 등록한 상품
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
            <li>
              <Link
                href="/mypage/sales"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                판매 활동
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
          </ul>
        </section>

        {/* 고객센터 */}
        <section className="mb-4 rounded-xl bg-white shadow-sm overflow-hidden">
          <h2 className={cn('border-b border-neutral-4 px-4 py-3 text-neutral-10', typography.bodyXSmallBold)}>고객센터</h2>
          <ul className="divide-y divide-neutral-4">
            <li>
              <Link
                href="/mypage/inquiries"
                className={cn('flex items-center justify-between px-4 py-3 text-neutral-10 transition-colors hover:bg-[#fafafa]', typography.bodySmall)}
              >
                문의하기
                <span className="text-neutral-7"><IconChevronRight /></span>
              </Link>
            </li>
          </ul>
        </section>

        <Footer showAdminButton={profile?.role === 'admin'} />
      </div>
    </div>
  );
}
