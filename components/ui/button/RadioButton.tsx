interface RadioButtonProps {
  checked?: boolean;
  onChange?: () => void;
  label?: string;
  disabled?: boolean;
  status?: 'checked' | 'unchecked' | 'disabled';
  className?: string;
  name?: string;
  value?: string | number;
}

export default function RadioButton({
  checked,
  onChange,
  label = '옵션',
  disabled = false,
  status,
  className,
  name,
  value,
}: RadioButtonProps) {
  // Backward-compatible inference for existing call-sites.
  const resolvedStatus: 'checked' | 'unchecked' | 'disabled' =
    status ?? (disabled ? 'disabled' : checked ? 'checked' : 'unchecked');
  const isChecked = resolvedStatus === 'checked';
  const isDisabled = resolvedStatus === 'disabled';

  const labelColor = isChecked ? 'text-neutral-10' : 'text-neutral-7';

  return (
    <label
      className={[
        'inline-flex h-7 items-center gap-2',
        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <span
        className={[
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          isChecked ? 'border-orange-5' : isDisabled ? 'border-transparent' : 'border-neutral-7',
        ].join(' ')}
        aria-hidden="true"
      >
        {isDisabled ? <span className="h-2.5 w-2.5 rounded-full bg-neutral-6" /> : null}
        {!isDisabled && isChecked ? <span className="h-2.5 w-2.5 rounded-full bg-orange-5" /> : null}
      </span>
      {label ? <span className={['typo-body-xsmall', labelColor].join(' ')}>{label}</span> : null}
      <input
        type="radio"
        checked={isChecked}
        disabled={isDisabled}
        onChange={() => onChange?.()}
        name={name}
        value={value}
        className="sr-only"
        aria-hidden="true"
      />
    </label>
  );
}
