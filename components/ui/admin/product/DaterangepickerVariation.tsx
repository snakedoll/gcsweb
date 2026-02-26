import { cn } from '@/lib/utils';

export type DaterangepickerVariationVariant = 'Default' | 'filled' | 'focused' | 'error';

interface DaterangepickerVariationProps {
  className?: string;
  property1?: DaterangepickerVariationVariant;
  value?: string;
  placeholder?: string;
}

export default function DaterangepickerVariation({
  className,
  property1 = 'Default',
  value,
  placeholder = 'YYYY-MM-DD',
}: DaterangepickerVariationProps) {
  const isFilled = property1 === 'filled';
  const isFocused = property1 === 'focused';
  const isError = property1 === 'error';

  const displayValue = isFilled ? (value ?? '2025-02-25') : (value ?? placeholder);

  return (
    <div
      className={cn(
        'inline-flex h-10 w-[125px] items-center justify-center rounded-lg border bg-neutral-2 px-[14px] py-2',
        isError
          ? 'border-danger'
          : isFocused
            ? 'border-orange-6'
            : isFilled
              ? 'border-neutral-6'
              : 'border-neutral-4',
        className
      )}
    >
      <span className={cn('typo-body-small text-center', isFilled || isFocused ? 'text-neutral-12' : 'text-neutral-7')}>
        {displayValue}
      </span>
    </div>
  );
}
