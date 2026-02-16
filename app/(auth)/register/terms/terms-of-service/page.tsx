'use client';

import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';

const MOCK_TERMS = Array.from({ length: 5 }).map((_, index) => ({
  id: index,
  title: '제1조 (목적)',
  body:
    '본 약관은 안북스 스튜디오(이하 "회사")가 인터넷 사이트(https://gcsweb.kr)를 통하여 제공하는 회원 서비스, 크라우드펀딩 서비스, 스토어 서비스 등 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
}));

export default function RegisterTermsSitePage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="title" title="홈페이지 이용약관" />

      <div className="rounded-t-[12px] bg-white px-4 pb-5 pt-5">
        <div className="max-h-[610px] space-y-6 overflow-y-auto pr-1">
          <h1 className="text-neutral-10 typo-heading-small">제1장 총칙</h1>

          <div className="space-y-3">
            {MOCK_TERMS.map((item) => (
              <section key={item.id} className="space-y-3">
                <h2 className="text-neutral-10 typo-heading-xxsmall">{item.title}</h2>
                <p className="text-neutral-8 typo-body-xsmall">{item.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white px-4 pb-[50px] pt-[17px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-[55px] w-full rounded-lg bg-orange-5 text-neutral-2 typo-body-small-bold"
        >
          확인
        </button>
      </div>
    </div>
  );
}
