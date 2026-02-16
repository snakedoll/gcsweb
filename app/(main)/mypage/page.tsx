'use client';

import { Footer, NavBar } from '@/components/layout';
import { useUser } from '@/hooks/useUser';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const NOTIFICATION_COUNT = 5;
const LIKES_COUNT = 5;
const SCRAP_COUNT = 5;

interface StatusCardProps {
  href: string;
  iconSrc: string;
  label: string;
  count: number;
}

function StatusCard({ href, iconSrc, label, count }: StatusCardProps) {
  return (
    <Link
      href={href}
      className="flex h-20 w-[109px] flex-col items-center justify-center gap-2 rounded-lg border border-neutral-5 bg-neutral-1"
    >
      <Image src={iconSrc} alt="" width={24} height={24} />
      <p className="typo-body-xsmall text-neutral-9">
        {label} <span className="text-orange-5">{count}</span>
      </p>
    </Link>
  );
}

interface MenuSectionProps {
  title: string;
  items: { label: string; href: string }[];
}

function MenuSection({ title, items }: MenuSectionProps) {
  return (
    <section className="rounded-lg bg-neutral-1 px-4 py-3">
      <h2 className="typo-body-small-bold text-neutral-12">{title}</h2>
      <div className="my-1 h-px bg-neutral-4" />
      <ul className="space-y-3 py-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center justify-between typo-body-xsmall text-neutral-8">
              <span>{item.label}</span>
              <Image src="/assets/icons/icon-right.svg" alt="" width={20} height={20} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MypagePage() {
  const router = useRouter();
  const { profile, isLoading, isAuthenticated } = useUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p className="typo-body-xsmall text-neutral-7">로딩 중...</p>
      </div>
    );
  }

  const displayName = profile?.name ?? profile?.nickname ?? profile?.email ?? '사용자';
  const roleLabel = profile?.role === 'admin' ? '관리자' : '일반 회원';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="마이페이지" />
      <main className="mx-auto w-full max-w-[375px] flex-1 px-4 pt-6">
        <section className="mb-5">
          <div className="flex items-center gap-6 px-2">
            <div className="relative h-[100px] w-[100px]">
              <div className="h-[100px] w-[100px] overflow-hidden rounded-full bg-neutral-4">
                {profile?.profileImage ? (
                  <Image src={profile.profileImage} alt="프로필" fill className="object-cover" sizes="100px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image src="/assets/icons/icon-user-nav.svg" alt="" width={38} height={38} />
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="프로필 이미지 변경"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-neutral-3 bg-neutral-12"
              >
                <Image src="/assets/icons/icon-camera.svg" alt="" width={18} height={18} />
              </button>
            </div>
            <div>
              <p className="typo-heading-medium text-neutral-12">{displayName}</p>
              <p className="typo-body-small text-neutral-7">{roleLabel}</p>
            </div>
          </div>
        </section>

        <section className="mb-3 flex items-center justify-center gap-[7px]">
          <StatusCard href="/mypage/notifications" iconSrc="/assets/icons/icon-bell.svg" label="알림" count={NOTIFICATION_COUNT} />
          <StatusCard href="/mypage/likes" iconSrc="/assets/icons/icon-heart.svg" label="찜한 상품" count={LIKES_COUNT} />
          <StatusCard href="/mypage/scraps" iconSrc="/assets/icons/icon-bookmark.svg" label="스크랩" count={SCRAP_COUNT} />
        </section>

        <div className="space-y-3">
          <MenuSection
            title="나의 쇼핑 정보"
            items={[
              { label: '주문 내역', href: '/mypage/orders' },
              { label: '반품/교환 내역', href: '/mypage/returns' },
              { label: '상품 리뷰', href: '/mypage/reviews' },
            ]}
          />
          <MenuSection
            title="나의 창작 정보"
            items={[
              { label: '창작자 가이드', href: '/mypage/creator-guide' },
              { label: '내가 등록한 상품', href: '/mypage/my-products' },
              { label: '판매 활동', href: '/mypage/sales' },
            ]}
          />
          <MenuSection title="고객센터" items={[{ label: '문의하기', href: '/mypage/inquiries' }]} />
        </div>
      </main>
      <Footer showAdminButton={profile?.role === 'admin'} />
    </div>
  );
}
