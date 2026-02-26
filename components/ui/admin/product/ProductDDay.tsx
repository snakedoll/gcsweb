import { cn } from '@/lib/utils';

type ProductDDayVariant = 'Default' | 'Variant2';

interface ProductDDayProps {
  className?: string;
  property1?: ProductDDayVariant;
  text?: string;
}

export default function ProductDDay({ className, property1 = 'Default', text = 'D-5' }: ProductDDayProps) {
  const highlighted = property1 === 'Variant2';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded px-[5px]',
        highlighted ? 'bg-orange-3' : 'bg-neutral-5',
        className
      )}
    >
      <span className={cn('typo-body-xsmall text-center', highlighted ? 'text-neutral-1' : 'text-neutral-9')}>{text}</span>
    </div>
  );
}
