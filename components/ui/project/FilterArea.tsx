import { cn } from '@/lib/utils';
import Filter from './Filter';

interface FilterAreaProps {
  className?: string;
  isFilterOpen?: boolean;
  sortValue?: string;
  visibilityValue?: string;
  years?: string[];
  selectedYears?: string[];
  categories?: string[];
  selectedCategories?: string[];
  selectedChips?: string[];
  onToggleFilter?: () => void;
  onReset?: () => void;
  onRemoveChip?: (value: string) => void;
}

function FilterIcon({ active }: { active: boolean }) {
  const stroke = active ? 'var(--color-orange-5)' : 'var(--color-neutral-7)';

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M1.2 2.2H6.7M1.2 7.8H3.6M6.4 7.8H8.8M3.3 2.2H8.8"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="4.9" cy="2.2" r="1" stroke={stroke} strokeWidth="1" fill="white" />
      <circle cx="5.1" cy="7.8" r="1" stroke={stroke} strokeWidth="1" fill="white" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden className="shrink-0">
      <path
        d="M5 6.25L7.5 8.75L10 6.25"
        stroke="var(--color-neutral-6)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M19 12A7 7 0 1 1 12 5"
        stroke="var(--color-neutral-10)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 2.8V6.2H15.4"
        stroke="var(--color-neutral-10)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FieldSelect({
  placeholder,
  value,
  className,
}: {
  placeholder: string;
  value?: string;
  className?: string;
}) {
  const isSelected = Boolean(value);

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 w-[110px] items-center justify-between rounded border border-neutral-5 bg-neutral-2 px-3 py-2',
        className
      )}
    >
      <span className={cn('typo-body-xsmall', isSelected ? 'text-neutral-10' : 'text-neutral-7')}>{value ?? placeholder}</span>
      <ChevronIcon />
    </button>
  );
}

function FilterToggleButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1 rounded border px-3 py-2 typo-body-xsmall',
        active ? 'border-orange-5 bg-orange-1 text-orange-5' : 'border-neutral-6 bg-neutral-2 text-neutral-7'
      )}
    >
      <span>필터</span>
      <FilterIcon active={active} />
    </button>
  );
}

function OptionRow({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 typo-body-xsmall text-black">{label}</span>
      <div className="flex flex-wrap items-center gap-1">
        {options.map((option) => (
          <Filter
            key={`${label}-${option}`}
            variant="option"
            status={selected.has(option) ? 'selected' : 'unselected'}
            contents={option}
          />
        ))}
      </div>
    </div>
  );
}

export default function FilterArea({
  className,
  isFilterOpen = true,
  sortValue,
  visibilityValue,
  years = ['2026', '2025', '2024', '...'],
  selectedYears = ['2026'],
  categories = ['1', '2', '3', '...'],
  selectedCategories = ['3'],
  selectedChips,
  onToggleFilter,
  onReset,
  onRemoveChip,
}: FilterAreaProps) {
  const selectedYearSet = new Set(selectedYears);
  const selectedCategorySet = new Set(selectedCategories);
  const chips = selectedChips ?? [...selectedYears, ...selectedCategories];

  return (
    <div className={cn('flex w-[325px] flex-col items-start', className)}>
      <div className="flex items-start gap-3">
        <FilterToggleButton active={isFilterOpen} onClick={onToggleFilter} />
        <FieldSelect placeholder="정렬" value={sortValue} />
        <FieldSelect placeholder="공개 설정" value={visibilityValue} />
      </div>

      {isFilterOpen ? (
        <div className="mt-5 w-full rounded-lg bg-neutral-2 p-4">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <OptionRow label="연도" options={years} selected={selectedYearSet} />
              <OptionRow label="카테고리" options={categories} selected={selectedCategorySet} />
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={onReset} className="inline-flex items-center justify-center">
                <ResetIcon />
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <Filter
                    key={`chip-${chip}`}
                    variant="delete"
                    contents={chip}
                    onClick={onRemoveChip ? () => onRemoveChip(chip) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

