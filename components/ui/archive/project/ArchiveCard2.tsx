import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import ArchiveCardName from './ArchiveCardName';
import DashboardHeaderTitle from './DashboardHeaderTitle';

interface ArchiveCard2Props {
  className?: string;
  title?: string;
  subtitle?: string;
  year?: number | string;
  category?: string;
  imageSrc?: string;
  imageAlt?: string;
  selected?: boolean;
  onShareClick?: () => void;
  onBookmarkClick?: () => void;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-sm',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {children}
    </button>
  );
}

export default function ArchiveCard2({
  className,
  title = '소장 이상의 활용 가치를 만들다',
  subtitle = '유랑',
  year = 2025,
  category = '공모전',
  imageSrc,
  imageAlt,
  selected = false,
  onShareClick,
  onBookmarkClick,
}: ArchiveCard2Props) {
  return (
    <article className={cn('w-[343px] rounded-[13px] bg-white px-[21px] py-5', className)}>
      <div className="flex flex-col items-start gap-[11px]">
        <div className="relative h-[375px] w-[300px] overflow-hidden rounded-lg shadow-[0_0_5px_rgba(0,0,0,0.2)]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt ?? `${title} 포스터`}
              fill
              unoptimized
              sizes="300px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#f1eee9]" />
          )}
        </div>

        <ArchiveCardName title={title} subtitle={subtitle} />

        <div className="w-full pt-[9px]">
          <div className="mb-[10px] h-px w-[296px] bg-neutral-5" />
          <div className="flex items-center justify-between">
            <DashboardHeaderTitle year={year} category={category} className="pt-0" />
            <div className="flex items-center gap-[6px]">
              <IconButton label="공유" onClick={onShareClick}>
                <Image
                  src="/assets/icons/light/share.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  aria-hidden
                />
              </IconButton>

              <IconButton
                label={selected ? '북마크 해제' : '북마크'}
                onClick={onBookmarkClick}
              >
                <Image
                  src={selected ? '/assets/icons/filled/Filled/Bookmark.svg' : '/assets/icons/icon-bookmark.svg'}
                  alt=""
                  width={24}
                  height={24}
                  className={cn(
                    'h-6 w-6',
                    selected &&
                      '[filter:brightness(0)_saturate(100%)_invert(64%)_sepia(65%)_saturate(1452%)_hue-rotate(331deg)_brightness(102%)_contrast(93%)]'
                  )}
                  aria-hidden
                />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
