'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createQrshopMockService,
  qrshopMockService,
  qrshopQaProducts,
  qrshopStockNoticeMockService,
} from '@/lib/mocks';
import { createQrshopApiService, QrshopApiError } from '@/lib/services/qrshop-api-service';
import { rememberCheckoutCart, takeRefundCart } from '@/lib/qrshop/payment-session';
import { QrshopStoreNotFoundError, type QrshopCatalogResult } from '@/lib/services/qrshop-service';
import type { QrshopCartLine, QrshopProduct } from '@/types/qrshop';
import QrshopCartPanel from './QrshopCartPanel';
import QrshopOptionModal from './QrshopOptionModal';
import QrshopProductCard from './QrshopProductCard';
import QrshopSoldOutModal from './QrshopSoldOutModal';
import QrshopStockShortageModal from './QrshopStockShortageModal';
import QrshopStateView from './QrshopStateView';
import QrshopOrderNumberBanner from './QrshopOrderNumberBanner';

type CatalogState = { status: 'loading' | 'ready' | 'error' | 'not-found'; products: QrshopProduct[]; storeStatus?: QrshopCatalogResult['storeStatus']; store?: QrshopCatalogResult['store']; categories?: QrshopCatalogResult['categories']; message?: string };

export default function QrshopOrderClient({ storeSlug: routeStoreSlug }: { storeSlug?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = searchParams.get('scenario');
  const storeSlug = routeStoreSlug ?? searchParams.get('storeSlug');
  const service = useMemo(() => {
    if (storeSlug !== null && storeSlug !== undefined) return createQrshopApiService(storeSlug);
    if (scenario === 'closed') return createQrshopMockService({ storeStatus: 'closed' });
    if (scenario === 'empty') return createQrshopMockService({ catalogScenario: { kind: 'empty', data: { items: [], total: 0 }, delayMs: 200 } });
    if (scenario === 'error') return createQrshopMockService({ catalogScenario: { kind: 'error', message: '상품을 불러오지 못했습니다.', delayMs: 200 } });
    if (scenario === 'not-found') return createQrshopMockService({ storeNotFound: true });
    if (scenario === 'soldout') return createQrshopMockService({ soldOutOnRefreshIds: ['keyring-black'] });
    if (scenario === 'soldout-multiple') return createQrshopMockService({ soldOutOnRefreshIds: ['keyring-black', 'tshirt-small', 'tshirt-large'] });
    if (scenario === 'stock-notices') return qrshopStockNoticeMockService;
    if (scenario === 'closed-on-refresh') return createQrshopMockService({ storeStatusOnRefresh: 'closed' });
    if (scenario === 'edge-cases') return createQrshopMockService({
      catalogScenario: {
        kind: 'success',
        data: { items: qrshopQaProducts, total: qrshopQaProducts.length },
        delayMs: 100,
      },
    });
    return qrshopMockService;
  }, [scenario, storeSlug]);
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading', products: [] });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [optionProducts, setOptionProducts] = useState<QrshopProduct[] | null>(null);
  const [soldOutProducts, setSoldOutProducts] = useState<{ name: string; count: number } | null>(null);
  const [stockShortage, setStockShortage] = useState<QrshopCartLine | null>(null);
  const [stockLimitToast, setStockLimitToast] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const catalogRequest = useRef(0);
  const submitInFlight = useRef(false);
  const shopHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    catalogRequest.current += 1;
    setCatalog({ status: 'loading', products: [] });
    setQuantities({}); setSelectedCategory('all'); setOptionProducts(null);
    setSoldOutProducts(null); setAgreed(false); setSubmitError(null); setSubmitting(false);
    setStockShortage(null); setStockLimitToast(0);
    service.getCatalog().then(result => {
      if (cancelled) return;
      setCatalog({ status: 'ready', products: result.items, storeStatus: result.storeStatus, store: result.store, categories: result.categories });
      if (result.storeStatus === 'closed') return;
      const restored = takeRefundCart(storeSlug);
      if (restored) setQuantities(Object.fromEntries(result.items.flatMap(({ id }) => {
        const quantity = restored[id];
        return Number.isInteger(quantity) && quantity >= 1 && quantity <= 99 ? [[id, quantity]] : [];
      })));
    }).catch((error: unknown) => {
      if (cancelled) return;
      setCatalog({
        status: error instanceof QrshopStoreNotFoundError ? 'not-found' : 'error',
        products: [],
        message: error instanceof Error ? error.message : '상품을 불러오지 못했습니다.',
      });
    });
    return () => { cancelled = true; catalogRequest.current += 1; };
  }, [service, retry, storeSlug]);

  useEffect(() => {
    if (!stockLimitToast) return;
    const timer = setTimeout(() => setStockLimitToast(0), 4000);
    return () => clearTimeout(timer);
  }, [stockLimitToast]);

  const closed = catalog.storeStatus === 'closed';
  const categories = useMemo(() => {
    const unique = new Map<string, string>(catalog.categories?.map(category => [category.id, category.name]));
    for (const product of catalog.products) unique.set(product.categoryId, product.categoryName);
    return [
      { id: 'all', name: '전체' },
      ...[...unique].map(([id, name]) => ({ id, name })),
      ...(catalog.products.some((product) => product.soldOut) ? [{ id: 'soldout', name: '품절' }] : []),
    ];
  }, [catalog.products, catalog.categories]);
  const productGroups = useMemo(() => {
    const groups = new Map<string, QrshopProduct[]>();
    for (const product of catalog.products) {
      const key = product.sourceProductId ?? `${product.categoryId}:${product.name}:${product.imageUrl ?? ''}`;
      groups.set(key, [...(groups.get(key) ?? []), product]);
    }
    return [...groups.entries()].map(([key, products]) => ({ key, products }));
  }, [catalog.products]);
  const visibleGroups = useMemo(() => {
    if (selectedCategory === 'all') return productGroups;
    if (selectedCategory === 'soldout') return productGroups.filter(({ products }) => products.some((product) => product.soldOut));
    return productGroups.filter(({ products }) => products[0]?.categoryId === selectedCategory);
  }, [productGroups, selectedCategory]);
  const lines = useMemo<QrshopCartLine[]>(() => catalog.products.flatMap((product) => {
    const quantity = quantities[product.id] ?? 0;
    return quantity > 0 ? [{ productId: product.id, sourceProductId: product.sourceProductId, optionId: product.optionId, productName: product.name, option: product.option, quantity, unitPrice: product.price, stock: product.stock }] : [];
  }), [catalog.products, quantities]);
  const updateQuantity = (productId: string, next: number) => {
    if (submitting) return;
    const product = catalog.products.find(item => item.id === productId);
    const limit = product?.soldOut ? 0 : Math.min(99, product?.stock ?? 99);
    setQuantities((current) => { const copy = { ...current }; if (next <= 0 || limit === 0) delete copy[productId]; else copy[productId] = Math.min(limit, next); return copy; });
    setSubmitError(null);
    if (next > limit) setStockLimitToast(current => current + 1);
  };
  const submit = async () => {
    if (submitInFlight.current || submitting || closed || !agreed || lines.length === 0) return;
    submitInFlight.current = true;
    const requestVersion = catalogRequest.current;
    setSubmitting(true); setSubmitError(null);
    setStockLimitToast(0);
    try {
      const latestCatalog = await service.getCatalog({ refresh: true });
      if (requestVersion !== catalogRequest.current) return;
      setCatalog({ status: 'ready', products: latestCatalog.items, storeStatus: latestCatalog.storeStatus, store: latestCatalog.store, categories: latestCatalog.categories });
      if (latestCatalog.storeStatus === 'closed') {
        return;
      }
      const latestById = new Map(latestCatalog.items.map(product => [product.id, product]));
      const unavailable = lines.filter(line => {
        const product = latestById.get(line.productId);
        return !product || product.soldOut || product.stock === 0;
      });
      const stockReduced = lines.find(line => {
        const product = latestById.get(line.productId);
        return product && !product.soldOut && product.stock !== undefined && line.quantity > product.stock;
      });
      if (unavailable.length || stockReduced) {
        setQuantities(current => Object.fromEntries(Object.entries(current).flatMap(([id, quantity]) => {
          const product = latestById.get(id);
          if (!product || product.soldOut || product.stock === 0) return [];
          return [[id, Math.min(quantity, product.stock ?? 99)]];
        })));
        setAgreed(false);
        if (stockReduced) setStockShortage(stockReduced);
        if (unavailable.length) {
          const [first] = unavailable;
          setSoldOutProducts({ name: first.option ? `${first.productName}(${first.option})` : first.productName, count: unavailable.length });
        }
        return;
      }
      const refreshedLines = lines.map(line => ({ ...line, unitPrice: latestCatalog.items.find(item => item.id === line.productId)!.price }));
      const order = await service.createOrder({ termsAgreed: agreed, lines: refreshedLines, buyerName: '', buyerPhone: '', paymentMethod: 'online' });
      if (requestVersion !== catalogRequest.current) return;
      rememberCheckoutCart(storeSlug, order.orderId, Object.fromEntries(refreshedLines.map(line => [line.productId, line.quantity])));
      router.push(`/QRshop/pay?orderId=${encodeURIComponent(order.orderId)}${storeSlug == null ? '' : `&storeSlug=${encodeURIComponent(storeSlug)}`}`);
    } catch (error) {
      if (requestVersion === catalogRequest.current) {
        if (error instanceof QrshopStoreNotFoundError) setCatalog({ status: 'not-found', products: [] });
        else setSubmitError(error instanceof Error ? error.message : '주문을 저장하지 못했습니다.');
        if (error instanceof QrshopApiError && error.status === 409) setAgreed(false);
      }
    } finally { submitInFlight.current = false; if (requestVersion === catalogRequest.current) setSubmitting(false); }
  };

  if (catalog.status === 'loading') return <div role="status" className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pt-[34px]"><div className="h-9 w-28 animate-pulse rounded bg-neutral-5" /><div className="mt-5 h-7 w-full animate-pulse rounded bg-neutral-5" /><div className="mt-4 grid grid-cols-2 gap-x-[5px] gap-y-3">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[244px] animate-pulse rounded bg-neutral-5" />)}</div><span className="sr-only">상품을 불러오는 중입니다.</span></div>;
  if (catalog.status === 'not-found') return <QrshopStateView icon="warning" title="존재하지 않는 상점입니다." description="링크를 다시 확인해주시기 바랍니다." />;
  if (catalog.status === 'error') return <QrshopStateView icon="warning" title="상품을 불러올 수 없습니다" description={catalog.message} actionLabel="다시 시도" onAction={() => setRetry(current => current + 1)} />;
  if (catalog.products.length === 0) return (
    <>
      <div className="absolute inset-x-0 top-0 mx-auto max-w-[430px]">
        <QrshopOrderNumberBanner service={service} storeSlug={storeSlug ?? null} />
      </div>
      <QrshopStateView icon="cart" title="해당 샵에 아직 등록된 상품이 없습니다!" />
    </>
  );

  return (
    <main className={`mx-auto min-h-dvh w-full max-w-[430px] ${closed ? 'pb-4' : 'pb-[360px]'}`}>
      <header className="flex h-[71px] items-center px-4 pt-[34px]"><h1 ref={shopHeadingRef} tabIndex={-1} className="typo-heading-large text-neutral-12">{catalog.store?.name ?? '잇장샵'}</h1></header>
      <nav aria-label="상품 카테고리" className="flex h-[42px] items-end overflow-x-auto pl-4">{categories.map((category) => { const active = category.id === selectedCategory; return <button key={category.id} type="button" className={`h-[29px] shrink-0 border-b px-5 typo-body-xsmall ${active ? 'border-orange-5 text-orange-5' : 'border-transparent text-neutral-7'}`} onClick={() => setSelectedCategory(category.id)}>{category.name}</button>; })}</nav>
      {closed && <p role="status" className="mx-4 mt-4 flex min-h-[33px] items-center justify-center rounded-lg border border-orange-4 bg-neutral-1 px-4 py-1 typo-body-small-bold text-orange-4">상점이 아직 오픈되지 않았어요!</p>}
      <QrshopOrderNumberBanner service={service} storeSlug={storeSlug ?? null} />
      <section aria-label="상품 목록" className="grid grid-cols-2 gap-x-[5px] gap-y-3 px-4 pt-4">
        {visibleGroups.map(({ key, products }) => {
          const product = products.reduce((lowest, current) => current.price < lowest.price ? current : lowest);
          const soldOut = products.every((item) => item.soldOut);
          return (
            <QrshopProductCard
              key={key}
              product={product}
              optionNames={products.flatMap((item) => item.option ? [item.option] : [])}
              selected={products.some((item) => (quantities[item.id] ?? 0) > 0)}
              soldOut={soldOut}
              disabled={closed || submitting}
              onSelect={() => {
                if (closed || soldOut || submitting) return;
                if (products.length === 1 && !product.option) updateQuantity(product.id, (quantities[product.id] ?? 0) + 1);
                else setOptionProducts(products);
              }}
            />
          );
        })}
      </section>
      {!closed && <QrshopCartPanel lines={lines} agreed={agreed} submitting={submitting} error={submitError} onAgreementChange={setAgreed} onQuantityChange={updateQuantity} onRemove={(productId) => updateQuantity(productId, 0)} onSelectLine={(productId) => { const group = productGroups.find(({ products }) => products.some((item) => item.id === productId)); if (group && !submitting) setOptionProducts(group.products); }} onSubmit={() => void submit()} />}
      {!closed && optionProducts ? (
        <QrshopOptionModal
          products={optionProducts}
          selectedIds={optionProducts.filter((product) => (quantities[product.id] ?? 0) > 0).map((product) => product.id)}
          onClose={() => setOptionProducts(null)}
          onConfirm={(selectedIds) => {
            setQuantities((current) => {
              const next = { ...current };
              for (const product of optionProducts) {
                if (selectedIds.includes(product.id) && !product.soldOut && product.stock !== 0) next[product.id] = next[product.id] || 1;
                else delete next[product.id];
              }
              return next;
            });
            setSubmitError(null);
            setOptionProducts(null);
          }}
        />
      ) : null}
      {!closed && soldOutProducts ? <QrshopSoldOutModal productName={soldOutProducts.name} productCount={soldOutProducts.count} onConfirm={() => setSoldOutProducts(null)} /> : null}
      {!closed && !soldOutProducts && stockShortage ? (
        <QrshopStockShortageModal line={stockShortage} onConfirm={() => {
          setStockShortage(null);
          shopHeadingRef.current?.focus({ preventScroll: true });
        }} />
      ) : null}
      {stockLimitToast > 0 ? (
        <div role="alert" className="pointer-events-none fixed left-1/2 top-[93px] z-50 flex min-h-10 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center gap-2.5 rounded-lg bg-neutral-10 px-4 py-2 text-white">
          <Image src="/assets/icons/filled/Filled/Info%20square.svg" alt="" width={20} height={20} className="shrink-0 brightness-0 invert" />
          <p className="typo-body-small-bold">남은 재고수 이상으로 상품을 담을 수 없습니다.</p>
        </div>
      ) : null}
    </main>
  );
}
