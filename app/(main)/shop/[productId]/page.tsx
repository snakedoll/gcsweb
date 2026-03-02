'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import ProductDDay, { type ProductDDayColor } from '@/components/ui/admin/product/ProductDDay';
import ShopCard from '@/components/ui/shop/ShopCard';
import { cn } from '@/lib/utils';
import { getSaleStatusByDate, type SaleStatus } from '@/lib/sale-date';

type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1;

interface ProductOptionValue {
  value: string;
  additionalPrice: number | null;
}

interface ProductOption {
  name: string;
  values: ProductOptionValue[];
}

interface ShopProductDetail {
  id: string;
  teamId: string;
  teamName: string;
  type: ProductType;
  name: string;
  description: string;
  thumbnailUrl: string;
  detailImageUrls: string[];
  salesStartDate: string;
  salesEndDate: string;
  receiveMethod: ReceiveMethod;
  productionStartDate: string | null;
  productionEndDate: string | null;
  deliveryStartDate: string | null;
  deliveryEndDate: string | null;
  pickupStartDate: string | null;
  pickupEndDate: string | null;
  pickupLocation: string | null;
  goalAmount: number | null;
  currentAmount: number | null;
  isLiked: boolean;
  isInCart: boolean;
  price: number;
  options: ProductOption[];
}

type ProductDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  code?: string;
  data?: {
    product?: ShopProductDetail;
  };
};

function formatWon(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

function calcProgressPercent(currentAmount: number | null, goalAmount: number | null) {
  if (typeof currentAmount !== 'number' || typeof goalAmount !== 'number' || goalAmount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((currentAmount / goalAmount) * 100)));
}

function getDdayPresentation(status: SaleStatus): { color: ProductDDayColor; text: string } {
  if (status === 'active') {
    return { color: 'Orange', text: 'D-day' };
  }
  if (status === 'scheduled') {
    return { color: 'Gray', text: '진행예정' };
  }
  return { color: 'Gray', text: '진행완료' };
}

function NeutralHeartIcon({ liked }: { liked: boolean }) {
  if (liked) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20.2L10.55 18.88C5.4 14.2 2 11.12 2 7.35C2 4.27 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.27 22 7.35C22 11.12 18.6 14.2 13.45 18.88L12 20.2Z"
          fill="var(--color-orange-5)"
        />
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.2L10.55 18.88C5.4 14.2 2 11.12 2 7.35C2 4.27 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.27 22 7.35C22 11.12 18.6 14.2 13.45 18.88L12 20.2Z"
        stroke="var(--color-neutral-6)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NeutralCartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 3L3.04936 3.20987C3.91136 3.38227 4.55973 4.09732 4.6472 4.97203L4.8 6.5M4.8 6.5L5.7886 14.7383C5.90922 15.7435 6.76195 16.5 7.77435 16.5H16.7673C18.3733 16.5 19.7733 15.407 20.1628 13.8489L21.2855 9.35783C21.6485 7.90619 20.5505 6.5 19.0542 6.5H4.8Z"
        stroke="var(--color-neutral-6)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M13 13.5H9" stroke="var(--color-neutral-6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="20" r="1.5" fill="var(--color-neutral-6)" />
      <circle cx="17.5" cy="20" r="1.5" fill="var(--color-neutral-6)" />
    </svg>
  );
}

function DateBlock({
  label,
  value,
  dday,
}: {
  label: string;
  value: string;
  dday?: { color: ProductDDayColor; text: string };
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <p className="typo-heading-xxsmall text-neutral-12">{label}</p>
        {dday ? <ProductDDay color={dday.color} text={dday.text} /> : null}
      </div>
      <div className="flex h-[31px] w-full items-center rounded-[8px] bg-neutral-1 px-[11px]">
        <p className="typo-body-xsmall text-neutral-9">{value}</p>
      </div>
    </div>
  );
}

