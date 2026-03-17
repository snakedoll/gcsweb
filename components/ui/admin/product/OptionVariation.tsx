import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export type OptionVariationVariant = 'Default' | 'filled' | 'focus' | 'error';

interface OptionVariationProps {
  className?: string;
  property1?: OptionVariationVariant;
  optionLabel?: string;
  extraPrice?: string;
  optionPlaceholder?: string;
  pricePlaceholder?: string;
  optionInputProps?: InputHTMLAttributes<HTMLInputElement>;
  priceInputProps?: InputHTMLAttributes<HTMLInputElement>;
  onRemove?: () => void;
}

function CloseIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
      <path d="M4.5 4.5L12.5 12.5M12.5 4.5L4.5 12.5" stroke="var(--color-neutral-6)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DangerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L19 18H1L10 2Z" fill="var(--color-danger)" />
      <path d="M10 7V11.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="14.3" r="0.9" fill="white" />
    </svg>
  );
}

export default function OptionVariation({
  className,
  property1 = 'Default',
  optionLabel,
  extraPrice,
  optionPlaceholder = '예) BLACK',
  pricePlaceholder = '0',
  optionInputProps,
  priceInputProps,
  onRemove,
}: OptionVariationProps) {
  const isFilled = property1 === 'filled';
  const isFocus = property1 === 'focus';
  const isError = property1 === 'error';

  const leftText = optionLabel ?? '';
  const priceText = extraPrice ?? '';

  return (
    <div className={cn('flex w-[313px] flex-col gap-1', className)}>
      <div className="flex items-center justify-between typo-body-xsmall text-neutral-9">
        <span>옵션값</span>
        <span>추가 금액</span>
      </div>

      <div
        className={cn(
          'flex h-10 items-center rounded-lg border bg-neutral-2 py-2 pl-[10px] pr-[5px]',
          isError ? 'border-danger' : isFocus ? 'border-orange-6' : isFilled ? 'border-neutral-6' : 'border-neutral-5'
        )}
      >
        <div className="flex w-[260px] items-center justify-between">
          {optionInputProps ? (
            <input
              {...optionInputProps}
              value={leftText}
              placeholder={optionPlaceholder}
              className={cn(
                'w-[111px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
                isFilled || isFocus || isError ? 'text-neutral-12' : 'text-neutral-7'
              )}
            />
          ) : (
            <span className={cn('w-[111px] typo-body-xsmall', isFilled || isFocus || isError ? 'text-neutral-12' : 'text-neutral-7')}>
              {leftText || optionPlaceholder}
            </span>
          )}

          <span className="h-5 w-px bg-neutral-5" aria-hidden />

          <span className="flex w-[111px] items-center border-b border-neutral-5 typo-body-xsmall">
            {priceInputProps ? (
              <input
                {...priceInputProps}
                value={priceText}
                placeholder={pricePlaceholder}
                className={cn('w-[101px] bg-transparent outline-none placeholder:text-neutral-7', isFilled || isError ? 'text-neutral-12' : 'text-neutral-7')}
              />
            ) : (
              <span className={cn('w-[101px]', isFilled || isError ? 'text-neutral-12' : 'text-neutral-7')}>{priceText || pricePlaceholder}</span>
            )}
            <span className="w-[10px] text-right text-neutral-7">원</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className={cn('ml-auto inline-flex h-5 w-5 items-center justify-center', onRemove ? 'cursor-pointer' : 'cursor-default')}
          aria-label={isError ? '오류' : '옵션값 제거'}
        >
          {isError ? <DangerIcon /> : <CloseIcon />}
        </button>
      </div>
    </div>
  );
}
