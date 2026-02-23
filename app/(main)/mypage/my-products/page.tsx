'use client';

import { Footer, NavBar } from '@/components/layout';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'fund', label: 'Fund' },
  { id: 'buynow', label: 'Buy Now' },
  { id: 'partner', label: 'Partner Up' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** 판매 권한 없음: 안내 + 창작자 가이드 버튼 */
function NoPermissionView({ showAdminButton }: { showAdminButton?: boolean }) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col items-center justify-center px-4 pt-24 pb-24 min-h-[85vh]">
        <p className="typo-heading-small mb-2 text-neutral-12">판매 권한이 없습니다.</p>
        <p className="typo-body-small mb-6 text-neutral-7">GCS:Web에 상품을 등록하고 싶다면?</p>
        <Link
          href="/mypage/creator-guide"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-neutral-10 px-8 typo-body-small-bold text-neutral-1"
        >
          창작자 가이드 보러가기
        </Link>
      </main>
      <Footer showAdminButton={showAdminButton} />
    </>
  );
}

/** 판매 권한 있음, 등록 상품 없음: 빈 상태 + 새 상품 등록 버튼 */
function EmptyProductsView({ showAdminButton }: { showAdminButton?: boolean }) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col items-center justify-center px-4 pt-24 pb-24 min-h-[85vh]">
        <p className="typo-heading-small mb-2 text-neutral-12">등록된 상품이 없습니다.</p>
        <p className="typo-body-small mb-6 text-neutral-7">GCS:Web에 상품을 등록하고 싶다면?</p>
        <Link
          href="/mypage/my-products/new"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-orange-5 px-8 typo-body-small-bold text-neutral-2"
        >
          새 상품 등록하러가기
        </Link>
      </main>
      <Footer showAdminButton={showAdminButton} />
    </>
  );
}

const DUMMY_PRODUCTS: Array<{
  id: string;
  type: 0 | 1 | 2;
  brand: string;
  name: string;
  description: string;
  likeCount: number;
  periodLabel: string;
  periodText: string;
  goalAmount: number;
  currentAmount: number;
  progressPercent: number;
  statusLabel: string;
}> = [];

/** 판매 권한 있음, 상품 있음: 탭 + 상품 카드 목록 + FAB */
function ProductListView({ showAdminButton }: { showAdminButton?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const products = useMemo(() => {
    if (activeTab === 'all') return DUMMY_PRODUCTS;
    if (activeTab === 'fund') return DUMMY_PRODUCTS.filter((p) => p.type === 0);
    if (activeTab === 'buynow') return DUMMY_PRODUCTS.filter((p) => p.type === 1);
    if (activeTab === 'partner') return DUMMY_PRODUCTS.filter((p) => p.type === 2);
    return DUMMY_PRODUCTS;
  }, [activeTab]);

  return (
    <>
      <main className="mx-auto w-full max-w-[375px] flex-1 px-4 pb-24 pt-2">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'shrink-0 rounded-lg px-4 py-2 typo-body-xsmall-bold',
                activeTab === tab.id ? 'bg-orange-5 text-neutral-2' : 'bg-neutral-4 text-neutral-8'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ul className="space-y-4">
          {products.map((item) => (
            <li key={item.id}>
              <article className="flex gap-3 rounded-lg border border-neutral-5 bg-neutral-1 p-3">
                <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg bg-neutral-4">
                  <Image
                    src="/assets/images/default-avatar.svg"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="typo-body-xsmall text-neutral-7">{item.brand}</p>
                  <h3 className="typo-body-small-bold text-neutral-12">{item.name}</h3>
                  <p className="typo-body-xsmall text-neutral-7 line-clamp-2">{item.description}</p>
                  <p className="typo-body-xsmall mt-1 text-neutral-7">좋아요 수 {item.likeCount}</p>
                  <div className="mt-2">
                    <p className="typo-body-xsmall text-neutral-8">
                      {item.periodLabel} {item.periodText}
                    </p>
                    <p className="typo-body-xsmall text-neutral-8">
                      달성/목표 금액 : {item.currentAmount.toLocaleString()}원 / {item.goalAmount.toLocaleString()}원
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-4">
                      <div
                        className="h-full rounded-full bg-orange-5"
                        style={{ width: `${Math.min(100, item.progressPercent)}%` }}
                      />
                    </div>
                    <p className="typo-body-xsmall text-neutral-8">{item.statusLabel}</p>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>
      <Link
        href="/mypage/my-products/new"
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-5 shadow-lg"
        aria-label="새 상품 등록"
      >
        <Image src="/assets/icons/light/plus.svg" alt="" width={24} height={24} />
      </Link>
      <Footer showAdminButton={showAdminButton} />
    </>
  );
}

export default function MyProductsPage() {
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

  const hasPermission = profile?.isSeller === true;
  const hasProducts = hasPermission && DUMMY_PRODUCTS.length > 0;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="내가 등록한 상품" />
      {!hasPermission && <NoPermissionView showAdminButton={profile?.role === 'admin'} />}
      {hasPermission && !hasProducts && <EmptyProductsView showAdminButton={profile?.role === 'admin'} />}
      {hasProducts && <ProductListView showAdminButton={profile?.role === 'admin'} />}
    </div>
  );
}
