import { cn } from '@/lib/utils';

type DDayVariant = 'Default' | 'Variant2';

interface DDayProps {
  className?: string;
  property1?: DDayVariant;
  label?: string;
}

export default function DDay({
  className,
  property1 = 'Default',
  label = 'D-5',
}: DDayProps) {
  const isAccent = property1 === 'Variant2';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded px-[5px] typo-body-xsmall',
        isAccent ? 'bg-orange-3 text-white' : 'bg-neutral-5 text-neutral-9',
        className
      )}
    >
      {label}
    </div>
  );
}

