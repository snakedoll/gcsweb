import { cn } from '@/lib/utils';

type TagColor = 'white-gray' | 'orange' | 'solid-orange';

interface TagProps {
  color?: TagColor;
  contents?: string;
  iconLeft?: boolean;
  iconRight?: boolean;
  className?: string;
}

function LocationIcon({ tone }: { tone: 'dark' | 'orange' | 'white' }) {
  const color = 
    tone === 'orange' ? 'var(--color-orange-7)' : 
    tone === 'white' ? '#FFFFFF' :
    'var(--color-neutral-10)';
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M6 10C6 10 9.5 7.2 9.5 4.7C9.5 2.93 8.06 1.5 6.3 1.5C4.54 1.5 3.1 2.93 3.1 4.7C3.1 7.2 6 10 6 10Z"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.3" cy="4.7" r="1" fill={color} />
    </svg>
  );
}

export default function Tag({
  color = 'white-gray',
  contents = '태그',
  iconLeft = false,
  iconRight = false,
  className,
}: TagProps) {
  const isOrange = color === 'orange';
  const isSolidOrange = color === 'solid-orange';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-lg px-2 py-0.5',
        isSolidOrange ? 'bg-[#F8A376] text-white' : 
        isOrange ? 'bg-orange-3 text-orange-7' : 
        'bg-neutral-4 text-neutral-10',
        className
      )}
    >
      {iconLeft ? <LocationIcon tone={isSolidOrange ? 'white' : isOrange ? 'orange' : 'dark'} /> : null}
      <span className="text-[13px] font-pretendard leading-[1.5]">{contents}</span>
      {iconRight ? <LocationIcon tone={isSolidOrange ? 'white' : isOrange ? 'orange' : 'dark'} /> : null}
    </div>
  );
}

