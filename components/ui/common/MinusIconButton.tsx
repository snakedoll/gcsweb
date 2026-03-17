import { cn } from '@/lib/utils';

interface MinusIconButtonProps {
  className?: string;
  disabled?: boolean;
}

export default function MinusIconButton({ className, disabled = false }: MinusIconButtonProps) {
  const boxFill = disabled ? 'var(--color-neutral-4)' : 'var(--color-neutral-2)';
  const boxStroke = 'var(--color-neutral-5)';
  const lineStroke = disabled ? 'var(--color-neutral-6)' : 'var(--color-neutral-8)';

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(className)}
      data-name="Iconex/Light/Minus"
      data-node-id="7770:56544"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.5" />
      <path d="M9 12H15" stroke={lineStroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
