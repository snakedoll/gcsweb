import { cn } from '@/lib/utils';

interface PlusIconButtonProps {
  className?: string;
  disabled?: boolean;
}

export default function PlusIconButton({ className, disabled = false }: PlusIconButtonProps) {
  const boxStroke = 'var(--color-neutral-5)';
  const lineStroke = disabled ? 'var(--color-neutral-5)' : 'var(--color-neutral-8)';
  const boxFill = 'var(--color-neutral-2)';

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(className)}
      data-name="Iconex/Light/Plus"
      data-node-id="6712:34960"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.5" />
      <path d="M9 12H15" stroke={lineStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9V15" stroke={lineStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
