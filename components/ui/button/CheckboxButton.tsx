interface CheckboxButtonProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function CheckboxButton({
  checked,
  onChange,
  label = '옵션',
  disabled = false,
  className,
}: CheckboxButtonProps) {
  const labelColor = disabled ? 'text-neutral-7' : checked ? 'text-neutral-10' : 'text-neutral-7';

  return (
    <label className={['inline-flex h-7 items-center gap-2', disabled ? 'cursor-default' : 'cursor-pointer', className ?? ''].join(' ').trim()}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only"
      />
      <span
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-[5px] border',
          checked ? 'border-orange-5 bg-orange-5' : 'border-neutral-6 bg-transparent',
        ].join(' ')}
        aria-hidden="true"
      >
        {checked ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L3.6 7L9 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label ? <span className={['typo-body-xsmall', labelColor].join(' ')}>{label}</span> : null}
    </label>
  );
}

