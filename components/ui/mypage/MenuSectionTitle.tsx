import { cn } from '@/lib/utils';

interface MenuSectionTitleProps {
  children: string;
  className?: string;
}

export default function MenuSectionTitle({
  children,
  className,
}: MenuSectionTitleProps) {
  return (
    <p className={cn('w-full whitespace-pre-wrap typo-body-small-bold text-neutral-12', className)}>
      {children}
    </p>
  );
}

