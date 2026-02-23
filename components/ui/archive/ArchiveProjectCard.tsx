import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ArchiveProjectCardProps {
  projectId?: string;
  title: string;
  teamName: string;
  thumbnailUrl: string;
  href?: string;
  className?: string;
  imageAlt?: string;
  showNavArrows?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'left' ? '이전 카드' : '다음 카드'}
      className={cn(
        'absolute top-1/2 z-10 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full',
        'text-orange-4'
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={direction === 'right' ? '' : 'rotate-180'}
        aria-hidden
      >
        <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function ArchiveProjectCard({
  projectId,
  title,
  teamName,
  thumbnailUrl,
  href,
  className,
  imageAlt,
  showNavArrows = false,
  onPrev,
  onNext,
}: ArchiveProjectCardProps) {
  const content = (
    <>
      <div className="relative">
        {showNavArrows ? (
          <>
            <div className="-left-9 absolute top-0 h-full w-9">
              <ArrowButton direction="left" onClick={onPrev} />
            </div>
            <div className="-right-9 absolute top-0 h-full w-9">
              <ArrowButton direction="right" onClick={onNext} />
            </div>
          </>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-neutral-5 bg-neutral-2 shadow-[0px_1px_4px_rgba(47,40,36,0.08)]">
          <img
            src={thumbnailUrl}
            alt={imageAlt ?? `${title} 표지`}
            className="h-[248px] w-full object-cover sm:h-[300px]"
            loading="lazy"
          />
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-neutral-5" />

      <div className="mt-3">
        <p className="line-clamp-2 typo-body-medium-bold text-neutral-11">{title}</p>
        <p className="mt-1 typo-body-small text-neutral-7">{teamName}</p>
      </div>

      {projectId ? <span className="sr-only">프로젝트 ID {projectId}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn('block w-full max-w-[270px] text-left', className)}
        aria-label={`${title} 프로젝트 상세 보기`}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn('w-full max-w-[270px]', className)}>{content}</div>;
}

