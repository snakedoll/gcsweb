import { cn } from '@/lib/utils';

type RadiocardgroupVariant = 'Default' | 'filled';

interface RadiocardgroupProps {
  className?: string;
  property1?: RadiocardgroupVariant;
  options?: string[];
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}

function RadioIcon({ checked }: { checked: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="8.5" stroke={checked ? 'var(--color-orange-5)' : 'var(--color-neutral-7)'} />
      {checked ? <circle cx="10" cy="10" r="4" fill="var(--color-orange-5)" /> : null}
    </svg>
  );
}

function RadioRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn('flex h-7 items-center gap-2 text-left', onClick && 'cursor-pointer')}
    >
      <RadioIcon checked={checked} />
      <span className={cn('typo-body-xsmall', checked ? 'text-neutral-10' : 'text-neutral-7')}>{label}</span>
    </button>
  );
}

export default function Radiocardgroup({
  className,
  property1 = 'Default',
  options = ['옵션', '옵션', '옵션'],
  selectedIndex,
  onSelect,
}: RadiocardgroupProps) {
  const resolvedSelectedIndex = selectedIndex ?? (property1 === 'filled' ? 1 : null);

  return (
    <div
      className={cn(
        'w-[343px] rounded-lg border bg-neutral-2 p-3',
        property1 === 'filled' ? 'border-neutral-5' : 'border-neutral-4',
        className
      )}
    >
      <div className="flex w-[317px] flex-col gap-[9px]">
        {options.map((option, index) => (
          <RadioRow
            key={`${option}-${index}`}
            label={option}
            checked={resolvedSelectedIndex === index}
            onClick={onSelect ? () => onSelect(index) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
