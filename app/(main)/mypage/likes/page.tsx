'use client';

import { NavBar } from '@/components/layout';
import { typography } from '@/lib/styles/typography';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function MypageLikesPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8f6f4]">
      <NavBar />
      <div className="mx-auto w-full max-w-[375px] flex-1 px-4 pb-8 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-6 w-6 items-center justify-center"
            aria-label="뒤로가기"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
          <h1 className={cn(typography.headingSmall, 'text-neutral-10')}>찜</h1>
          <div className="w-6" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className={cn(typography.bodyXSmall, 'text-neutral-7')}>찜한 상품이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
