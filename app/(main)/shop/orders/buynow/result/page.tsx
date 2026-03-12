'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import { Button, EmptyviewText } from '@/components/ui';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? searchParams.get('paymentId');
  const isCounterPay = searchParams.get('counterPay') === '1';
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

    if (isCounterPay) {
      setStatus('success');
      setMessage('COUNTER_PAY_COMPLETED');
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
          ? '주문이 완료되었습니다.'
          : json?.data?.message ?? '결제가 완료되지 않았습니다.',
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [isCounterPay, orderId, portoneCode, portoneMessage]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-78px)] items-center justify-center bg-neutral-3 px-5">
        <p className="typo-body-small text-neutral-9">결제 결과를 확인 중입니다.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-[calc(100vh-78px)] bg-neutral-3">
        <NavBar variant="title-back" title="주문하기" />
        <div className="mx-auto flex w-full max-w-[375px] flex-col items-center px-[63px] pt-[303px] pb-[303px]">
          <div className="flex w-full flex-col items-center gap-6">
            <EmptyviewText title="주문이 완료되었습니다." subtitle="카운터에서 상품을 수령해가세요!" />
            <Button
              size="m"
              color="orange"
              className="h-[47px] w-[182px]"
              onClick={() => router.push('/')}
            >
              홈으로 이동
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-78px)] bg-neutral-3">
      <NavBar variant="title-back" title="주문하기" />
      <div className="mx-auto flex w-full max-w-[375px] flex-col items-center gap-4 px-5 pt-[220px] pb-[220px] text-center">
        <EmptyviewText title="결제에 실패했습니다." subtitle={message} />
        <Button size="m" color="orange" className="h-[47px] w-[182px]" onClick={() => router.push('/shop')}>
          샵으로 이동
        </Button>
      </div>
    </div>
  );
}

export default function BuyNowResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-3 px-5">
          <p className="typo-body-small text-neutral-9">결과를 확인 중입니다.</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
