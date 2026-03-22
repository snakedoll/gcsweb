'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopOrdersBuyNowGuestPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/shop/orders/buynow');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-3 text-neutral-9">
      주문 정보를 불러오는 중입니다.
    </div>
  );
}
