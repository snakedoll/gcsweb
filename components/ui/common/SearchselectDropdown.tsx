import { cn } from '@/lib/utils';

type SearchselectDropdownVariant = 'Default' | 'searching' | 'empty' | '노션 그거^^';

interface SearchselectDropdownProps {
  className?: string;
  variant?: SearchselectDropdownVariant;
  placeholder?: string;
  query?: string;
  items?: string[];
  emptyText?: string;
  selectedTags?: string[];
  onItemClick?: (item: string) => void;
  onTagRemove?: (tag: string) => void;
}

interface ListItemProps {
  label: string;
  onClick?: () => void;
}

function ListItem({ label, onClick }: ListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center bg-neutral-2 px-3 py-2 text-left typo-body-small text-neutral-10',
        onClick && 'cursor-pointer'
      )}
    >
      {label}
    </button>
  );
}

function InlineTag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-4 px-2 py-0.5 typo-body-xsmall text-neutral-10">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 제거`}
        className="inline-flex h-3 w-3 items-center justify-center rounded-full text-neutral-7 hover:text-neutral-10"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path d="M2 2L6 6M6 2L2 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

export default function SearchselectDropdown({
  className,
  variant = 'Default',
  placeholder = '팀 검색',
  query = '염사',
  items = ['팀 이름', '팀 이름', '팀 이름', '팀 이름', '팀 이름'],
  emptyText = '검색된 팀이 없습니다.',
  selectedTags = ['2025', '2026'],
  onItemClick,
  onTagRemove,
}: SearchselectDropdownProps) {
  const isDefault = variant === 'Default';
  const isSearching = variant === 'searching';
  const isEmpty = variant === 'empty';
  const isTagVariant = variant === '노션 그거^^';

  const topText = isEmpty ? '염소 후' : isSearching ? query : placeholder;
  const topTextColor = isSearching || isEmpty ? 'text-neutral-12' : 'text-neutral-7';
  const visibleItems = isTagVariant ? ['2022', '2023', '2024'] : isSearching ? ['팀 이름'] : items;

  return (
    <div className={cn('flex w-[343px] flex-col shadow-[0_0_4px_rgba(0,0,0,0.3)]', className)}>
      <div className="flex min-h-10 items-center gap-2 rounded-t-lg bg-neutral-5 px-3 py-2">
        {isTagVariant ? (
          <>
            {selectedTags.map((tag) => (
              <InlineTag key={tag} label={tag} onRemove={onTagRemove ? () => onTagRemove(tag) : undefined} />
            ))}
          </>
        ) : (
          <span className={cn('w-full typo-body-small', topTextColor)}>{topText}</span>
        )}
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-b-lg bg-neutral-1',
          isDefault && 'max-h-[159px]',
          (isSearching || isEmpty) && 'max-h-10'
        )}
      >
        {isEmpty ? (
          <div className="flex h-10 items-center px-3">
            <span className="w-full typo-body-small text-neutral-7">{emptyText}</span>
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col overflow-y-auto',
              isDefault && 'max-h-[159px]',
              (isSearching || isEmpty) && 'max-h-10'
            )}
          >
            {visibleItems.map((item, index) => (
              <ListItem
                key={`${variant}-${item}-${index}`}
                label={item}
                onClick={onItemClick ? () => onItemClick(item) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
