interface ToggleSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
      className={[
        'relative h-5 w-[35px] rounded-full transition-colors',
        checked ? 'bg-orange-5' : 'bg-neutral-6',
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
        className ?? '',
      ].join(' ').trim()}
    >
      <span
        className={[
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
          checked ? 'left-[17px]' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  );
}

