import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export type OptionNameVariant = 'Default' | 'filled' | 'focus' | 'error';

interface OptionNameProps {
  className?: string;
  variant?: OptionNameVariant;
  property1?: OptionNameVariant;
  label?: string;
  value?: string;
  placeholder?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
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

export default function OptionName({
  className,
  variant,
  property1,
  label = '옵션명',
  value,
  placeholder = '예) 프린팅',
  inputProps,
}: OptionNameProps) {
  const resolvedVariant = variant ?? property1 ?? 'Default';
  const isFilled = resolvedVariant === 'filled';
  const isFocus = resolvedVariant === 'focus';
  const isError = resolvedVariant === 'error';

  return (
    <div className={cn('flex w-[313px] flex-col gap-1', className)}>
      <p className="typo-body-xsmall text-neutral-9">{label}</p>
      <div
        className={cn(
          'flex h-10 items-center overflow-hidden rounded-lg border bg-neutral-2 px-3 py-2',
          isError ? 'border-danger' : isFocus ? 'border-orange-5' : isFilled ? 'border-neutral-6' : 'border-neutral-5'
        )}
      >
        {inputProps ? (
          <input
            {...inputProps}
            value={value ?? ''}
            placeholder={placeholder}
            className={cn(
              'flex-1 bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
              isFilled || isFocus || isError ? 'text-neutral-12' : 'text-neutral-7'
            )}
          />
        ) : (
          <span className={cn('flex-1 typo-body-xsmall', isFilled || isFocus || isError ? 'text-neutral-12' : 'text-neutral-7')}>
            {value || placeholder}
          </span>
        )}
        {isError ? <DangerIcon /> : null}
      </div>
    </div>
  );
}
