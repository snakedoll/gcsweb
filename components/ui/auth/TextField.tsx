import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/styles/typography';

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
      ? cn('block', typography.bodySmallBold, 'text-danger')
      : cn('block', typography.bodySmallBold, 'text-neutral-10');

  const inputClassNameByState: Record<TextFieldState, string> = {
    default:
      cn(
        'h-[45px] w-full rounded-lg border border-neutral-4 bg-neutral-2 px-3 text-neutral-7 outline-none placeholder:text-neutral-7',
        typography.bodyXSmall
      ),
    focus:
      cn(
        'h-[45px] w-full rounded-lg border border-orange-5 bg-neutral-2 px-3 text-neutral-7 outline-none placeholder:text-neutral-7',
        typography.bodyXSmall
      ),
    filled:
      cn(
        'h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-2 px-3 text-neutral-12 outline-none placeholder:text-neutral-7',
        typography.bodyXSmall
      ),
    warning:
      cn(
        'h-[45px] w-full rounded-lg border border-danger bg-neutral-2 px-3 text-neutral-10 outline-none placeholder:text-neutral-7',
        typography.bodyXSmall
      ),
    blocked:
      cn(
        'h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-3 px-3 text-neutral-7 outline-none placeholder:text-neutral-7',
        typography.bodyXSmall
      ),
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
        <p className={cn(typography.bodyXSmall, captionClassName ?? 'text-neutral-7')}>{caption}</p>
      ) : null}
    </div>
  );
}
