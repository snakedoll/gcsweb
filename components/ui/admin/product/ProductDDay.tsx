import { cn } from '@/lib/utils';

export type ProductDDayColor = 'Gray' | 'Orange';

interface ProductDDayProps {
  className?: string;
  color?: ProductDDayColor;
  text?: string;
}

export default function ProductDDay({ className, color = 'Gray', text = 'D-5' }: ProductDDayProps) {
  const isOrange = color === 'Orange';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-[4px] px-[5px]',
        isOrange ? 'bg-orange-4' : 'bg-neutral-5',
        className
      )}
    >
      <span className={cn('typo-body-xsmall text-center tracking-[-0.26px]', isOrange ? 'text-neutral-1' : 'text-neutral-9')}>
        {text}
      </span>
    </div>
  );
}
