'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import { qrshopMockService } from '@/lib/mocks';
import { createQrshopApiService } from '@/lib/services/qrshop-api-service';
import { markRefundCart, rememberCatalogOrder } from '@/lib/qrshop/payment-session';
import { formatWon } from '@/lib/utils';
import type { QrshopOrderResult } from '@/types/qrshop';
import QrshopStateView from './QrshopStateView';

function ResultItems({ lines, label, className }: {
  lines: QrshopOrderResult['lines'];
  label: string;
  className: string;
}) {
  return <ul aria-label={label} className={`space-y-[10px] overflow-y-auto ${className}`} tabIndex={0}>
    {lines.map(line => <li key={line.productId} className="min-h-[100px] rounded-lg bg-neutral-2 px-4 py-3 typo-body-xsmall">
      <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-2 break-words">
        <dt className="text-neutral-10">상품명</dt><dd className="font-semibold text-neutral-10">{line.productName}</dd>
        <dt className="text-neutral-8">옵션 / 수량</dt><dd className="text-neutral-8">{line.option ?? '옵션 없음'} / {line.quantity}개</dd>
        <dt className="text-neutral-8">가격</dt><dd className="text-neutral-8">{formatWon(line.unitPrice)}</dd>
      </dl>
    </li>)}
  </ul>;
}

export default function QrshopResultClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const storeSlug = searchParams.get('storeSlug');
  const service = useMemo(() => storeSlug === null ? qrshopMockService : createQrshopApiService(storeSlug), [storeSlug]);
  const catalogUrl = storeSlug === null ? '/QRshop' : `/QRshop?storeSlug=${encodeURIComponent(storeSlug)}`;
  const [retry, setRetry] = useState(0);
  const [loadedService, setLoadedService] = useState<typeof service | null>(null);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<QrshopOrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrder(null); setError(null); setLoadedService(service); setLoadedOrderId(orderId);
    if (!orderId) { setError('주문 번호가 없습니다.'); return; }
    let cancelled = false;
    (service.verifyPayment ? service.verifyPayment(orderId) : service.getOrder(orderId)).then(result => {
      if (cancelled) return;
      if (result.failureCode === 'STOCK_SHORTAGE' || result.failureCode === 'REFUND_PENDING') markRefundCart(storeSlug, result.orderId);
      setOrder(result);
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : '주문 결과를 불러오지 못했습니다.'); });
    return () => { cancelled = true; };
  }, [orderId, service, retry, storeSlug]);

  if (loadedService !== service || loadedOrderId !== orderId) return <div role="status">주문 결과를 확인하는 중입니다.</div>;
  if (!orderId) return <QrshopStateView icon="warning" title="주문 결과를 확인할 수 없습니다" description="주문 번호가 없습니다." actionLabel="처음으로" onAction={() => router.push(catalogUrl)} paymentResult />;
  if (error) return <QrshopStateView icon="warning" title="주문 결과를 확인할 수 없습니다" description={error} actionLabel="다시 확인" onAction={() => setRetry(value => value + 1)} paymentResult />;
  if (!order) return <div role="status" className="flex min-h-dvh items-center justify-center typo-body-small text-neutral-8">주문 결과를 확인하는 중입니다.</div>;

  if (order.failureCode === 'STOCK_SHORTAGE' || order.failureCode === 'REFUND_PENDING') {
    return (
      <main className="mx-auto flex h-dvh min-h-[420px] w-full max-w-[430px] flex-col px-4 pb-[max(51px,env(safe-area-inset-bottom))] pt-[67px]">
        <section className="flex shrink-0 flex-col items-center text-center">
          <span aria-hidden className="mb-5 h-10 w-10 bg-orange-5" style={{ mask: "url('/assets/icons/additional/icon-park-solid_caution.svg') center / contain no-repeat", WebkitMask: "url('/assets/icons/additional/icon-park-solid_caution.svg') center / contain no-repeat" }} />
          <h1 className="typo-body-small-bold text-neutral-12">해당 상품 품절로 전체 결제가 취소되었습니다.</h1>
          <p className="typo-body-small mt-[3px] text-neutral-9">{order.failureCode === 'REFUND_PENDING' ? '환불 확인이 필요합니다. 상점 직원에게 문의해주세요.' : '결제된 금액은 환불 예정입니다.'}</p>
        </section>
        <ResultItems lines={order.lines.filter(line => line.soldOut)} label="품절 상품 목록" className="mt-[38px] min-h-0 flex-1" />
      </main>
    );
  }

  if (order.status !== 'paid') {
    const title = order.status === 'pending' ? '결제가 완료되지 않았습니다.' : order.status === 'failed' ? '결제가 실패되었습니다.' : order.status === 'refund-pending' ? '환불 확인이 필요합니다.' : '결제가 취소되었습니다.';
    return <QrshopStateView icon={order.status === 'canceled' ? 'cart' : 'warning'} title={title} description={order.status === 'refund-pending' ? '상점 직원에게 주문 상태를 확인해주세요.' : undefined} paymentResult />;
  }

  const dateParts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(new Date(order.createdAt));
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find(item => item.type === type)?.value;
  const date = `${part('year')}.${part('month')}.${part('day')} ${part('weekday')}`;
  return (
    <main className="mx-auto flex h-dvh min-h-[480px] w-full max-w-[430px] flex-col px-4 pb-[max(51px,env(safe-area-inset-bottom))] pt-[90px] [@media(max-height:700px)]:pt-10">
      <section className="shrink-0 flex flex-col items-center text-center">
        <h1 className="typo-heading-small text-black">결제가 완료되었습니다</h1>
        <p className="text-[55px] font-extrabold leading-[1.55] text-orange-5">{order.orderCode}</p>
        <p className="mt-[15px] w-full rounded-[5px] border border-orange-4 bg-orange-1 px-3 py-[7px] typo-body-small-bold text-orange-10">카운터 직원에게 해당 화면을 보여주세요.</p>
      </section>
      <section aria-label="주문 내역" className="mb-4 mt-[26px] flex min-h-0 flex-1 flex-col">
        <div className="flex h-[21px] items-center gap-2"><h2 className="typo-body-xsmall-bold text-black">주문내역</h2><span className="typo-body-xsmall text-neutral-7">{date}</span></div>
        <ResultItems lines={order.lines} label="완료 주문 상품 목록" className="mt-[10px] min-h-0 max-h-[343px]" />
      </section>
      <div role="group" aria-label="결제 결과 요약" className="mt-auto shrink-0">
        <div className="mb-[26px] flex items-center justify-between typo-body-small-bold"><span className="text-neutral-12">결제 금액</span><span className="text-orange-6">{formatWon(order.totalAmount)}</span></div>
        <Button className="h-[45px] rounded-[4px]" color="orange" onClick={() => {
          if (service.dataSource === 'api' && storeSlug && order.storeSlug === storeSlug) {
            rememberCatalogOrder(storeSlug, { orderId: order.orderId, orderedAt: order.createdAt });
          }
          router.push(catalogUrl);
        }}>처음으로</Button>
      </div>
    </main>
  );
}
