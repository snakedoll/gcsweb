import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import ArchiveCardName from './ArchiveCardName';
import DashboardHeaderTitle from './DashboardHeaderTitle';

interface ArchiveCard2Props {
  className?: string;
  title?: string;
  subtitle?: string;
  year?: number | string;
  category?: string;
  imageSrc?: string;
  imageAlt?: string;
  selected?: boolean;
  onShareClick?: () => void;
  onBookmarkClick?: () => void;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center text-neutral-7 transition hover:text-neutral-9"
    >
      {children}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 4v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M8.75 7.25L12 4l3.25 3.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.5V18a1 1 0 001 1h9a1 1 0 001-1v-7.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M8 4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V20l-4-2.6L8 20V4.75Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M8 4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V20l-4-2.6L8 20V4.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ArchiveCard2({
  className,
  title = '\uC18C\uC7A5 \uC774\uC0C1\uC758 \uD65C\uC6A9 \uAC00\uCE58\uB97C \uB9CC\uB4E4\uB2E4',
  subtitle = '\uC720\uB791',
  year = 2025,
  category = '\uACF5\uBAA8\uC804',
  imageSrc,
  imageAlt,
  selected = false,
  onShareClick,
  onBookmarkClick,
}: ArchiveCard2Props) {
  return (
    <article className={cn('w-[343px] rounded-[13px] bg-white px-[21px] py-5', className)}>
      <div className="space-y-[11px]">
        <div className="relative h-[375px] w-[300px] overflow-hidden rounded-lg shadow-[0_0_5px_rgba(0,0,0,0.2)]">
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

        <ArchiveCardName title={title} subtitle={subtitle} />

        <div className="space-y-[9px]">
          <div className="h-px w-full bg-neutral-5" />
          <div className="flex items-center justify-between">
            <DashboardHeaderTitle year={year} category={category} />
            <div className="flex items-center gap-[6px]">
              <IconButton label="\uACF5\uC720" onClick={onShareClick}>
                <ShareIcon />
              </IconButton>
              <IconButton
                label={selected ? '\uBD81\uB9C8\uD06C \uD574\uC81C' : '\uBD81\uB9C8\uD06C'}
                onClick={onBookmarkClick}
              >
                <BookmarkIcon selected={selected} />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
