import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadlineProps {
  className?: string;
  children?: ReactNode;
}

export default function SectionHeadline({
  className,
  children = '\uC18C\uC7A5 \uC774\uC0C1\uC758 \uD65C\uC6A9 \uAC00\uCE58\uB97C \uB9CC\uB4E4\uB2E4',
}: SectionHeadlineProps) {
  return <p className={cn('typo-heading-xsmall text-neutral-12', className)}>{children}</p>;
}
