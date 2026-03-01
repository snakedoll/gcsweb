import Link from 'next/link';
import { cn } from '@/lib/utils';
import MenuSectionTitle from './MenuSectionTitle';

interface MenuSectionProps {
  title?: string;
  items?: Array<{ label: string; href: string }>;
  className?: string;
}

export default function MenuSection({
  title = '판매 관리',
  items = [],
  className,
}: MenuSectionProps) {
  return (
    <section className={cn('w-full rounded-lg bg-neutral-1 px-4 py-3', className)}>
      <div className="flex w-full flex-col gap-[5px]">
        <MenuSectionTitle>{title}</MenuSectionTitle>
        <div className="h-px w-full bg-neutral-4" />
        <ul className="flex w-full flex-col gap-3 py-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block w-full typo-body-xsmall text-neutral-8">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