export default function ShopDetailPage() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const productId = useMemo(() => {
    const raw = params?.productId;
    if (typeof raw !== 'string') return '';
    return raw.trim();
  }, [params]);

  const [product, setProduct] = useState<ShopProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingCart, setAddingCart] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!productId) {
        setLoading(false);
        setErrorMessage('유효하지 않은 상품 ID입니다.');
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/v1/shop/products/${productId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as ProductDetailResponse;

        if (!res.ok || json.status !== 'success' || !json.data?.product) {
          throw new Error(json.message ?? '상품 정보를 불러오지 못했습니다.');
        }

        if (cancelled) return;
        setProduct(json.data.product);
      } catch (error) {
        if (cancelled) return;
        setProduct(null);
        setErrorMessage(error instanceof Error ? error.message : '상품 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const saleStatus = useMemo<SaleStatus>(() => {
    if (!product) return 'completed';
    return getSaleStatusByDate(product.salesStartDate, product.salesEndDate);
  }, [product]);

  const dday = useMemo(() => {
    if (!product) return getDdayPresentation('completed');
    return getDdayPresentation(saleStatus);
  }, [product, saleStatus]);

  const progressPercent = useMemo(() => {
    if (!product || product.type !== 0) return 0;
    return calcProgressPercent(product.currentAmount, product.goalAmount);
  }, [product]);

  const isAchieved = product?.type === 0 && progressPercent >= 100;
  const orderDisabled = saleStatus !== 'active';
  const isPartnerUp = product?.type === 2;

  const handleOrder = async () => {
    if (!product || orderDisabled || addingCart) return;

    if (product.isInCart) {
      router.push('/cart');
      return;
    }

    setAddingCart(true);
    try {
      const res = await fetch('/api/v1/mypage/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message ?? '주문 처리 중 오류가 발생했습니다.');
      }

      router.push('/cart');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.');
    } finally {
      setAddingCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="logo-back" />

        <main className="flex-1">
          {loading ? (
            <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <p className="typo-body-small text-neutral-8">상품 정보를 불러오는 중입니다...</p>
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="typo-body-small text-neutral-9">{errorMessage}</p>
              <button
                type="button"
                onClick={() => router.push('/shop')}
                className="rounded-lg bg-orange-5 px-4 py-2 typo-body-small-bold text-neutral-2"
              >
                쇼핑 목록으로 이동
              </button>
            </div>
          ) : null}

          {!loading && !errorMessage && product ? (
            <>
              <ShopCard
                className="w-full"
                variant={product.type === 0 ? 'fund' : 'buynow_partnerup'}
                brand={product.teamName || '팀명'}
                title={product.name || '상품명'}
                description={product.description || ''}
                imageSrc={product.thumbnailUrl || undefined}
                statusLabel={isAchieved ? '달성' : '미달성'}
                percentText={`${progressPercent}%`}
                targetAmountText={`목표 금액 : ${formatWon(product.goalAmount)}`}
                progressPercent={progressPercent}
              />

              <section className="flex flex-col gap-[26px] px-4 py-0">
                {product.type === 0 ? (
                  <>
                    <DateBlock label="펀딩 기간" value={formatDateRange(product.salesStartDate, product.salesEndDate)} dday={dday} />
                    {product.receiveMethod === 0 ? (
                      <>
                        <DateBlock label="예상 제작 기간" value={formatDateRange(product.productionStartDate, product.productionEndDate)} />
                        <DateBlock label="예상 배송 기간" value={formatDateRange(product.deliveryStartDate, product.deliveryEndDate)} />
                      </>
                    ) : (
                      <>
                        <DateBlock label="수령 기간" value={formatDateRange(product.pickupStartDate, product.pickupEndDate)} />
                        <DateBlock label="수령 장소" value={product.pickupLocation || '-'} />
                      </>
                    )}
                  </>
                ) : (
                  <DateBlock label="판매 기간" value={formatDateRange(product.salesStartDate, product.salesEndDate)} dday={dday} />
                )}
              </section>

              <section className="mt-[60px] flex flex-col">
                {product.detailImageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative w-full">
                    <Image src={url} alt={`상품 상세 이미지 ${index + 1}`} width={375} height={529} className="h-auto w-full object-cover" />
                  </div>
                ))}
              </section>
            </>
          ) : null}
        </main>

        {!loading && !errorMessage && product ? (
          <div className="sticky bottom-0 z-20 border-t border-neutral-4 bg-neutral-3 px-5 py-[13px]">
            <div className={cn('mx-auto flex w-full max-w-[375px] items-center', isPartnerUp ? 'gap-[23px]' : 'gap-5')}>
              <button type="button" className="inline-flex h-6 w-6 items-center justify-center" aria-label="찜">
                <NeutralHeartIcon liked={product.isLiked} />
              </button>

              {!isPartnerUp ? (
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center"
                  aria-label="장바구니"
                  onClick={() => router.push('/cart')}
                >
                  <NeutralCartIcon />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleOrder}
                disabled={orderDisabled || addingCart}
                className={cn(
                  'h-[48px] min-w-0 flex-1 rounded-lg px-4 typo-body-small-bold text-neutral-2',
                  orderDisabled || addingCart ? 'cursor-not-allowed bg-orange-3' : 'cursor-pointer bg-orange-5'
                )}
              >
                주문하기
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
