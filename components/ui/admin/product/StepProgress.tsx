import { cn } from '@/lib/utils';

export type StepProgressStatus = 'current' | 'upcoming' | 'complete' | 'skipped';

interface StepProgressProps {
  className?: string;
  status?: StepProgressStatus;
}

function CheckIcon() {
  return (
    <svg width="8" height="7" viewBox="0 0 8 7" fill="none" aria-hidden>
      <path d="M1 3.5L3 5.5L7 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
      <path d="M2 2L6 6M6 2L2 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function StepProgress({ className, status = 'current' }: StepProgressProps) {
  const isComplete = status === 'complete';
  const isSkipped = status === 'skipped';
  const isUpcoming = status === 'upcoming';

  return (
    <div className={cn('relative h-[17px] w-[17px]', className)} aria-hidden>
      <div
        className={cn(
          'absolute inset-0 rounded-[2px]',
          isComplete && 'bg-orange-5',
          isUpcoming && 'bg-[#D9D9D9]',
          isSkipped && 'bg-[#D9D9D9]',
          status === 'current' && 'border border-orange-5 bg-orange-2'
        )}
      />

      {isComplete ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckIcon />
        </div>
      ) : null}

      {isSkipped ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <CloseIcon />
        </div>
      ) : null}
    </div>
  );
}
