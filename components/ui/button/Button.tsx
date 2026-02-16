import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ButtonSize = 'l' | 'm' | 's';
type ButtonColor = 'black' | 'orange' | 'white' | 'beige';
type ButtonStatus = 'default' | 'activated' | 'disabled';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  size?: ButtonSize;
  color?: ButtonColor;
  status?: ButtonStatus;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconL?: boolean;
  iconR?: boolean;
}

function ArrowIcon({ direction = 'right' }: { direction?: 'left' | 'right' }) {
  return (
    <Image
      src="/assets/icons/icon-right.svg"
      alt=""
      width={20}
      height={20}
      className={direction === 'left' ? 'rotate-180' : undefined}
    />
  );
}

const sizeClassMap: Record<ButtonSize, string> = {
  l: 'px-4 py-4',
  m: 'px-4 py-3',
  s: 'px-4 py-2',
};

const styleClassMap: Record<ButtonColor, Record<ButtonStatus, string>> = {
  black: {
    default: 'bg-neutral-10 text-neutral-2',
    activated: 'bg-neutral-12 text-neutral-2',
    disabled: 'bg-neutral-6 text-neutral-2',
  },
  orange: {
    default: 'bg-orange-5 text-neutral-2',
    activated: 'bg-orange-6 text-neutral-2',
    disabled: 'bg-orange-3 text-neutral-2',
  },
  white: {
    default: 'border border-neutral-6 bg-neutral-2 text-neutral-10',
    activated: 'border border-neutral-7 bg-neutral-2 text-neutral-10',
    disabled: 'border border-neutral-5 bg-neutral-2 text-neutral-7',
  },
  beige: {
    default: 'bg-[#e9ded2] text-neutral-12',
    activated: 'bg-[#e9ded2] text-neutral-12',
    disabled: 'bg-[#e9ded2] text-neutral-12',
  },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      size = 'l',
      color = 'black',
      status = 'default',
      leftIcon,
      rightIcon,
      iconL = false,
      iconR = false,
      disabled,
      children = '텍스트',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || status === 'disabled';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex w-full items-center justify-center gap-1 rounded-lg typo-body-small-bold transition-colors',
          isDisabled ? 'cursor-default' : 'cursor-pointer',
          sizeClassMap[size],
          styleClassMap[color][status],
          className
        )}
        {...props}
      >
        {leftIcon ?? (iconL ? <ArrowIcon direction="left" /> : null)}
        <span>{children}</span>
        {rightIcon ?? (iconR ? <ArrowIcon direction="right" /> : null)}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { ArrowIcon };
export default Button;
