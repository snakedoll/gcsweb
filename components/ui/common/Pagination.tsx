import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

function getPageRange(page: number, totalPages: number): number[] {
  const WINDOW = 2;
  const start = Math.max(1, page - WINDOW);
  const end = Math.min(totalPages, page + WINDOW);
  const range: number[] = [];
  for (let i = start; i <= end; i += 1) range.push(i);
  return range;
}

export default function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(page, totalPages);

  return (
    <nav className={cn('flex w-full items-center justify-center gap-1', className)} aria-label="페이지네이션">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
        className="flex size-8 items-center justify-center rounded-lg text-neutral-7 disabled:opacity-40"
      >
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13L1 7L7 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {pages[0] > 1 ? (
        <>
          <button
            type="button"
            onClick={() => onChange(1)}
            className="typo-body-xsmall flex size-8 items-center justify-center rounded-lg text-neutral-8"
          >
            1
          </button>
          {pages[0] > 2 ? <span className="typo-body-xsmall px-1 text-neutral-6">…</span> : null}
        </>
      ) : null}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            'typo-body-xsmall-bold flex size-8 items-center justify-center rounded-lg',
            p === page ? 'bg-[#E9DED2] text-[#2F2824]' : 'text-neutral-8'
          )}
        >
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages ? (
        <>
          {pages[pages.length - 1] < totalPages - 1 ? (
            <span className="typo-body-xsmall px-1 text-neutral-6">…</span>
          ) : null}
          <button
            type="button"
            onClick={() => onChange(totalPages)}
            className="typo-body-xsmall flex size-8 items-center justify-center rounded-lg text-neutral-8"
          >
            {totalPages}
          </button>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
        className="flex size-8 items-center justify-center rounded-lg text-neutral-7 disabled:opacity-40"
      >
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
