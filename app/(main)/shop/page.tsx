'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banner, BottomTabBar, NavBar } from '@/components/layout';
import Tab from '@/components/ui/button/Tab';
import Filter from '@/components/ui/admin/product/Filter';
import Productcard from '@/components/ui/admin/product/Productcard';

type ProductType = 0 | 1 | 2;
type ProgressStatus = 0 | 1 | 2; // 0=진행 예정, 1=진행 중, 2=진행 완료

type ShopProduct = {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  description: string;
  type: ProductType;
  thumbnailUrl: string;
  salesStartDate: string;
  salesEndDate: string;
  currentAmount: number | null;
  goalAmount: number | null;
  isLiked: boolean;
};

type ShopProductsResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    products?: ShopProduct[];
  };
};

type TypeTabKey = 'fund' | 'buyNow' | 'partnerUp';
type StatusTabKey = 'scheduled' | 'active' | 'completed';

const TYPE_TABS: Array<{ key: TypeTabKey; label: string; type: ProductType }> = [
  { key: 'fund', label: 'Fund', type: 0 },
  { key: 'buyNow', label: 'Buy Now', type: 1 },
  { key: 'partnerUp', label: 'Partner up', type: 2 },
];

const STATUS_TABS: Array<{ key: StatusTabKey; label: string; status: ProgressStatus }> = [
  { key: 'scheduled', label: '진행 예정', status: 0 },
  { key: 'active', label: '진행 중', status: 1 },
  { key: 'completed', label: '진행 완료', status: 2 },
];

function ShopProductCard({ item, statusKey }: { item: ShopProduct; statusKey: StatusTabKey }) {
  const progressPercent =
    item.type === 0 && typeof item.currentAmount === 'number' && typeof item.goalAmount === 'number' && item.goalAmount > 0
      ? Math.max(0, Math.min(100, Math.round((item.currentAmount / item.goalAmount) * 100)))
      : 0;
  const dDayText = statusKey === 'active' ? 'D-day' : statusKey === 'scheduled' ? '진행예정' : '진행완료';
  const dDayColor = statusKey === 'active' ? 'Orange' : 'Gray';

  return (
    <Productcard
      view="shop"
      type={item.type === 0 ? 'fund' : 'buynow/partnerup'}
      imageSrc={item.thumbnailUrl}
      brand={item.teamName || '팀명'}
      title={item.name || '상품 제목'}
      description={item.description || ''}
      dDayText={dDayText}
      dDayColor={dDayColor}
      progressPercent={progressPercent}
      likeCount={0}
      className="w-full"
    />
  );
}

export default function ShopPage() {
  const [typeTab, setTypeTab] = useState<TypeTabKey>('fund');
  const [statusTab, setStatusTab] = useState<StatusTabKey>('active');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const activeType = useMemo(() => TYPE_TABS.find((tab) => tab.key === typeTab)?.type ?? 0, [typeTab]);
  const activeStatus = useMemo(() => STATUS_TABS.find((tab) => tab.key === statusTab)?.status ?? 1, [statusTab]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/shop/products?type=${activeType}&status=${activeStatus}`, {
          cache: 'no-store',
        });
        const json = (await res.json().catch(() => ({}))) as ShopProductsResponse;
        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '상품 목록을 불러오지 못했습니다.');
        }
        if (cancelled) return;
        setProducts(json.data?.products ?? []);
      } catch (error) {
        console.error(error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStatus, activeType]);

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar />
        <Banner variant="shop" />

        <section className="border-b border-neutral-5 bg-neutral-3">
          <div className="grid w-full grid-cols-3">
            {TYPE_TABS.map((tab) => (
              <Tab
                key={tab.key}
                title={tab.label}
                active={typeTab === tab.key}
                onClick={() => setTypeTab(tab.key)}
                className="w-full"
              />
            ))}
          </div>
        </section>

        <section className="px-4 pt-5">
          <div className="flex items-center gap-2">
            {STATUS_TABS.map((tab) => (
              <Filter key={tab.key} label={tab.label} selected={statusTab === tab.key} onClick={() => setStatusTab(tab.key)} />
            ))}
          </div>
        </section>

        <main className="flex-1 px-4 pb-6 pt-5">
          {loading ? (
            <div className="flex min-h-[calc(100vh-360px)] items-center justify-center">
              <p className="typo-body-small text-neutral-8">로딩 중...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[calc(100vh-360px)] items-center justify-center">
              <p className="typo-body-small text-neutral-8">등록된 상품이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {products.map((item) => (
                <ShopProductCard key={item.id} item={item} statusKey={statusTab} />
              ))}
            </div>
          )}
        </main>

        <div className="sticky bottom-0 z-20 mt-auto">
          <BottomTabBar variant="shop" />
        </div>
      </div>
    </div>
  );
}
