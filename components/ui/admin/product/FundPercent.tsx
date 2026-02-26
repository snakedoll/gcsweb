import { cn } from '@/lib/utils';

export type FundPercentVariant = '미달성' | '달성';

interface FundPercentProps {
  className?: string;
  variant?: FundPercentVariant;
  percentText?: string;
}

export default function FundPercent({
  className,
  variant = '미달성',
  percentText,
}: FundPercentProps) {
  const achieved = variant === '달성';
  const label = achieved ? '달성' : '미달성';
  const value = percentText ?? (achieved ? '100%' : '70%');

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex h-[17px] w-[39px] items-center justify-center rounded px-[5px] text-center text-[11px] leading-[1.5]',
          achieved ? 'bg-[#FEF0E9] text-orange-5' : 'bg-neutral-5 text-neutral-9'
        )}
      >
        {label}
      </span>
      <span className="typo-body-xsmall text-neutral-8">{value}</span>
    </div>
  );
}
