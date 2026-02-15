interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  checkedLabelClassName?: string;
  uncheckedLabelClassName?: string;
  checkedBoxClassName?: string;
  uncheckedBoxClassName?: string;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  checkedLabelClassName = 'text-[13px] text-neutral-10',
  uncheckedLabelClassName = 'text-[13px] text-neutral-7',
  checkedBoxClassName = 'border-orange-5 bg-orange-5',
  uncheckedBoxClassName = 'border-neutral-7 bg-transparent',
}: CheckboxProps) {
  return (
    <label className="inline-flex h-7 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-[6px] border',
          checked ? checkedBoxClassName : uncheckedBoxClassName,
        ].join(' ')}
      >
        {checked ? (
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M1 4L4.1 7L10 1" stroke="#FDFDFD" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className={checked ? checkedLabelClassName : uncheckedLabelClassName}>{label}</span>
    </label>
  );
}
