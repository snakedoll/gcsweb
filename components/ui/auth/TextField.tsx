import type { InputHTMLAttributes, ReactNode } from 'react';

type TextFieldState = 'default' | 'focus' | 'filled' | 'warning' | 'blocked';

interface TextFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  state: TextFieldState;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  rightSlot?: ReactNode;
  caption?: string;
  captionClassName?: string;
}

export default function TextField({
  id,
  label,
  placeholder,
  type = 'text',
  state,
  inputProps,
  rightSlot,
  caption,
  captionClassName,
}: TextFieldProps) {
  const labelClassName =
    state === 'warning'
      ? 'block text-[15px] font-bold text-[#ce1e1b]'
      : 'block text-[15px] font-bold text-[#3f3835]';

  const inputClassNameByState: Record<TextFieldState, string> = {
    default:
      'h-[45px] w-full rounded-lg border border-[#f1f1f1] bg-[#fdfdfd] px-3 text-[13px] text-[#999694] outline-none placeholder:text-[#999694]',
    focus:
      'h-[45px] w-full rounded-lg border border-[#f6874c] bg-[#fdfdfd] px-3 text-[13px] text-[#999694] outline-none placeholder:text-[#999694]',
    filled:
      'h-[45px] w-full rounded-lg border border-[#c7c5c4] bg-[#fdfdfd] px-3 text-[13px] text-[#2f2824] outline-none placeholder:text-[#999694]',
    warning:
      'h-[45px] w-full rounded-lg border border-[#ce1e1b] bg-[#fdfdfd] px-3 text-[13px] text-[#3f3835] outline-none placeholder:text-[#999694]',
    blocked:
      'h-[45px] w-full rounded-lg border border-[#c7c5c4] bg-[#f6f6f5] px-3 text-[13px] text-[#999694] outline-none placeholder:text-[#999694]',
  };

  const needsRightPadding = Boolean(rightSlot);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          className={[inputClassNameByState[state], needsRightPadding ? 'pr-10' : ''].join(' ')}
          {...inputProps}
        />
        {rightSlot ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : null}
      </div>
      {caption ? (
        <p className={captionClassName ?? 'text-[13px] text-[#999694]'}>{caption}</p>
      ) : null}
    </div>
  );
}
