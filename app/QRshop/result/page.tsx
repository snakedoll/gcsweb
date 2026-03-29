'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const GUEST_TOKEN_STORAGE_KEY = 'shop:guest-token';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? searchParams.get('paymentId');
  const portoneCode = searchParams.get('code');
  const portoneMessage = searchParams.get('message');

  const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
  const [message, setMessage] = useState('');
  const [orderCode, setOrderCode] = useState('');

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
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    (async () => {
      let lastMessage = '결제가 완료되지 않았습니다.';

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const res = await fetch(`/api/v1/shop/orders/${orderId}/payment/portone/verify`, {
          method: 'POST',
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        const verified = json?.data?.verified === true;
        if (verified) {
          setStatus('success');
          return;
        }

        lastMessage = json?.data?.message ?? lastMessage;
        if (attempt < 2) {
          await delay(1200);
        }
      }

      if (cancelled) return;
      setStatus('fail');
      setMessage(lastMessage);
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, portoneCode, portoneMessage]);

  useEffect(() => {
    if (status !== 'success' || !orderId) return;

    let cancelled = false;

    (async () => {
      const guestToken =
        typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY)?.trim() ?? '' : '';

      const res = await fetch(`/api/v1/shop/orders/${orderId}`, {
        cache: 'no-store',
        headers: guestToken ? { 'x-guest-token': guestToken } : {},
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;

      if (res.ok && json?.status === 'success') {
        const code = json?.data?.order?.orderCode;
        if (typeof code === 'string' && code) setOrderCode(code);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, status]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-[15px] text-neutral-8">결제 결과를 확인 중입니다.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="rounded-full bg-[#e8f3ff] p-4 text-[40px]" aria-hidden>
          ✓
        </div>
        <div>
          <p className="text-[20px] font-bold text-neutral-12">결제가 완료되었습니다</p>
          {orderCode ? (
            <p className="mt-2 text-[16px] font-semibold text-[#3182f6]">주문번호 {orderCode}</p>
          ) : null}
          <p className="mt-2 text-[14px] text-neutral-8">주문 확인을 위해 번호를 저장해 주세요.</p>
        </div>
        <button
          type="button"
          className="w-full max-w-[320px] rounded-[14px] bg-[#3182f6] py-4 text-[16px] font-semibold text-white"
          onClick={() => router.push('/QRshop')}
        >
          처음으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-[18px] font-semibold text-neutral-12">결제에 실패했습니다</p>
      <p className="text-[14px] text-neutral-8">{message}</p>
      <button
        type="button"
        className="w-full max-w-[320px] rounded-[14px] bg-[#3182f6] py-4 text-[16px] font-semibold text-white"
        onClick={() => router.push('/QRshop')}
      >
        다시 주문하기
      </button>
    </div>
  );
}

export default function QRshopResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-[15px] text-neutral-8">결과를 확인 중입니다.</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
