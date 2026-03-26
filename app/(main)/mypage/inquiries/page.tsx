'use client';

import { NavBar } from '@/components/layout';
import { useRouter } from 'next/navigation';

export default function MypageInquiriesPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="문의하기" />

      <main className="mx-auto flex w-full max-w-[375px] flex-1 px-[17px] pt-[214px]">
        <section className="h-[227px] w-full rounded-[20px] border border-neutral-5 bg-neutral-1 px-[30px] py-[41px]">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="typo-heading-small text-orange-5">고객 지원</h1>
            <p className="typo-body-xsmall text-neutral-8">
              환불, 교환 및 기타 CS는
              <br />
              <span className="font-bold">gcsweb01234@gmail.com</span>로 문의주세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/mypage/inquiries/refund-policy')}
            className="typo-body-small mx-auto flex h-10 w-[280px] items-center justify-center rounded-lg bg-neutral-10 text-neutral-2"
          >
            환불 정책 안내 보기
          </button>
        </section>
      </main>
    </div>
  );
}
