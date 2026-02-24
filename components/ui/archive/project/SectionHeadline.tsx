import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadlineProps {
  className?: string;
  children?: ReactNode;
}

export default function SectionHeadline({ className, children = '소장 이상의 활용 가치를 만들다' }: SectionHeadlineProps) {
  return (
    <p className={cn('typo-heading-xsmall text-neutral-12', className)}>
      {children}
    </p>
  );
}