'use client';

import { NavBar } from '@/components/layout';
import { EmptyviewText } from '@/components/ui/common';
import { useRouter } from 'next/navigation';

export default function MypageOrdersPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="주문내역" />

      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col items-center px-4 pb-8 pt-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <EmptyviewText title="주문내역이 없습니다." subtext={false} />
          <button
            type="button"
            onClick={() => router.push('/shop')}
            className="flex h-[39px] w-[182px] items-center justify-center rounded-[8px] bg-orange-5 typo-body-small-bold text-neutral-2"
          >
            상품 보러가기
          </button>
        </div>
      </main>
    </div>
  );
}
