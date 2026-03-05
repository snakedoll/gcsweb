import React from 'react';
import { cn } from '@/lib/utils';

type ProductLikeProperty1 = 'Light' | 'selected';
type ProductLikeProperty2 = 'Heart' | 'selected';

interface ProductLikeProps {
  className?: string;
  property1?: ProductLikeProperty1;
  property2?: ProductLikeProperty2;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  selected?: boolean;
  disabled?: boolean;
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20.2L10.55 18.88C5.4 14.2 2 11.12 2 7.35C2 4.27 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.27 22 7.35C22 11.12 18.6 14.2 13.45 18.88L12 20.2Z"
          fill="var(--color-orange-5)"
        />
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.2L10.55 18.88C5.4 14.2 2 11.12 2 7.35C2 4.27 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.27 22 7.35C22 11.12 18.6 14.2 13.45 18.88L12 20.2Z"
        stroke="var(--color-neutral-5)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductLike({
  className,
  property1 = 'Light',
  property2 = 'Heart',
  onClick,
  selected,
  disabled = false,
}: ProductLikeProps) {
  const isSelected = selected ?? (property1 === 'selected' && property2 === 'selected');

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center',
        disabled && 'cursor-not-allowed opacity-60',
        !disabled && onClick && 'cursor-pointer',
        className
      )}
    >
      <HeartIcon filled={isSelected} />
    </button>
  );
}
