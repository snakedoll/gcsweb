import { cn } from '@/lib/utils';

type FloatingButtonColor = 'orange' | 'white';
type FloatingButtonStatus = 'default' | 'activated';

interface FloatingButtonProps {
  color?: FloatingButtonColor;
  status?: FloatingButtonStatus;
  className?: string;
  onClick?: () => void;
}

export default function FloatingButton({
  color = 'orange',
  status = 'default',
  className,
  onClick,
}: FloatingButtonProps) {
  const isOrange = color === 'orange';
  const isActivated = status === 'activated';

  const bgClass = isOrange
    ? isActivated
      ? 'bg-orange-6'
      : 'bg-orange-5'
    : isActivated
      ? 'bg-neutral-3'
      : 'bg-neutral-2';

  const iconClass = isOrange ? 'text-neutral-2' : 'text-neutral-10';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-[30.5px] p-4 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.16)]',
        bgClass,
        className
      )}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconClass} aria-hidden>
        <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

