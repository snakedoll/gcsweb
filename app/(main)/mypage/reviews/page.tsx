'use client';

import { NavBar } from '@/components/layout';
import EmptyviewText from '@/components/ui/common/EmptyviewText';

export default function MypageReviewsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="상품 리뷰" />

      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col items-center px-5 pb-8 pt-6">
        <div className="flex flex-1 items-center justify-center">
          <EmptyviewText
            title="준비 중..."
            subtitle="구매하신 상품의 리뷰를 작성 가능합니다."
            subtext
          />
        </div>
      </main>
    </div>
  );
}
