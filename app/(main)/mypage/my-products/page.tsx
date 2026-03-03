'use client';

import { Footer, NavBar } from '@/components/layout';
import FloatingButton from '@/components/ui/button/FloatingButton';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type ProductItem = {
  id: string;
  type: number;
  name: string;
  description: string;
  teamName: string;
  likeCount: number;
  salesStartDate: string | null;
  salesEndDate: string | null;
  goalAmount: number;
  currentAmount: number;
  progressPercent: number;
  thumbnailImgUrl: string | null;
};

async function fetchMyProducts(): Promise<ProductItem[]> {
  const res = await fetch('/api/v1/mypage/products');
  if (!res.ok) throw new Error('상품 목록을 불러올 수 없습니다.');
  const json = (await res.json()) as { data?: { products?: ProductItem[] } };
  return json.data?.products ?? [];
}

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'fund', label: 'Fund' },
  { id: 'buynow', label: 'Buy Now' },
  { id: 'partner', label: 'Partner Up' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** 판매 권한 없음: 안내 + 창작자 가이드 버튼 */
function NoPermissionView() {
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
      <Footer />
    </>
  );
}

/** 판매 권한 있음, 등록 상품 없음: 빈 상태 + 새 상품 등록 버튼 */
function EmptyProductsView() {
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
      <Footer />
    </>
  );
}

/** 카드 하단: Fund는 미달성/달성 + %, 공통 좋아요 수 */
function FundPercentBadge({ achieved, progressPercent }: { achieved: boolean; progressPercent: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[11px] leading-[1.5]',
          achieved ? 'bg-orange-1 text-orange-5' : 'bg-neutral-5 text-neutral-9'
        )}
      >
        {achieved ? '달성' : '미달성'}
      </span>
      <span className="typo-body-xsmall text-neutral-8">{achieved ? '100%' : `${progressPercent}%`}</span>
    </div>
  );
}

/** Figma 5603-10911 기반 상품 카드 (데이터 컨테이너) */
function ProductCard({ item }: { item: ProductItem }) {
  const isFund = item.type === 0;
  const periodLabel = isFund ? '펀딩 기간' : '판매 기간';
  const periodText =
    item.salesStartDate && item.salesEndDate
      ? `${item.salesStartDate.replace(/-/g, '.')} - ${item.salesEndDate.replace(/-/g, '.')}`
      : '-';
  const achieved = isFund && item.progressPercent >= 100;
  const thumbSrc = item.thumbnailImgUrl || '/assets/images/default-avatar.svg';

  return (
    <article className="flex w-full flex-col gap-2.5 rounded-lg border border-neutral-4 bg-neutral-2 px-[18px] py-4">
      <div className={cn('flex w-full', isFund ? 'flex-col gap-4' : 'flex-col gap-2.5')}>
        <div className="flex w-full items-start justify-between gap-3">
          <div className="relative h-[125px] min-h-[125px] w-[100px] min-w-[100px] shrink-0 overflow-hidden rounded rounded-[4px] bg-neutral-4">
            <Image src={thumbSrc} alt="" fill className="object-cover" sizes="100px" unoptimized={thumbSrc.startsWith('/')} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[7px] pl-3">
            <p className="typo-body-xsmall text-neutral-11">{item.teamName}</p>
            <div className="flex flex-col gap-0.5">
              <h3 className="typo-heading-xsmall text-neutral-12">{item.name}</h3>
              <p className="line-clamp-2 typo-body-xsmall text-neutral-11">{item.description || '설명 없음'}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] leading-[1.5] text-neutral-8">{periodLabel}</p>
              <div className="flex h-[22px] items-center rounded-[3px] border border-neutral-5 bg-neutral-1 px-1.5 py-0.5">
                <p className="typo-body-xsmall text-neutral-7 tracking-tight">{periodText}</p>
              </div>
            </div>
          </div>
        </div>
        {isFund && (
          <div className="flex w-full flex-col gap-1.5">
            <p className="typo-body-xsmall text-right text-neutral-8">
              달성 금액 : <span className="text-orange-5">{item.currentAmount.toLocaleString()}원</span> / {item.goalAmount.toLocaleString()}원
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-[3.5px] border border-neutral-5 bg-neutral-3">
              <div
                className={cn('h-full rounded-[3.5px]', achieved ? 'bg-orange-5' : 'bg-orange-2')}
                style={{ width: `${Math.min(100, item.progressPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full items-center justify-between">
        {isFund && <FundPercentBadge achieved={achieved} progressPercent={item.progressPercent} />}
        {!isFund && <div />}
        <p className="typo-body-xsmall text-neutral-8">
          좋아요 수 <span className="text-neutral-8">{item.likeCount}</span>
        </p>
      </div>
    </article>
  );
}

/** 판매 권한 있음, 상품 있음: 탭 + 상품 카드 목록 + FAB */
function ProductListView({ products }: { products: ProductItem[] }) {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const filtered = useMemo(() => {
    if (activeTab === 'all') return products;
    if (activeTab === 'fund') return products.filter((p) => p.type === 0);
    if (activeTab === 'buynow') return products.filter((p) => p.type === 1);
    if (activeTab === 'partner') return products.filter((p) => p.type === 2);
    return products;
  }, [activeTab, products]);

  return (
    <>
      <main className="mx-auto w-full max-w-[375px] flex-1 px-4 pb-24 pt-2">
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'shrink-0 rounded px-[11px] py-1.5 text-[13px] font-normal leading-[1.5] tracking-[-0.26px]',
                activeTab === tab.id ? 'bg-orange-5 text-neutral-2' : 'border border-neutral-5 bg-neutral-4 text-neutral-7'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-5">
          {filtered.map((item) => (
            <li key={item.id}>
              <ProductCard item={item} />
            </li>
          ))}
        </ul>
      </main>
      <div className="pointer-events-none fixed inset-x-0 bottom-[15px] z-20 mx-auto flex w-full max-w-[375px] justify-end px-3">
        <Link href="/mypage/my-products/new" className="pointer-events-auto" aria-label="새 상품 등록">
          <FloatingButton className="size-[61px] p-4" />
        </Link>
      </div>
      <Footer />
    </>
  );
}

export default function MyProductsPage() {
  const router = useRouter();
  const { profile, isLoading, isAuthenticated } = useUser();
  const hasPermission = profile?.isSeller === true;
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['mypage', 'my-products'],
    queryFn: fetchMyProducts,
    enabled: hasPermission,
  });
  const hasProducts = hasPermission && products.length > 0;

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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="내가 등록한 상품" />
      {!hasPermission && <NoPermissionView />}
      {hasPermission && !productsLoading && !hasProducts && <EmptyProductsView />}
      {hasPermission && productsLoading && (
        <>
          <main className="flex flex-1 items-center justify-center">
            <p className="typo-body-xsmall text-neutral-7">상품 목록 로딩 중...</p>
          </main>
          <Footer />
        </>
      )}
      {hasPermission && !productsLoading && hasProducts && (
        <ProductListView products={products} />
      )}
    </div>
  );
}
