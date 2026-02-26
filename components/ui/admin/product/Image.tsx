import NextImage from 'next/image';
import { cn } from '@/lib/utils';

export type ImageProperty1 = 'Default' | 'remove' | 'empty' | 'add';

type ImageProps = {
  className?: string;
  property1?: ImageProperty1;
  src?: string | null;
  alt?: string;
  countText?: string;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
};

function CloseIcon() {
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/35">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M3 3L9 9M9 3L3 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3.3" y="3.3" width="25.4" height="25.4" rx="5" stroke="#2F2824" strokeWidth="2" />
      <path d="M5.5 22.8L12.5 15.8L16.8 20L20.1 16.7L26.5 23" stroke="#2F2824" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.6" cy="10.6" r="2" fill="#2F2824" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 8.5V23.5M8.5 16H23.5"
        stroke="#C7C5C4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Image({
  className,
  property1 = 'Default',
  src,
  alt = '',
  countText = '0/0',
  onClick,
  onRemove,
  disabled = false,
}: ImageProps) {
  const isAdd = property1 === 'add';
  const isEmpty = property1 === 'empty';
  const isRemove = property1 === 'remove';
  const isDefault = property1 === 'Default';
  const clickable = Boolean(onClick);

  return (
    <div
      className={cn(
        'relative h-[100px] w-[82px] overflow-hidden rounded-lg',
        (isAdd || isEmpty) && 'flex items-center justify-center border border-neutral-4 bg-neutral-2',
        clickable && 'cursor-pointer',
        disabled && 'pointer-events-none opacity-70',
        className
      )}
    >
      {(isDefault || isRemove) && src ? (
        <NextImage src={src} alt={alt} fill unoptimized sizes="82px" className="object-cover" />
      ) : null}

      {isDefault && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="absolute right-1 top-1 inline-flex"
          aria-label="이미지 제거"
        >
          <CloseIcon />
        </button>
      ) : null}

      {isEmpty ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex h-full w-full flex-col items-center justify-center"
          aria-label="이미지 업로드"
        >
          <div className="flex flex-col items-center gap-px">
            <EmptyIcon />
            <span className="text-[10px] leading-[1.5] text-neutral-6">{countText}</span>
          </div>
        </button>
      ) : null}

      {isAdd ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex h-full w-full items-center justify-center"
          aria-label="이미지 추가"
        >
          <PlusIcon />
        </button>
      ) : null}
    </div>
  );
}
