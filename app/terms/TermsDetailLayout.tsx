'use client';

import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';

type BodyBlock =
  | { type: 'chapter'; text: string }
  | { type: 'article'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: { text: string; bullets: string[] }[] };

function normalizeLine(raw: string): string {
  const line = raw.trim();
  return line.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '').trim();
}

function parseBodyBlocks(body: string): BodyBlock[] {
  const lines = body.split('\n').map(normalizeLine);
  const blocks: BodyBlock[] = [];

  let paragraphBuffer: string[] = [];
  let ulBuffer: string[] = [];
  let olBuffer: { text: string; bullets: string[] }[] = [];
  let lastStructured: 'paragraph' | 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ') });
    paragraphBuffer = [];
  };

  const flushUl = () => {
    if (ulBuffer.length === 0) return;
    blocks.push({ type: 'ul', items: ulBuffer });
    ulBuffer = [];
  };

  const flushOl = () => {
    if (olBuffer.length === 0) return;
    blocks.push({ type: 'ol', items: olBuffer });
    olBuffer = [];
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      flushUl();
      flushOl();
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

interface TermsDetailLayoutProps {
  title: string;
  text: string;
}

export default function TermsDetailLayout({ title, text }: TermsDetailLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full justify-center bg-neutral-3">
      <div className="flex h-screen w-full max-w-[375px] flex-col overflow-hidden bg-neutral-3">
        <NavBar variant="title-back" title={title} />

        <div className="flex-1 min-h-0 rounded-t-[12px] bg-white px-4 pb-5 pt-5">
          <div className="h-full min-h-0 overflow-y-auto pr-1">
            <div className="space-y-3 break-keep text-neutral-8">
              {parseBodyBlocks(text).map((block, blockIndex) => {
                if (block.type === 'chapter') {
                  return (
                    <h2
                      key={`chapter-${blockIndex}`}
                      className="typo-heading-small pt-2 text-[19px] leading-[1.55] tracking-[-0.38px] text-neutral-10"
                    >
                      {block.text}
                    </h2>
                  );
                }

                if (block.type === 'article') {
                  return (
                    <h3
                      key={`article-${blockIndex}`}
                      className="typo-heading-xxsmall pt-2 text-[15px] leading-[1.5] text-neutral-10"
                    >
                      {block.text}
                    </h3>
                  );
                }

                if (block.type === 'paragraph') {
                  return (
                    <p key={`p-${blockIndex}`} className="typo-body-xsmall leading-[1.6] tracking-[-0.26px] text-neutral-8">
                      {block.text}
                    </p>
                  );
                }

                if (block.type === 'ul') {
                  return (
                    <ul
                      key={`ul-${blockIndex}`}
                      className="typo-body-xsmall list-disc space-y-1.5 pl-5 leading-[1.6] tracking-[-0.26px]"
                    >
                      {block.items.map((item, itemIndex) => (
                        <li key={`ul-${blockIndex}-${itemIndex}`}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <ol
                    key={`ol-${blockIndex}`}
                    className="typo-body-xsmall list-decimal space-y-2 pl-5 leading-[1.6] tracking-[-0.26px]"
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={`ol-${blockIndex}-${itemIndex}`}>
                        <p>{item.text}</p>
                        {item.bullets.length > 0 ? (
                          <ul className="list-disc space-y-1.5 pl-5 pt-1">
                            {item.bullets.map((bullet, bulletIndex) => (
                              <li key={`ol-${blockIndex}-${itemIndex}-b-${bulletIndex}`}>{bullet}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white px-4 pb-[50px] pt-[17px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="typo-body-small-bold h-[55px] w-full rounded-lg bg-orange-5 text-neutral-2"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
