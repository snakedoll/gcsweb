interface RadioButtonProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function RadioButton({
  checked,
  onChange,
  label = '옵션',
  disabled = false,
  className,
}: RadioButtonProps) {
  const labelColor = disabled ? 'text-neutral-7' : checked ? 'text-neutral-10' : 'text-neutral-7';

  return (
    <label className={['inline-flex h-7 items-center gap-2', disabled ? 'cursor-default' : 'cursor-pointer', className ?? ''].join(' ').trim()}>
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only"
      />
      <span
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-full border',
          checked ? 'border-orange-5' : 'border-neutral-6',
        ].join(' ')}
        aria-hidden="true"
      >
        {checked ? <span className="h-[10px] w-[10px] rounded-full bg-orange-5" /> : null}
      </span>
      {label ? <span className={['typo-body-xsmall', labelColor].join(' ')}>{label}</span> : null}
    </label>
  );
}

