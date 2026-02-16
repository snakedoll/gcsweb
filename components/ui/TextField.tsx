import type { InputHTMLAttributes, ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type TextFieldStatus =
  | 'default'
  | 'hovered'
  | 'focus'
  | 'type'
  | 'filled'
  | 'success'
  | 'error'
  | 'disabled'
  | 'time'
  | 'warning'
  | 'blocked';

interface TextFieldProps {
  id: string;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  state?: TextFieldStatus;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  rightSlot?: ReactNode;
  caption?: string;
  captionClassName?: string;
  subtext?: string;
  showStar?: boolean;
  showIcon?: boolean;
  helperText?: string;
  timeText?: string;
}

function normalizeStatus(status: TextFieldStatus): Exclude<TextFieldStatus, 'warning' | 'blocked'> {
  if (status === 'warning') return 'error';
  if (status === 'blocked') return 'disabled';
  return status;
}

export default function TextField({
  id,
  label = 'Label',
  placeholder = 'Placeholder',
  type = 'text',
  state = 'default',
  inputProps,
  rightSlot,
  caption,
  captionClassName,
  subtext,
  showStar = false,
  showIcon = false,
  helperText,
  timeText = '5:00',
}: TextFieldProps) {
  const { className: inputClassName, disabled: inputDisabled, ...restInputProps } = inputProps ?? {};
  const status = normalizeStatus(state);
  const isError = status === 'error';
  const isDisabled = status === 'disabled';
  const isSuccess = status === 'success';
  const isType = status === 'type';
  const isTime = status === 'time';

  const labelClassName = isError ? 'typo-body-small-bold text-danger' : 'typo-body-small-bold text-neutral-10';

  const inputClassNameByStatus: Record<Exclude<TextFieldStatus, 'warning' | 'blocked'>, string> = {
    default:
      'h-[45px] w-full rounded-lg border border-neutral-5 bg-neutral-2 px-3 typo-body-xsmall text-neutral-7 outline-none placeholder:text-neutral-7',
    hovered:
      'h-[45px] w-full rounded-lg border border-neutral-10 bg-neutral-2 px-3 typo-body-xsmall text-neutral-7 outline-none placeholder:text-neutral-7',
    focus:
      'h-[45px] w-full rounded-lg border border-orange-5 bg-neutral-2 px-3 typo-body-xsmall text-neutral-7 outline-none placeholder:text-neutral-7',
    type:
      'h-[45px] w-full rounded-lg border border-orange-5 bg-neutral-2 px-3 typo-body-xsmall text-neutral-10 outline-none placeholder:text-neutral-7',
    filled:
      'h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-2 px-3 typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7',
    success:
      'h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-2 px-3 typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7',
    error:
      'h-[45px] w-full rounded-lg border border-danger bg-neutral-2 px-3 typo-body-xsmall text-neutral-10 outline-none placeholder:text-neutral-7',
    disabled:
      'h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-3 px-3 typo-body-xsmall text-neutral-7 outline-none placeholder:text-neutral-7',
    time:
      'h-[45px] w-full rounded-lg border border-neutral-4 bg-neutral-2 px-3 typo-body-xsmall text-neutral-7 outline-none placeholder:text-neutral-7',
  };

  const builtInRightSlot = () => {
    if (!showIcon && !isError && !isSuccess && !isType && !isTime) return null;
    if (isTime) {
      return <span className="typo-body-xsmall text-neutral-7">{timeText}</span>;
    }
    if (isError) {
      return <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />;
    }
    if (isSuccess) {
      return <Image src="/assets/icons/icon-check-success.svg" alt="" width={20} height={20} />;
    }
    if (isType) {
      return <Image src="/assets/icons/icon-clear.svg" alt="" width={20} height={20} />;
    }
    return <Image src="/assets/icons/icon-eye-hide.svg" alt="" width={20} height={20} />;
  };

  const captionText = caption ?? helperText;
  const needsRightPadding = Boolean(rightSlot || builtInRightSlot());

  return (
    <div className="w-full space-y-1">
      {label ? (
        <div className="w-full">
          <div className="flex items-center gap-1">
            <label htmlFor={id} className={labelClassName}>
              {label}
            </label>
            {showStar ? <span className="typo-body-xsmall-bold text-danger">*</span> : null}
          </div>
          {subtext ? <p className="text-[11px] leading-[1.5] text-neutral-8">{subtext}</p> : null}
        </div>
      ) : null}

      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          disabled={isDisabled || inputDisabled}
          className={cn(inputClassNameByStatus[status], needsRightPadding ? 'pr-10' : '', inputClassName)}
          {...restInputProps}
        />
        {rightSlot || builtInRightSlot() ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot ?? builtInRightSlot()}</div>
        ) : null}
      </div>

      {captionText ? (
        <p className={cn('typo-body-xsmall', isError ? 'text-danger' : 'text-neutral-10', captionClassName)}>{captionText}</p>
      ) : null}
    </div>
  );
}
