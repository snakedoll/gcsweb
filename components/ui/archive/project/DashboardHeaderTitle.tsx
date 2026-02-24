import { cn } from '@/lib/utils';

interface DashboardHeaderTitleProps {
  className?: string;
  year: number | string;
  category: string;
}

export default function DashboardHeaderTitle({
  className,
  year,
  category,
}: DashboardHeaderTitleProps) {
  return (
    <div className={cn('flex items-center gap-[7px]', className)} data-name="dashboard_headertitle">
      <span className="shrink-0 text-center text-[15px] leading-[1.5] text-neutral-8">{year}</span>
      <span aria-hidden className="shrink-0 h-[11.5px] w-px bg-neutral-8" />
      <span className="shrink-0 text-center text-[15px] leading-[1.5] text-neutral-8">{category}</span>
    </div>
  );
}
