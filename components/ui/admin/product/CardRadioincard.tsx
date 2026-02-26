import { cn } from '@/lib/utils';

interface CardRadioincardProps {
  className?: string;
  label?: string;
  status?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  name?: string;
}

function RadioIcon({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
        <circle cx="10" cy="10" r="8.5" stroke="var(--color-orange-5)" />
        <circle cx="10" cy="10" r="4" fill="var(--color-orange-5)" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="8.5" stroke="var(--color-neutral-7)" />
    </svg>
  );
}

export default function CardRadioincard({
  className,
  label = 'Placeholder',
  status = true,
  onClick,
  disabled = false,
  name,
}: CardRadioincardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={status}
      aria-disabled={disabled}
      disabled={disabled}
      name={name}
      onClick={onClick}
      className={cn(
        'flex w-[311px] flex-col items-start rounded px-2 py-1 text-left',
        status && 'bg-orange-1',
        disabled && 'cursor-not-allowed opacity-60',
        !disabled && onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex h-7 max-w-[295px] items-center gap-2">
        <RadioIcon checked={status} />
        <span className={cn('typo-body-xsmall', status ? 'text-neutral-10' : 'text-neutral-7')}>{label}</span>
      </div>
    </button>
  );
}
