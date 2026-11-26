'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readCatalogOrder } from '@/lib/qrshop/payment-session';
import type { QrshopService } from '@/lib/services/qrshop-service';

export default function QrshopOrderNumberBanner({ service, storeSlug }: { service: QrshopService; storeSlug: string | null }) {
  const router = useRouter();
  const [order, setOrder] = useState<{ orderId: string; orderCode: string; storeSlug: string } | null>(null);

  useEffect(() => {
    setOrder(null);
    if (service.dataSource !== 'api' || !storeSlug) return;
    const orderId = readCatalogOrder(storeSlug)?.orderId;
    if (!orderId) return;
    let cancelled = false;
    service.getOrder(orderId).then(result => {
      if (cancelled || readCatalogOrder(storeSlug)?.orderId !== orderId) return;
      if (result.status !== 'paid' || !result.orderCode || result.orderId !== orderId || result.storeSlug !== storeSlug) return;
      setOrder({ orderId, orderCode: result.orderCode, storeSlug });
    }).catch(() => { /* Keep the order ID so the next visit can retry verification. */ });
    return () => { cancelled = true; };
  }, [service, storeSlug]);

  if (!order || order.storeSlug !== storeSlug) return null;
  return (
    <div role="status" className="mx-4 mt-4">
      <button type="button" aria-label={`주문번호 ${order.orderCode} 결과 보기`} className="flex h-[33px] w-full items-center justify-between rounded-lg border border-orange-4 bg-neutral-1 px-4 text-left typo-body-small-bold text-orange-4" onClick={() => router.push(`/QRshop/result?orderId=${encodeURIComponent(order.orderId)}&storeSlug=${encodeURIComponent(order.storeSlug)}`)}>
        <span>주문번호 {order.orderCode}</span>
        <span aria-hidden className="h-[23px] w-[23px] bg-orange-4" style={{ mask: "url('/assets/icons/additional/Additional/Right-filled.svg') center / contain no-repeat", WebkitMask: "url('/assets/icons/additional/Additional/Right-filled.svg') center / contain no-repeat" }} />
      </button>
    </div>
  );
}
