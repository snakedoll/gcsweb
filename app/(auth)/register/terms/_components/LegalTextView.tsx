'use client';

type BodyBlock =
  | { type: 'chapter'; text: string }
  | { type: 'article'; text: string }
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

interface LegalTextViewProps {
  text: string;
}

export default function LegalTextView({ text }: LegalTextViewProps) {
  return (
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
              <ul key={`ul-${blockIndex}`} className="typo-body-xsmall list-disc space-y-1 pl-5 leading-[1.5] tracking-[-0.26px]">
                {block.items.map((item, itemIndex) => (
                  <li key={`ul-${blockIndex}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          }

          return (
            <ol key={`ol-${blockIndex}`} className="typo-body-xsmall list-decimal space-y-2 pl-5 leading-[1.5] tracking-[-0.26px]">
              {block.items.map((item, itemIndex) => (
                <li key={`ol-${blockIndex}-${itemIndex}`}>
                  <p>{item.text}</p>
                  {item.bullets.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 pt-1">
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
  );
}
