import { cn } from '@/lib/utils';

interface MenuSectionItemProps {
  children: string;
  className?: string;
}

export default function MenuSectionItem({
  children,
  className,
}: MenuSectionItemProps) {
  return (
    <p className={cn('w-full whitespace-pre-wrap typo-body-xsmall text-neutral-8', className)}>
      {children}
    </p>
  );
}

