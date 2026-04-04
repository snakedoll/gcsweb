'use client';

import { Footer, NavBar } from '@/components/layout';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ALERT_COUNT = 0;
const INQUIRY_COUNT = 0;
const LOG_COUNT = 0;

function AdminCard({
  href,
  iconSrc,
  label,
  count,
}: {
  href: string;
  iconSrc: string;
  label: string;
  count?: number;
}) {
  const content = (
    <div className="flex h-[84px] w-[113px] flex-col items-center justify-center gap-2 rounded-lg border border-neutral-4 bg-neutral-1">
      <Image
        src={iconSrc}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 [filter:brightness(0)_saturate(100%)_invert(61%)_sepia(8%)_saturate(145%)_hue-rotate(336deg)_brightness(91%)_contrast(86%)]"
      />
      <p className="typo-body-xsmall text-neutral-9">
        {label}
        {typeof count === 'number' && count > 0 && <span className="text-orange-5"> {count}</span>}
      </p>
    </div>
  );

  if (href === '#') return <div className="shrink-0">{content}</div>;

  return (
    <Link href={href} className="shrink-0">
      {content}
    </Link>
  );
}

function AdminMenuSection({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <section className="rounded-lg border border-neutral-4 bg-neutral-1 px-4 py-3">
      <h2 className="typo-body-small-bold text-neutral-12">{title}</h2>
      <div className="my-2 h-px bg-neutral-4" />
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-between typo-body-xsmall text-neutral-8',
                item.href === '#' && 'pointer-events-none'
              )}
            >
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar />
      <main className="mx-auto w-full max-w-[375px] flex-1 px-3 py-4">
        <div className="mb-4 flex justify-center gap-[6px]">
          <AdminCard href="#" iconSrc="/assets/icons/icon-bell.svg" label="알림" count={ALERT_COUNT} />
          <AdminCard href="#" iconSrc="/assets/icons/icon-message-square.svg" label="문의" count={INQUIRY_COUNT} />
          <AdminCard href="#" iconSrc="/assets/icons/icon-folder.svg" label="로그" count={LOG_COUNT} />
        </div>

        <div className="space-y-3">
          <AdminMenuSection
            title="판매 관리"
            items={[
              { label: '상품글 관리', href: '/admin/product' },
              { label: 'Fund주문 관리', href: '#' },
              { label: '현장판매 관리', href: '/admin/onsite' },
              { label: '상품 리뷰 관리', href: '#' },
            ]}
          />

          <AdminMenuSection
            title="사용자 관리"
            items={[
              { label: '회원 관리', href: '/admin/members' },
              { label: '팀 관리', href: '/admin/team' },
            ]}
          />

          <AdminMenuSection
            title="글 관리"
            items={[
              { label: 'About GCS 관리', href: '#' },
              { label: 'Project 관리', href: '/admin/project' },
              { label: 'News 관리', href: '#' },
            ]}
          />

          <AdminMenuSection
            title="설정"
            items={[
              { label: '데이터', href: '/admin/data' },
              { label: '약관 관리', href: '/admin/terms' },
              { label: '삭제된 항목', href: '#' },
            ]}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
