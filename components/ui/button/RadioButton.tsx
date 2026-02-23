interface RadioButtonProps {
  checked: boolean;
  onChange?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Figma 5118-14157: 20px circle, 2px border, 10px inner dot when checked */
  name?: string;
  value?: string | number;
}

export default function RadioButton({
  checked,
  onChange,
  label = '옵션',
  disabled = false,
  className,
  name,
  value,
}: RadioButtonProps) {
  const labelColor = disabled ? 'text-neutral-7' : checked ? 'text-neutral-10' : 'text-neutral-7';

  return (
    <label
      className={[
        'inline-flex min-h-[44px] items-center gap-3',
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <span
        className={[
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-orange-5' : 'border-neutral-5',
          disabled && 'border-neutral-5',
        ].join(' ')}
        aria-hidden="true"
      >
        {checked ? (
          <span
            className={[
              'h-2.5 w-2.5 rounded-full',
              disabled ? 'bg-neutral-6' : 'bg-orange-5',
            ].join(' ')}
          />
        ) : null}
      </span>
      {label ? <span className={['typo-body-small', labelColor].join(' ')}>{label}</span> : null}
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.()}
        name={name}
        value={value}
        className="sr-only"
        aria-hidden="true"
      />
    </label>
  );
}

