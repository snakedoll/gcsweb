import { cn } from '@/lib/utils';

interface EmptyviewTextProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function EmptyviewText({
  className,
  title = '제목이 들어갑니다.',
  subtitle = '여기는 서브텍스트가 들어갑니다.',
}: EmptyviewTextProps) {
  return (
    <div className={cn('flex w-[248px] flex-col items-center justify-center gap-1 text-center', className)}>
      <p className="w-full typo-heading-small text-neutral-12">{title}</p>
      <p className="w-full typo-body-small text-neutral-8">{subtitle}</p>
    </div>
  );
}
