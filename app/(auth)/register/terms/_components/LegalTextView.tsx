'use client';

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
    <div className="max-h-[610px] overflow-y-auto pr-1">
      <div className="space-y-4 break-keep typo-body-xsmall leading-[1.85] text-neutral-8">
        {parseBodyBlocks(text).map((block, blockIndex) => {
          if (block.type === 'paragraph') {
            return <p key={`p-${blockIndex}`}>{block.text}</p>;
          }

          if (block.type === 'ul') {
            return (
              <ul key={`ul-${blockIndex}`} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={`ul-${blockIndex}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          }

          return (
            <ol key={`ol-${blockIndex}`} className="list-decimal space-y-2 pl-5">
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
