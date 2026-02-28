'use client';

import { useRouter } from 'next/navigation';

import NavBar from '@/components/layout/NavBar';

interface PolicySection {
  title: string;
  body: string;
}

interface PolicyScreenProps {
  title: string;
  chapterTitle?: string;
  sections: PolicySection[];
}

type BodyBlock =
  | { type: 'chapter'; text: string }
  | { type: 'article'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: { text: string; bullets: string[] }[] };

const CIRCLED_NUMBER_MAP: Record<string, number> = {
  '①': 1,
  '②': 2,
  '③': 3,
  '④': 4,
  '⑤': 5,
  '⑥': 6,
  '⑦': 7,
  '⑧': 8,
  '⑨': 9,
};

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

    const circled = line.match(/^[①②③④⑤⑥⑦⑧⑨]\s*(.*)$/);
    if (circled) {
      flushParagraph();
      flushUl();
      const text = circled[1]?.trim() ?? '';
      olBuffer.push({ text, bullets: [] });
      lastStructured = 'ol';
      continue;
    }

    if (/^제\s*\d+\s*장/.test(line)) {
      flushParagraph();
      flushUl();
      flushOl();
      blocks.push({ type: 'chapter', text: line });
      lastStructured = null;
      continue;
    }

    if (/^제\s*\d+\s*조/.test(line)) {
      flushParagraph();
      flushUl();
      flushOl();
      blocks.push({ type: 'article', text: line });
      lastStructured = null;
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

    if (/^[가-힣]\)/.test(line) && olBuffer.length > 0 && lastStructured === 'ol') {
      flushParagraph();
      olBuffer[olBuffer.length - 1].bullets.push(line);
      continue;
    }

    if (olBuffer.length > 0) flushOl();
    flushUl();
    paragraphBuffer.push(line);
    lastStructured = 'paragraph';
  }

  flushParagraph();
  flushUl();
  flushOl();

  return blocks;
}

function BodyText({ text }: { text: string }) {
  const blocks = parseBodyBlocks(text);

  return (
    <div className="space-y-3 break-keep text-neutral-8">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'chapter') {
          return (
            <h2 key={`chapter-${blockIndex}`} className="typo-heading-small pt-2 text-[19px] leading-[1.55] text-neutral-10">
              {block.text}
            </h2>
          );
        }

        if (block.type === 'article') {
          return (
            <h3 key={`article-${blockIndex}`} className="typo-heading-xxsmall pt-2 text-[15px] leading-[1.5] text-neutral-10">
              {block.text}
            </h3>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={`p-${blockIndex}`} className="typo-body-xsmall leading-[1.5] tracking-[-0.26px] text-neutral-8">
              {block.text}
            </p>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={`ul-${blockIndex}`} className="typo-body-xsmall list-disc space-y-1 pl-5 leading-[1.5] tracking-[-0.26px] text-neutral-8">
              {block.items.map((item, itemIndex) => (
                <li key={`ul-${blockIndex}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <ol key={`ol-${blockIndex}`} className="typo-body-xsmall list-decimal space-y-2 pl-5 leading-[1.5] tracking-[-0.26px] text-neutral-8">
            {block.items.map((item, itemIndex) => (
              <li key={`ol-${blockIndex}-${itemIndex}`}>
                <p>{item.text}</p>
                {item.bullets.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 pt-1">
                    {item.bullets.map((bullet, bulletIndex) => (
                      <li key={`ol-${blockIndex}-${itemIndex}-bullet-${bulletIndex}`}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

export default function PolicyScreen({ title, chapterTitle, sections }: PolicyScreenProps) {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
      <NavBar variant="title-back" title={title} onBack={() => router.back()} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col rounded-t-[12px] bg-neutral-1 px-4 pt-5">
          <div className="min-h-0 flex-1 overflow-y-auto pb-6">
            <div className="space-y-6">
              {chapterTitle ? (
                <h2 className="typo-heading-small text-[32px] leading-[1.55] tracking-[-0.64px] text-neutral-10">{chapterTitle}</h2>
              ) : null}

              {sections.map((section, index) => (
                <section key={`${section.title}-${index}`} className="space-y-3 text-neutral-10">
                  <h3 className="typo-heading-xxsmall text-[15px] leading-[1.5]">{section.title}</h3>
                  <BodyText text={section.body} />
                </section>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-neutral-1 px-4 pb-[50px] pt-[17px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="typo-body-small-bold flex h-[56px] w-full items-center justify-center rounded-[8px] bg-primary-6 text-neutral-2"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
