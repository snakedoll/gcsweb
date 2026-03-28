// 포트원 결제창 호출 
'use client';

import * as PortOne from '@portone/browser-sdk/v2';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [error, setError] = useState<string | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!orderId || triggered.current) return;

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/v1/shop/orders/${orderId}/payment/portone`);
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;

      //서버에서 결제에 필요한 정보를 불러오지 못한 경우
      if (!res.ok || json?.status !== 'success') {
        setError(json?.message ?? '결제 정보를 불러올 수 없습니다.');
        return;
      }

      const data = json.data as {
        storeId: string;
        channelKey: string;
        paymentId: string;
        orderName: string;
        totalAmount: number;
        currency: string;
        payMethod: string;
        redirectUrl: string;
        buyerName: string;
        buyerTel?: string;
        buyerEmail?: string;
      };

      // 제 SDK 호출에 필요한 최소한의 정보가 없는 경우
      if (!data.storeId || !data.channelKey || !data.paymentId) {
        setError('결제 정보가 올바르지 않습니다.');
        return;
      }

      triggered.current = true;

      const redirectFull = `${data.redirectUrl}?orderId=${orderId}`;

      // PortOne 결제창 호출
      try {
        const response = await PortOne.requestPayment({
          storeId: data.storeId,
          channelKey: data.channelKey,
          paymentId: data.paymentId,
          orderName: data.orderName,
          totalAmount: data.totalAmount,
          currency: data.currency as 'CURRENCY_KRW',
          payMethod: data.payMethod as 'CARD',
          redirectUrl: redirectFull,
          forceRedirect: true,
          customer: {
            fullName: data.buyerName,
            ...(data.buyerTel ? { phoneNumber: data.buyerTel } : {}),
            ...(data.buyerEmail ? { email: data.buyerEmail } : {}),
          },
        });

        // 포트원 쪽에서 결제 요청이 실패/취소/검증불가 등으로 처리된 경우
        if (response?.code != null) {
          setError(response?.message ?? '결제 요청에 실패했습니다.');
          triggered.current = false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '결제창 호출에 실패했습니다.');
        triggered.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  // requestPayment 호출 자체 예외 발생한 경우
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-3 px-5 text-center">
        <p className="typo-body-small text-neutral-9">{error}</p>
        <button
          type="button"
          className="rounded-lg bg-orange-5 px-4 py-2 typo-body-small-bold text-neutral-2"
          onClick={() => router.push('/shop')}
        >
          쇼핑으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-3">
      <p className="typo-body-small text-neutral-9">결제창을 여는 중입니다…</p>
    </div>
  );
}

export default function BuyNowPayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-3">
          <p className="typo-body-small text-neutral-9">로딩 중…</p>
        </div>
      }
    >
      <PayContent />
    </Suspense>
  );
}
