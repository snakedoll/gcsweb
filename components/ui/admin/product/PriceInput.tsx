import { cn } from '@/lib/utils';

export type PriceInputVariant = 'Default' | 'focus' | 'filled' | 'error';

interface PriceInputProps {
  className?: string;
  property1?: PriceInputVariant;
  value?: string;
  suffix?: string;
}

export default function PriceInput({
  className,
  property1 = 'Default',
  value,
  suffix = '원',
}: PriceInputProps) {
  const isFocus = property1 === 'focus';
  const isFilled = property1 === 'filled';
  const isError = property1 === 'error';

  const displayValue =
    value ?? (isFilled || isError ? '19,800' : isFocus ? '19,80' : '0');

  return (
    <div
      className={cn(
        'flex h-10 w-[163px] items-center rounded-lg border bg-neutral-2 px-[13px] py-[10px]',
        isError ? 'border-danger' : isFilled ? 'border-neutral-6' : isFocus ? 'border-orange-5' : 'border-neutral-4',
        className
      )}
    >
      <div className={cn('flex h-5 w-[137px] items-center border-b', isFocus || isFilled || isError ? 'border-neutral-5' : 'border-neutral-4')}>
        <span className={cn('flex-1 typo-body-xsmall', isFilled || isError ? 'text-black' : isFocus ? 'text-black' : 'text-neutral-7')}>
          {displayValue}
        </span>
        <span className="typo-body-xsmall text-neutral-7">{suffix}</span>
      </div>
    </div>
  );
}
