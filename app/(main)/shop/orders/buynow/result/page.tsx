'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const isSuccess = status === 'success';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-3 px-5 text-center">
      <p className="typo-body-medium-bold text-neutral-12">
        {isSuccess ? '결제 완료' : '결제 실패'}
      </p>
      <p className="typo-body-small text-neutral-9">
        {isSuccess
          ? '결제가 정상적으로 완료되었습니다.'
          : message || '결제가 완료되지 않았거나 취소되었습니다.'}
      </p>
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
