interface RememberIdCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function RememberIdCheckbox({ checked, onChange }: RememberIdCheckboxProps) {
  return (
    <label className="inline-flex h-7 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-[6px] border',
          checked ? 'border-[#f6874c] bg-[#f6874c]' : 'border-[#2f2824] bg-transparent',
        ].join(' ')}
      >
        {checked ? (
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M1 4L4.1 7L10 1" stroke="#FDFDFD" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className={checked ? 'text-[13px] text-[#3f3835]' : 'text-[13px] text-[#999694]'}>
        아이디 기억하기
      </span>
    </label>
  );
}
