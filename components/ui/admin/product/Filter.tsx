import { cn } from '@/lib/utils';

interface FilterProps {
  className?: string;
  label?: string;
  selected?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export default function Filter({
  className,
  label = 'text',
  selected = false,
  onClick,
  type = 'button',
  disabled = false,
}: FilterProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-[22px] items-center justify-center rounded px-[11px] typo-body-xsmall transition-colors',
        selected ? 'bg-orange-5 text-neutral-1' : 'border border-neutral-5 bg-[#F1F1F1] text-neutral-7',
        disabled && 'cursor-not-allowed opacity-60',
        !disabled && onClick && 'cursor-pointer',
        className
      )}
    >
      {label}
    </button>
  );
}
