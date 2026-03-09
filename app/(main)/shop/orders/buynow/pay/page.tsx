'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (!orderId || submitted.current) return;

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/v1/shop/orders/${orderId}/payment/inicis`);
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;

      if (!res.ok || json?.status !== 'success') {
        setError(json?.message ?? '결제 정보를 불러올 수 없습니다.');
        return;
      }

      const { gatewayUrl, params } = json.data as {
        gatewayUrl: string;
        params: Record<string, string>;
      };

      if (!gatewayUrl || !params) {
        setError('결제 정보가 올바르지 않습니다.');
        return;
      }

      submitted.current = true;

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = gatewayUrl;
      form.acceptCharset = 'ISO-8859-1';
      Object.entries(params).forEach(([key, value]) => {
        if (value == null) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    })();

    return () => { cancelled = true; };
  }, [orderId]);

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
      <p className="typo-body-small text-neutral-9">결제 페이지로 이동 중입니다…</p>
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
