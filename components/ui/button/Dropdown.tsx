import { useState } from 'react';
import { cn } from '@/lib/utils';

type DropdownSize = 's' | 'l';
type DropdownState = 'default' | 'selected' | 'active' | 'open';

interface DropdownItem {
  label: string;
  value: string;
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
}

function Caret({ open, muted }: { open: boolean; muted: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(open ? 'rotate-180' : '', 'transition-transform')}
      aria-hidden
    >
      <path
        d="M4 6L7.5 9L11 6"
        stroke={muted ? 'var(--color-neutral-6)' : 'var(--color-neutral-10)'}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dropdown({
  label = 'Label',
  size = 's',
  state = 'default',
  placeholder = 'Select',
  value,
  items = [
    { label: 'Item 1', value: 'item-1' },
    { label: 'Item 2', value: 'item-2' },
    { label: 'Item 3', value: 'item-3' },
  ],
  className,
  onSelect,
  open,
  onToggle,
}: DropdownProps) {
  const controlledOpen = state === 'open';
  const isOpenControlled = typeof open === 'boolean';
  const [internalOpen, setInternalOpen] = useState(controlledOpen);
  const resolvedOpen = isOpenControlled ? Boolean(open) : controlledOpen || internalOpen;

  const isDefault = state === 'default';
  const isSelected = state === 'selected' || state === 'active';
  const borderClass = resolvedOpen
    ? 'border-orange-5'
    : isDefault
      ? 'border-neutral-5'
      : isSelected
        ? 'border-neutral-6'
        : 'border-neutral-10';
  const textClass = isDefault ? 'text-neutral-6' : 'text-neutral-10';
  const fieldHeight = size === 's' ? 'h-[30px]' : 'h-auto';
  const listHeight = size === 's' ? 'h-[108px]' : 'h-auto';

  const displayText = value ?? placeholder;
  const showLabel = Boolean(label);

  return (
    <div className={cn('relative flex w-full flex-col items-start gap-[5px]', className)}>
      {showLabel ? <p className="w-full whitespace-pre-wrap typo-body-xsmall text-neutral-12">{label}</p> : null}

      <button
        type="button"
        onClick={() => {
          if (onToggle) {
            onToggle();
            return;
          }
          if (!controlledOpen) {
            setInternalOpen((prev) => !prev);
          }
        }}
        className={cn(
          'flex w-full items-center justify-between rounded-[4px] border bg-neutral-2 px-3 py-2',
          borderClass,
          fieldHeight
        )}
      >
        <span className={cn('typo-body-xsmall', textClass)}>{displayText}</span>
        <Caret open={resolvedOpen} muted={isDefault && !resolvedOpen} />
      </button>

      {resolvedOpen ? (
        <div className={cn('w-full overflow-hidden rounded-[4px] bg-white shadow-[0px_0px_3px_0px_rgba(0,0,0,0.15)]', listHeight)}>
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              className="flex w-full items-center bg-neutral-2 px-3 py-2 text-left typo-body-xsmall text-neutral-10"
              onClick={() => {
                onSelect?.(item.value);
                if (!isOpenControlled) {
                  setInternalOpen(false);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
