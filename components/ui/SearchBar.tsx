import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchBar({
  placeholder = '이름, 전공, 학번으로 검색...',
  className,
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className={cn('flex h-10 w-full items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 pl-4 pr-3', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent typo-body-xsmall text-neutral-10 placeholder:text-neutral-7 outline-none"
      />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="11" cy="11" r="6.5" stroke="#999694" strokeWidth="1.5" />
        <path d="M16 16L20 20" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

