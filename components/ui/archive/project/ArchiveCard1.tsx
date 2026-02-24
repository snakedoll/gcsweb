import { cn } from '@/lib/utils';
import ArchiveCardName from './ArchiveCardName';

interface ArchiveCard1Props {
  className?: string;
  title?: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
  onPrevClick?: () => void;
  onNextClick?: () => void;
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right';
  onClick?: () => void;
}) {
  const isLeft = direction === 'left';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? '\uC774\uC804 \uCE74\uB4DC' : '\uB2E4\uC74C \uCE74\uB4DC'}
      className="flex h-6 w-6 items-center justify-center text-orange-4 transition hover:text-orange-5 disabled:opacity-40"
    >
      <svg
        viewBox="0 0 24 24"
        className={cn('h-5 w-5', !isLeft && 'rotate-180')}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M14.5 6.5L9 12l5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function ArchiveCard1({
  className,
  title = '\uC18C\uC7A5 \uC774\uC0C1\uC758 \uD65C\uC6A9 \uAC00\uCE58\uB97C \uB9CC\uB4E4\uB2E4',
  subtitle = '\uC720\uB791',
  imageSrc,
  imageAlt,
  onPrevClick,
  onNextClick,
}: ArchiveCard1Props) {
  return (
    <div className={cn('flex items-center justify-between bg-white px-4 py-7', className)}>
      <ArrowButton direction="left" onClick={onPrevClick} />

      <div className="flex w-[269px] flex-col items-start gap-4">
        <div className="relative aspect-[1080/1350] w-full overflow-hidden rounded-lg shadow-[0_0_5px_rgba(0,0,0,0.2)]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt ?? `${title} \uD3EC\uC2A4\uD130`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#F1EEE9]" />
          )}
        </div>

        <div className="w-full space-y-3">
          <div className="h-px w-full bg-neutral-5" />
          <ArchiveCardName title={title} subtitle={subtitle} className="w-full" />
        </div>
      </div>

      <ArrowButton direction="right" onClick={onNextClick} />
    </div>
  );
}
