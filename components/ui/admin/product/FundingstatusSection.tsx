import { cn } from '@/lib/utils';
import FundPercent from './FundPercent';

export type FundingstatusSectionVariant = '미달성' | '달성' | 'admin' | 'admin_달성' | 'shop';

interface FundingstatusSectionProps {
  className?: string;
  variant?: FundingstatusSectionVariant;
  currentAmount?: string;
  targetAmount?: string;
  progressPercent?: number;
  hideSummaryRow?: boolean;
}

export default function FundingstatusSection({
  className,
  variant = '미달성',
  currentAmount,
  targetAmount = '570,000원',
  progressPercent,
  hideSummaryRow = false,
}: FundingstatusSectionProps) {
  const isAchievedByVariant = variant === '달성' || variant === 'admin_달성';
  const isAdmin = variant === 'admin' || variant === 'admin_달성';
  const isShop = variant === 'shop';

  const resolvedCurrentAmount =
    currentAmount ?? (variant === 'admin' ? '370,000원' : '570,000원');

  const resolvedProgress =
    progressPercent ?? (variant === '미달성' || variant === 'admin' ? 70 : 100);
  const isAchieved = isAchievedByVariant || (isShop && resolvedProgress >= 100);

  return (
    <div
      className={cn(
        'flex w-[307px] flex-col',
        isAdmin ? 'gap-[5px]' : isShop ? 'gap-0' : 'gap-2.5',
        className
      )}
    >
      {!isShop && !hideSummaryRow ? (
        <div className={cn('flex w-full items-center', isAdmin ? 'justify-end' : 'justify-between')}>
          {!isAdmin ? (
            <>
              <FundPercent variant={isAchieved ? '달성' : '미달성'} percentText={`${Math.round(resolvedProgress)}%`} />
              <p className="typo-body-xsmall text-neutral-8">{resolvedCurrentAmount}</p>
            </>
          ) : (
            <p className="typo-body-xsmall text-neutral-8">
              달성 금액 : <span className="text-orange-5">{resolvedCurrentAmount}</span> / {targetAmount}
            </p>
          )}
        </div>
      ) : null}

      <div className="h-[7px] w-full rounded-[3.5px] border border-neutral-5 bg-[#F8F6F4]">
        <div
          className={cn('h-[7px] rounded-[3.5px]', isAchieved ? 'bg-orange-5' : 'bg-[#EFDDC9]')}
          style={{ width: `${Math.max(0, Math.min(100, resolvedProgress))}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
