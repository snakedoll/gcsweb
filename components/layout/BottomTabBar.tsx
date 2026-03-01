'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type BottomTabBarVariant =
  | 'about'
  | 'archive'
  | 'home'
  | 'shop'
  | 'community'
  | 'shop_fund'
  | 'shop_buynow_partnerup';

interface BottomTabBarProps {
  variant?: BottomTabBarVariant;
  aboutHref?: string;
  archiveHref?: string;
  homeHref?: string;
  shopHref?: string;
  communityHref?: string;
  onOrder?: () => void;
}

function InfoSquareIcon({ active = false }: { active?: boolean }) {
  const color = active ? '#F6874C' : '#999694';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="8" r="1.2" fill={color} />
      <path d="M12 11V16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon({ active = false }: { active?: boolean }) {
  const color = active ? '#F6874C' : '#999694';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 12L12 16L20 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16L12 20L20 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon({ active = false }: { active?: boolean }) {
  const color = active ? '#F6874C' : '#999694';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3.5 10.5L12 3.5L20.5 10.5V20.5H14.8V14H9.2V20.5H3.5V10.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function BagIcon({ active = false }: { active?: boolean }) {
  const color = active ? '#F6874C' : '#999694';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4.5 8.5H19.5L18.4 20.5H5.6L4.5 8.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 9V6.5C9 4.9 10.3 3.5 12 3.5C13.7 3.5 15 4.9 15 6.5V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon({ active = false }: { active?: boolean }) {
  const color = active ? '#F6874C' : '#999694';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.2" r="3.2" stroke={color} strokeWidth="1.5" />
      <path d="M6 19.2C6 15.9 8.7 13.2 12 13.2C15.3 13.2 18 15.9 18 19.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5.6" cy="9.8" r="2" stroke={color} strokeWidth="1.2" />
      <circle cx="18.4" cy="9.8" r="2" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 20.5C12 20.5 4.5 15.7 4.5 9.7C4.5 6.7 6.9 4.5 9.7 4.5C11.2 4.5 12.7 5.3 13.5 6.6C14.3 5.3 15.8 4.5 17.3 4.5C20.1 4.5 22.5 6.7 22.5 9.7C22.5 15.7 15 20.5 15 20.5" stroke="#C7C5C4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 3L3.05 3.21C3.91 3.38 4.56 4.1 4.65 4.97L4.8 6.5M4.8 6.5L5.79 14.74C5.91 15.74 6.76 16.5 7.77 16.5H16.77C18.37 16.5 19.77 15.41 20.16 13.85L21.29 9.36C21.65 7.91 20.55 6.5 19.05 6.5H4.8Z" stroke="#C7C5C4" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.5" cy="20" r="1.5" fill="#C7C5C4" />
      <circle cx="17.5" cy="20" r="1.5" fill="#C7C5C4" />
    </svg>
  );
}

interface TabItemProps {
  href: string;
  label: string;
  active?: boolean;
  icon: ReactNode;
}

function TabItem({ href, label, active = false, icon }: TabItemProps) {
  return (
    <Link href={href} className="flex w-[57px] flex-col items-center gap-px">
      <span className="inline-flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className={cn('text-[11px] leading-[1.5]', active ? 'text-orange-5' : 'text-neutral-7')}>{label}</span>
    </Link>
  );
}

export default function BottomTabBar({
  variant = 'about',
  aboutHref = '/about',
  archiveHref = '/archive',
  homeHref = '/',
  shopHref = '/shop',
  communityHref = '/community',
  onOrder,
}: BottomTabBarProps) {
  if (variant === 'shop_fund' || variant === 'shop_buynow_partnerup') {
    return (
      <div className={cn('w-full border-t border-neutral-4 bg-neutral-3 py-[13px]', variant === 'shop_buynow_partnerup' ? 'px-5' : 'px-[18px]')}>
        <div className={cn('mx-auto flex w-full max-w-[375px] items-center', variant === 'shop_buynow_partnerup' ? 'gap-5' : 'justify-between')}>
          <div className={cn('flex items-center', variant === 'shop_buynow_partnerup' ? 'gap-[10px]' : '')}>
            <HeartIcon />
            {variant === 'shop_buynow_partnerup' ? <CartIcon /> : null}
          </div>
          <button
            type="button"
            onClick={onOrder}
            className="h-[48px] flex-1 rounded-lg bg-orange-5 text-neutral-2 typo-body-small-bold"
          >
            주문하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border-t border-neutral-4 bg-neutral-3 px-4 py-[13px]">
      <div className="mx-auto flex w-full max-w-[375px] items-center justify-between">
        <TabItem href={aboutHref} label="About" active={variant === 'about'} icon={<InfoSquareIcon active={variant === 'about'} />} />
        <TabItem href={archiveHref} label="Archive" active={variant === 'archive'} icon={<LayersIcon active={variant === 'archive'} />} />
        <TabItem href={homeHref} label="Home" active={variant === 'home'} icon={<HomeIcon active={variant === 'home'} />} />
        <TabItem href={shopHref} label="Shop" active={variant === 'shop'} icon={<BagIcon active={variant === 'shop'} />} />
        <TabItem href={communityHref} label="Community" active={variant === 'community'} icon={<UsersIcon active={variant === 'community'} />} />
      </div>
    </div>
  );
}
