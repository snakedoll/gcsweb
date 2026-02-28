'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NavBar } from '@/components/layout';
import SearchBar from '@/components/ui/common/SearchBar';
import ProductListedCard from '@/components/ui/admin/product/ProductListedCard';
import ProductTabBar from '@/components/ui/admin/product/TabBar';

type ProductType = 0 | 1 | 2;
type ProductTabKey = 'all' | 'fund' | 'buyNow' | 'partnerUp';

type AdminProductItem = {
  id: string;
  teamId: string;
  teamName: string;
  type: ProductType;
  name: string;
  description: string;
  thumbnailUrl: string;
  isHome: boolean;
  isPublic: boolean;
  salesStartDate: string | null;
  salesEndDate: string | null;
  currentAmount: number | null;
  goalAmount: number | null;
  likeCount: number;
};

type AdminProductListResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    summary?: {
      registerRequestCount?: number;
      updateRequestCount?: number;
    };
    products?: AdminProductItem[];
  };
};

const TAB_OPTIONS: Array<{ key: ProductTabKey; label: string; type: ProductType | null }> = [
  { key: 'all', label: '전체', type: null },
  { key: 'fund', label: 'Fund', type: 0 },
  { key: 'buyNow', label: 'Buy Now', type: 1 },
  { key: 'partnerUp', label: 'Partner Up', type: 2 },
];

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function formatDateRange(start: string | null, end: string | null) {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) return `${startText} - ${endText}`;
  if (startText) return `${startText} -`;
  if (endText) return `- ${endText}`;
  return '-';
}

function formatWon(value: number | null | undefined) {
  const safe = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safe.toLocaleString('ko-KR')}원`;
}

function calcProgressPercent(currentAmount: number | null, goalAmount: number | null) {
  const current = typeof currentAmount === 'number' ? currentAmount : 0;
  const goal = typeof goalAmount === 'number' ? goalAmount : 0;
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

function RequestSummaryBox({
  registerCount,
  updateCount,
}: {
  registerCount: number;
  updateCount: number;
}) {
  return (
    <div className="flex h-[35px] w-[109px] shrink-0 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-3 px-[10px] py-[7px]">
      <div className="flex items-center gap-2 typo-body-xsmall text-neutral-9">
        <Link href="/admin/product/request/register" className="inline-flex items-center">
          등록 <span className="text-orange-5">{registerCount}</span>
        </Link>
        <span aria-hidden className="h-[14px] w-px bg-neutral-6" />
        <Link href="/admin/product/request/update" className="inline-flex items-center">
          수정 <span className="text-orange-5">{updateCount}</span>
        </Link>
      </div>
    </div>
  );
}

export default function AdminProductPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ProductTabKey>('all');
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [summary, setSummary] = useState({ registerRequestCount: 0, updateRequestCount: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/admin/product/list', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as AdminProductListResponse;

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '상품글 목록을 불러오지 못했습니다.');
        }

        if (cancelled) return;

        setProducts((json.data?.products ?? []) as AdminProductItem[]);
        setSummary({
          registerRequestCount: Number(json.data?.summary?.registerRequestCount ?? 0),
          updateRequestCount: Number(json.data?.summary?.updateRequestCount ?? 0),
        });
        setErrorMessage(null);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setProducts([]);
          setSummary({ registerRequestCount: 0, updateRequestCount: 0 });
          setErrorMessage(error?.message ?? '상품글 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const selectedType = TAB_OPTIONS.find((tab) => tab.key === activeTab)?.type ?? null;
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      if (selectedType !== null && product.type !== selectedType) return false;
      if (!keyword) return true;

      const name = String(product.name ?? '').toLowerCase();
      const teamName = String(product.teamName ?? '').toLowerCase();
      return name.includes(keyword) || teamName.includes(keyword);
    });
  }, [activeTab, products, search]);

  const updateProductFlag = async (productId: string, key: 'isHome' | 'isPublic', value: boolean) => {
    // 1. Optimistic UI update
    setProducts((prev) => prev.map((item) => (item.id === productId ? { ...item, [key]: value } : item)));

    try {
      const res = await fetch(`/api/v1/admin/product/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message ?? '상태를 업데이트하지 못했습니다.');
      }
    } catch (error) {
      console.error('Failed to update product flag:', error);
      // Rollback on failure
      setProducts((prev) => prev.map((item) => (item.id === productId ? { ...item, [key]: !value } : item)));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar variant="title-back" title="상품글 관리" />

        <main className="pb-8">
          <div className="mt-[19px] flex items-center gap-[7px] px-4">
            <SearchBar
              className="flex-1"
              placeholder="상품명, 팀명으로 검색..."
              value={search}
              onChange={setSearch}
            />
            <RequestSummaryBox
              registerCount={summary.registerRequestCount}
              updateCount={summary.updateRequestCount}
            />
          </div>

          <section className="mt-4 px-4">
            <div className="flex flex-wrap items-center gap-2">
              {TAB_OPTIONS.map((tab) => (
                <ProductTabBar
                  key={tab.key}
                  label={tab.label}
                  selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>

            {listLoading ? (
              <div className="flex min-h-[calc(100vh-220px)] items-center justify-center px-4 text-center">
                <p className="typo-body-small text-neutral-8">상품글 목록 로딩 중...</p>
              </div>
            ) : errorMessage ? (
              <div className="flex min-h-[calc(100vh-220px)] items-center justify-center px-4 text-center">
                <p className="typo-body-small text-red-5">{errorMessage}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex min-h-[calc(100vh-220px)] items-center justify-center px-4 text-center">
                <p className="typo-heading-small text-neutral-12">등록된 상품글이 없습니다.</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-5 pb-6">
                {filteredProducts.map((product) => {
                  const isFund = product.type === 0;
                  const progressPercent = isFund
                    ? calcProgressPercent(product.currentAmount, product.goalAmount)
                    : undefined;

                  return (
                    <ProductListedCard
                      key={product.id}
                      className="w-full"
                      property1={isFund ? 'admin_fund' : 'admin_buynow/partnerup'}
                      imageSrc={product.thumbnailUrl || '/assets/images/profile_image.png'}
                      brand={product.teamName || '팀명'}
                      title={product.name || '상품명'}
                      description={product.description || ''}
                      periodText={formatDateRange(product.salesStartDate, product.salesEndDate)}
                      amountText={isFund ? formatWon(product.currentAmount) : undefined}
                      targetAmountText={isFund ? formatWon(product.goalAmount) : undefined}
                      progressPercent={progressPercent}
                      likeCount={Number(product.likeCount ?? 0)}
                      homeExpose={Boolean(product.isHome)}
                      publicChecked={Boolean(product.isPublic)}
                      onHomeExposeChange={(checked) => updateProductFlag(product.id, 'isHome', checked)}
                      onPublicChange={(checked) => updateProductFlag(product.id, 'isPublic', checked)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
