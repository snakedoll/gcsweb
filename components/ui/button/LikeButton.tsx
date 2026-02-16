import { cn } from '@/lib/utils';

type LikeButtonStatus = 'empty' | 'filled';

interface LikeButtonProps {
  status?: LikeButtonStatus;
  className?: string;
  onClick?: () => void;
}

export default function LikeButton({
  status = 'empty',
  className,
  onClick,
}: LikeButtonProps) {
  const isFilled = status === 'filled';

  return (
    <button type="button" onClick={onClick} className={cn('inline-flex h-5 w-5 items-center justify-center', className)}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M17.5 6.667C17.5 4.075 15.425 2 12.833 2C11.267 2 9.875 2.825 9 4.075C8.125 2.825 6.733 2 5.167 2C2.575 2 0.5 4.075 0.5 6.667C0.5 12.5 9 18 9 18C9 18 17.5 12.5 17.5 6.667Z"
          fill={isFilled ? 'var(--color-orange-5)' : 'none'}
          stroke={isFilled ? 'var(--color-orange-5)' : 'var(--color-neutral-10)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

