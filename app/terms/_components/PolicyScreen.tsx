'use client';

import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Button from '@/components/ui/button/Button';

type PolicySection = {
  title: string;
  body: string;
};

const DEFAULT_SECTIONS: PolicySection[] = Array.from({ length: 5 }).map(() => ({
  title: '제1조(목적)',
  body:
    '본 약관은 안북스 스튜디오(이하 "회사")가 인터넷 사이트(https://gcsweb.kr)를 통하여 제공하는 회원 서비스, 크라우드펀딩 서비스, 스토어 서비스 등 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
}));

interface PolicyScreenProps {
  title: string;
  chapterTitle?: string;
  sections?: PolicySection[];
}

type BodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: { text: string; bullets: string[] }[] };

function parseBodyBlocks(body: string): BodyBlock[] {
  const lines = body.split('\n').map((line) => line.trim());
  const blocks: BodyBlock[] = [];

  let paragraphBuffer: string[] = [];
  let ulBuffer: string[] = [];
  let olBuffer: { text: string; bullets: string[] }[] = [];
  let lastStructured: 'paragraph' | 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ') });
      paragraphBuffer = [];
    }
  };

  const flushUl = () => {
    if (ulBuffer.length > 0) {
      blocks.push({ type: 'ul', items: ulBuffer });
      ulBuffer = [];
    }
  };

  const flushOl = () => {
    if (olBuffer.length > 0) {
      blocks.push({ type: 'ol', items: olBuffer });
      olBuffer = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      flushUl();
      lastStructured = null;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      flushUl();
      olBuffer.push({ text: line.replace(/^\d+\.\s+/, '').trim(), bullets: [] });
      lastStructured = 'ol';
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      if (olBuffer.length > 0 && lastStructured === 'ol') {
        olBuffer[olBuffer.length - 1].bullets.push(line.slice(2).trim());
      } else {
        flushOl();
        ulBuffer.push(line.slice(2).trim());
        lastStructured = 'ul';
      }
      continue;
    }

    if (olBuffer.length > 0) {
      flushOl();
    }
    flushUl();
    paragraphBuffer.push(line);
    lastStructured = 'paragraph';
  }

  flushParagraph();
  flushUl();
  flushOl();

  return blocks;
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
                <section key={`${section.title}-${index}`} className="space-y-4">
                  <h2 className="typo-heading-xsmall text-neutral-11">{section.title}</h2>

                  <div className="space-y-3 break-keep typo-body-small leading-[1.9] text-neutral-8">
                    {parseBodyBlocks(section.body).map((block, blockIndex) => {
                      if (block.type === 'paragraph') {
                        return <p key={`${section.title}-p-${blockIndex}`}>{block.text}</p>;
                      }

                      if (block.type === 'ul') {
                        return (
                          <ul key={`${section.title}-ul-${blockIndex}`} className="list-disc space-y-1 pl-5">
                            {block.items.map((item, itemIndex) => (
                              <li key={`${section.title}-ul-${blockIndex}-${itemIndex}`}>{item}</li>
                            ))}
                          </ul>
                        );
                      }

                      return (
                        <ol key={`${section.title}-ol-${blockIndex}`} className="list-decimal space-y-1 pl-5">
                          {block.items.map((item, itemIndex) => (
                            <li key={`${section.title}-ol-${blockIndex}-${itemIndex}`}>
                              <p>{item.text}</p>
                              {item.bullets.length > 0 ? (
                                <ul className="list-disc space-y-1 pl-5 pt-1">
                                  {item.bullets.map((bullet, bulletIndex) => (
                                    <li key={`${section.title}-ol-${blockIndex}-${itemIndex}-b-${bulletIndex}`}>
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      );
                    })}
                  </div>
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
