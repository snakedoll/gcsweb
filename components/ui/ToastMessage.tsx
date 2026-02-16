import { cn } from '@/lib/utils';

interface ToastMessageProps {
  message?: string;
  className?: string;
}

export default function ToastMessage({
  message = '처리되었습니다.',
  className,
}: ToastMessageProps) {
  return (
    <div className={cn('flex w-full items-center gap-3 rounded-lg bg-orange-5 p-3', className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="white" />
        <path d="M12 10V16" stroke="#2B3F6C" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="7" r="1.2" fill="#2B3F6C" />
      </svg>
      <p className="typo-body-small text-neutral-2">{message}</p>
    </div>
  );
}

