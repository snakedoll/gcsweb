import { useState } from 'react';
import { cn } from '@/lib/utils';
import Item from './Item';

type DropdownSize = 's' | 'm' | 'l';
type DropdownState = 'default' | 'selected' | 'active' | 'open';

interface DropdownItem {
  label: string;
  value: string;
  subtext?: string;
}

interface DropdownProps {
  label?: string;
  size?: DropdownSize;
  state?: DropdownState;
  placeholder?: string;
  value?: string;
  items?: DropdownItem[];
  className?: string;
  onSelect?: (value: string) => void;
  open?: boolean;
  onToggle?: () => void;
  /** true면 목록을 아래 콘텐츠 위에 겹쳐 띄운다(레이아웃을 밀지 않음) */
  overlay?: boolean;
}

function Caret({ open, colorClass }: { open: boolean; colorClass: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(open ? 'rotate-180' : '', 'transition-transform')}
      aria-hidden
    >
      <path
        d="M7 8.5L10 11.5L13 8.5"
        className={colorClass}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const fieldSizeClassMap: Record<DropdownSize, string> = {
  s: 'h-[30px] rounded-[4px] px-3 py-2',
  m: 'rounded-[4px] px-3 py-2',
  l: 'rounded-[4px] p-3',
};

const listClassMap: Record<DropdownSize, string> = {
  s: 'max-h-[108px] overflow-y-auto rounded-[4px]',
  m: 'rounded-[8px]',
  l: 'rounded-[8px]',
};

export default function Dropdown({
  label = 'Label',
  size = 's',
  state = 'default',
  placeholder = '선택',
  value,
  items = [
    { label: '리스트', value: 'item-1' },
    { label: '리스트', value: 'item-2' },
    { label: '리스트', value: 'item-3' },
  ],
  className,
  onSelect,
  open,
  onToggle,
  overlay = false,
}: DropdownProps) {
  const isOpenControlled = typeof open === 'boolean';
  const [internalOpen, setInternalOpen] = useState(state === 'open');
  const resolvedOpen = isOpenControlled ? Boolean(open) : state === 'open' || internalOpen;

  const visualState: DropdownState = resolvedOpen ? 'open' : state;

  const borderClass =
    visualState === 'open'
      ? 'border-orange-5'
      : visualState === 'active'
        ? 'border-neutral-12'
        : visualState === 'selected'
          ? 'border-neutral-6'
          : 'border-neutral-5';

  const textClass = visualState === 'default' ? 'text-neutral-7' : 'text-neutral-10';
  const caretColorClass = visualState === 'default' ? 'text-neutral-6' : 'text-neutral-10';

  const displayText = value ?? placeholder;
  const showLabel = Boolean(label);

  return (
    <div className={cn('relative flex w-full flex-col items-start gap-[5px]', className)}>
      {showLabel ? <p className="w-full typo-body-xsmall text-neutral-12">{label}</p> : null}

      <button
        type="button"
        onClick={() => {
          if (onToggle) {
            onToggle();
            return;
          }
          if (!isOpenControlled) {
            setInternalOpen((prev) => !prev);
          }
        }}
        className={cn(
          'flex w-full items-center justify-between border bg-neutral-2',
          fieldSizeClassMap[size],
          borderClass
        )}
      >
        <span className={cn('typo-body-xsmall', textClass)}>{displayText}</span>
        <Caret open={resolvedOpen} colorClass={caretColorClass} />
      </button>

      {resolvedOpen ? (
        <div
          className={cn(
            'w-full overflow-hidden bg-white shadow-[0px_0px_3px_0px_rgba(0,0,0,0.15)]',
            overlay && 'absolute left-0 top-full z-30 mt-[5px]',
            listClassMap[size]
          )}
        >
          {items.map((item) => (
            <Item
              key={item.value}
              contents={item.label}
              subtext={item.subtext}
              size={size === 'l' ? 'l' : 'm'}
              state={size === 'l' && item.subtext ? 'default_subtext' : 'default'}
              onClick={() => {
                onSelect?.(item.value);
                if (!isOpenControlled) {
                  setInternalOpen(false);
                }
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
