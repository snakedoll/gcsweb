import { cn } from '@/lib/utils';

export type FilterVariant = 'dropdown' | 'option' | 'delete';
export type FilterStatus = 'unselected' | 'selected' | 'selected-tag';

interface FilterProps {
  className?: string;
  contents?: string;
  status?: FilterStatus;
  variant?: FilterVariant;
  tags?: string[];
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

function ChevronIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden className="shrink-0">
      <path
        d="M5 6.25L7.5 8.75L10 6.25"
        stroke={active ? 'var(--color-neutral-10)' : 'var(--color-neutral-6)'}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <path
        d="M5 5L11 11M11 5L5 11"
        stroke="var(--color-neutral-10)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InlineTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-neutral-4 px-2 py-0.5 typo-body-xsmall text-neutral-10">
      {label}
    </span>
  );
}

export default function Filter({
  className,
  contents = '전체',
  status = 'unselected',
  variant = 'dropdown',
  tags = ['태그 1', '태그 2'],
  onClick,
  disabled = false,
  type = 'button',
}: FilterProps) {
  const isDropdown = variant === 'dropdown';
  const isOption = variant === 'option';
  const isDelete = variant === 'delete';
  const isSelected = status === 'selected';
  const isSelectedTag = status === 'selected-tag';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 typo-body-xsmall transition-colors',
        isDropdown && 'h-10 gap-1.5 py-2',
        (isOption || isDelete) && 'gap-1 py-1',
        isDropdown && !isSelected && !isSelectedTag && 'border-neutral-5 bg-neutral-2 text-neutral-6',
        isDropdown && isSelected && 'border-orange-5 bg-neutral-2 text-neutral-10',
        isDropdown && isSelectedTag && 'border-orange-5 bg-neutral-2 text-neutral-10',
        isOption && !isSelected && 'border-neutral-5 bg-neutral-2 text-neutral-10',
        isOption && isSelected && 'border-orange-5 bg-orange-1 text-orange-5',
        isDelete && 'border-neutral-4 bg-neutral-4 text-neutral-10',
        disabled && 'cursor-not-allowed opacity-60',
        !disabled && onClick && 'cursor-pointer',
        className
      )}
    >
      {isDropdown && isSelectedTag ? (
        <>
          {tags.map((tag) => (
            <InlineTag key={tag} label={tag} />
          ))}
          <ChevronIcon active />
        </>
      ) : (
        <>
          <span>{contents}</span>
          {isDropdown ? <ChevronIcon active={isSelected} /> : null}
          {isDelete ? <CloseIcon /> : null}
        </>
      )}
    </button>
  );
}

