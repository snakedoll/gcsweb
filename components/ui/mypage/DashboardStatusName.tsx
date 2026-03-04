import { cn } from '@/lib/utils';

interface DashboardStatusNameProps {
  label?: string;
  count?: number;
  className?: string;
}

export default function DashboardStatusName({
  label = '알림',
  count,
  className,
}: DashboardStatusNameProps) {
  const showCount = typeof count === 'number' && count > 0;

  return (
    <p className={cn('flex items-center justify-center gap-[3px] typo-body-xsmall', className)}>
      <span className="text-neutral-9">{label}</span>
      {showCount ? <span className="text-orange-5">{count}</span> : null}
    </p>
  );
}
