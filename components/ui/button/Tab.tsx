'use client';

import { cn } from '@/lib/utils';

interface TabProps {
  title?: string;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function Tab({
  title = '제목',
  active = false,
  className,
  onClick,
}: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[43px] items-center justify-center border-b px-1',
        active ? 'border-orange-5 text-orange-5' : 'border-neutral-5 text-neutral-6',
        className
      )}
    >
      <span className="typo-body-xsmall-bold text-center">{title}</span>
    </button>
  );
}
