'use client';

import { cn } from '@/lib/utils';
import Tab from './Tab';

interface TabBarItem {
  key: string;
  title: string;
}

interface TabBarProps {
  items?: TabBarItem[];
  activeKey?: string;
  className?: string;
  onChange?: (key: string) => void;
}

export default function TabBar({
  items = [
    { key: 'section1', title: '섹션 1' },
    { key: 'section2', title: '섹션 2' },
    { key: 'section3', title: '섹션 3' },
    { key: 'section4', title: '섹션 4' },
  ],
  activeKey = 'section1',
  className,
  onChange,
}: TabBarProps) {
  return (
    <div className={cn('flex w-full items-center py-1', className)}>
      <div className="h-[43px] w-4 border-b border-neutral-4" aria-hidden />
      {items.map((item) => (
        <Tab
          key={item.key}
          title={item.title}
          active={item.key === activeKey}
          className="min-w-0 flex-1"
          onClick={() => onChange?.(item.key)}
        />
      ))}
      <div className="h-[43px] w-4 border-b border-neutral-4" aria-hidden />
    </div>
  );
}
