import { cn } from '@/lib/utils';

type LikeTone = 'Light' | 'selected';
type LikeState = 'Heart' | 'selected';

interface LikeProps {
  className?: string;
  property1?: LikeTone;
  property2?: LikeState;
  active?: boolean;
  onClick?: () => void;
}

export default function Like({
  className,
  property1 = 'Light',
  property2 = 'Heart',
  active,
  onClick,
}: LikeProps) {
  const isActive = active ?? (property1 === 'selected' && property2 === 'selected');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn('relative inline-flex size-6 items-center justify-center', className)}
    >
      <svg width="20" height="19" viewBox="0 0 20 19" fill="none" aria-hidden>
        <path
          d="M10 17.5L8.55 16.18C3.4 11.51 0 8.43 0 4.65C0 1.57 2.42 0 4.9 0C6.8 0 8.63 0.92 10 2.36C11.37 0.92 13.2 0 15.1 0C17.58 0 20 1.57 20 4.65C20 8.43 16.6 11.51 11.45 16.19L10 17.5Z"
          fill={isActive ? 'var(--color-orange-5)' : 'transparent'}
          stroke={isActive ? 'var(--color-orange-5)' : 'var(--color-neutral-5)'}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

