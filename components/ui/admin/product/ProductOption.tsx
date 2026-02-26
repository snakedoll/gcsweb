import { cn } from '@/lib/utils';
import OptionName from './OptionName';
import OptionVariation, { type OptionVariationVariant } from './OptionVariation';

export type ProductOptionVariant = 'Default' | 'Variant2';

interface ProductOptionItem {
  id: string;
  optionLabel?: string;
  extraPrice?: string;
  variant?: OptionVariationVariant;
}

interface ProductOptionProps {
  className?: string;
  property1?: ProductOptionVariant;
  title?: string;
  optionNameVariant?: 'Default' | 'filled' | 'focus' | 'error';
  items?: ProductOptionItem[];
  onRemoveOption?: () => void;
  onAddVariation?: () => void;
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 5L15 15M15 5L5 15" stroke="var(--color-neutral-7)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="6" fill="#A9A6A3" />
      <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductOption({
  className,
  property1 = 'Default',
  title = '옵션 1',
  optionNameVariant = 'Default',
  items,
  onRemoveOption,
  onAddVariation,
}: ProductOptionProps) {
  const isVariant2 = property1 === 'Variant2';
  const fallbackItems: ProductOptionItem[] = isVariant2
    ? [
        { id: '1', variant: 'Default' },
        { id: '2', variant: 'Default' },
        { id: '3', variant: 'Default' },
      ]
    : [{ id: '1', variant: 'Default' }];

  const resolvedItems = items ?? fallbackItems;

  return (
    <div
      className={cn(
        'flex w-[343px] flex-col items-center justify-center rounded-lg bg-neutral-1 px-[15px]',
        isVariant2 ? 'py-[11px]' : 'py-[10px]',
        className
      )}
    >
      <div className="flex w-full flex-col items-center gap-[14px]">
        <div className="flex w-full flex-col gap-[14px]">
          <div className="flex w-full items-center justify-between">
            <p className="typo-heading-xxsmall text-black">{title}</p>
            <button
              type="button"
              onClick={onRemoveOption}
              className={cn('inline-flex h-5 w-5 items-center justify-center', onRemoveOption ? 'cursor-pointer' : 'cursor-default')}
              aria-label="옵션 삭제"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex w-full flex-col gap-3">
            <OptionName property1={optionNameVariant} />
            {resolvedItems.map((item) => (
              <OptionVariation
                key={item.id}
                property1={item.variant ?? 'Default'}
                optionLabel={item.optionLabel}
                extraPrice={item.extraPrice}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onAddVariation}
          className={cn('inline-flex h-6 w-6 items-center justify-center', onAddVariation ? 'cursor-pointer' : 'cursor-default')}
          aria-label="옵션값 추가"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}
