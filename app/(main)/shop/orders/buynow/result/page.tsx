'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? searchParams.get('paymentId');
  const portoneCode = searchParams.get('code');
  const portoneMessage = searchParams.get('message');
  const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!orderId) {
      setStatus('fail');
      setMessage('주문 정보를 확인할 수 없습니다.');
      return;
    }

    if (portoneCode != null) {
      setStatus('fail');
      setMessage(portoneMessage ?? '결제가 완료되지 않았습니다.');
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/v1/shop/orders/${orderId}/payment/portone/verify`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;

      const verified = json?.data?.verified === true;
      setStatus(verified ? 'success' : 'fail');
      setMessage(
        verified
          ? '결제가 정상적으로 완료되었습니다.'
          : json?.data?.message ?? '결제가 완료되지 않았습니다.',
      );
    })();

    return () => { cancelled = true; };
  }, [orderId, portoneCode, portoneMessage]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-3">
        <p className="typo-body-small text-neutral-9">결제 결과를 확인 중입니다…</p>
      </div>
    );
  }

  const isSuccess = status === 'success';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-3 px-5 text-center">
      <p className="typo-body-medium-bold text-neutral-12">
        {isSuccess ? '결제 완료' : '결제 실패'}
      </p>
      <p className="typo-body-small text-neutral-9">{message}</p>
      <button
        type="button"
        className="rounded-lg bg-orange-5 px-4 py-2 typo-body-small-bold text-neutral-2"
        onClick={() => router.push(isSuccess ? '/mypage' : '/shop')}
      >
        {isSuccess ? '마이페이지로 이동' : '쇼핑으로 이동'}
      </button>
    </div>
  );
}

export default function BuyNowResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-3">
          <p className="typo-body-small text-neutral-9">결과를 확인 중입니다…</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
