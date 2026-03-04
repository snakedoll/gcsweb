'use client';

import { NavBar } from '@/components/layout';
import FloatingButton from '@/components/ui/button/FloatingButton';
import ToastMessage from '@/components/ui/common/ToastMessage';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  if (!res.ok) throw new Error('?곹뭹 紐⑸줉??遺덈윭?????놁뒿?덈떎.');
  const json = (await res.json()) as { data?: { products?: ProductItem[] } };
  return json.data?.products ?? [];
}

const TABS = [
  { id: 'all', label: '?꾩껜' },
  { id: 'fund', label: 'Fund' },
  { id: 'buynow', label: 'Buy Now' },
  { id: 'partner', label: 'Partner Up' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** ?먮ℓ 沅뚰븳 ?놁쓬: ?덈궡 + 李쎌옉??媛?대뱶 踰꾪듉 */
function NoPermissionView() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col items-center justify-center px-4 pt-24 pb-24 min-h-[85vh]">
        <p className="typo-heading-small mb-2 text-neutral-12">?먮ℓ 沅뚰븳???놁뒿?덈떎.</p>
        <p className="typo-body-small mb-6 text-neutral-7">GCS:Web???곹뭹???깅줉?섍퀬 ?띕떎硫?</p>
        <Link
          href="/mypage/creator-guide"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-neutral-10 px-8 typo-body-small-bold text-neutral-1"
        >
          李쎌옉??媛?대뱶 蹂대윭媛湲?
        </Link>
      </main>
    </>
  );
}

/** ?먮ℓ 沅뚰븳 ?덉쓬, ?깅줉 ?곹뭹 ?놁쓬: 鍮??곹깭 + ???곹뭹 ?깅줉 踰꾪듉 */
function EmptyProductsView() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col items-center justify-center px-4 pt-24 pb-24 min-h-[85vh]">
        <p className="typo-heading-small mb-2 text-neutral-12">?깅줉???곹뭹???놁뒿?덈떎.</p>
        <p className="typo-body-small mb-6 text-neutral-7">GCS:Web???곹뭹???깅줉?섍퀬 ?띕떎硫?</p>
        <Link
          href="/mypage/my-products/new"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-orange-5 px-8 typo-body-small-bold text-neutral-2"
        >
          ???곹뭹 ?깅줉?섎윭媛湲?
        </Link>
      </main>
    </>
  );
}

/** 移대뱶 ?섎떒: Fund??誘몃떖???ъ꽦 + %, 怨듯넻 醫뗭븘????*/
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

/** Figma 5603-10911 湲곕컲 ?곹뭹 移대뱶 (?곗씠??而⑦뀒?대꼫) */
function ProductCard({ item }: { item: ProductItem }) {
  const isFund = item.type === 0;
  const periodLabel = isFund ? '???湲곌컙' : '?먮ℓ 湲곌컙';
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
              <p className="line-clamp-2 typo-body-xsmall text-neutral-11">{item.description || '?ㅻ챸 ?놁쓬'}</p>
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
          醫뗭븘????<span className="text-neutral-8">{item.likeCount}</span>
        </p>
      </div>
    </article>
  );
}

/** ?먮ℓ 沅뚰븳 ?덉쓬, ?곹뭹 ?덉쓬: ??+ ?곹뭹 移대뱶 紐⑸줉 + FAB */
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
              <Link href={`/mypage/my-products/${item.id}/edit`} className="block">
                <ProductCard item={item} />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <div className="pointer-events-none fixed inset-x-0 bottom-[15px] z-20 mx-auto flex w-full max-w-[375px] justify-end px-3">
        <Link href="/mypage/my-products/new" className="pointer-events-auto" aria-label="???곹뭹 ?깅줉">
          <FloatingButton className="size-[61px] p-4" />
        </Link>
      </div>
    </>
  );
}

export default function MyProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoading, isAuthenticated } = useUser();
  const hasPermission = profile?.isSeller === true;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  useEffect(() => {
    const toast = searchParams.get('toast');
    if (toast === 'update-requested') {
      setToastMessage('상품글 수정이 요청되었습니다.');
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p className="typo-body-xsmall text-neutral-7">濡쒕뵫 以?..</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="?닿? ?깅줉???곹뭹" />
      {!hasPermission && <NoPermissionView />}
      {hasPermission && !productsLoading && !hasProducts && <EmptyProductsView />}
      {hasPermission && productsLoading && (
        <>
          <main className="flex flex-1 items-center justify-center">
            <p className="typo-body-xsmall text-neutral-7">?곹뭹 紐⑸줉 濡쒕뵫 以?..</p>
          </main>
        </>
      )}
      {hasPermission && !productsLoading && hasProducts && (
        <ProductListView products={products} />
      )}
      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 top-[54px] z-40 mx-auto w-full max-w-[375px] px-4">
          <ToastMessage message={toastMessage} />
        </div>
      ) : null}
    </div>
  );
}


