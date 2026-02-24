'use client';

import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Button from '@/components/ui/button/Button';

type PolicySection = {
  title: string;
  body: string;
};

const DEFAULT_SECTIONS: PolicySection[] = Array.from({ length: 5 }).map(() => ({
  title: '제1조 (목적)',
  body:
    '본 약관은 안복스 스튜디오(이하 "회사")가 인터넷 사이트(https://gcsweb.kr)를 통하여 제공하는 회원 서비스, 크라우드펀딩 서비스, 스토어 서비스 등 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
}));

interface PolicyScreenProps {
  title: string;
  chapterTitle?: string;
  sections?: PolicySection[];
}

export default function PolicyScreen({
  title,
  chapterTitle = '제1장 총칙',
  sections = DEFAULT_SECTIONS,
}: PolicyScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="title" title={title} />

        <main className="flex-1 px-4 pt-10">
          <div className="space-y-8">
            <h1 className="typo-heading-medium text-neutral-12">{chapterTitle}</h1>

            <div className="space-y-8">
              {sections.map((section, index) => (
                <section key={`${section.title}-${index}`} className="space-y-3">
                  <h2 className="typo-heading-xsmall text-neutral-11">{section.title}</h2>
                  <p className="whitespace-pre-line break-keep typo-body-small leading-[1.8] text-neutral-8">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </main>

        <div className="px-4 pb-4 pt-8">
          <Button type="button" color="black" size="l" className="h-[54px]" onClick={() => router.back()}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
