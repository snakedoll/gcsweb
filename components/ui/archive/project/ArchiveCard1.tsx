import { cn } from '@/lib/utils';
import ArchiveCardName from './ArchiveCardName';

interface ArchiveCard1Props {
  className?: string;
  title?: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
  cardAriaLabel?: string;
  onCardClick?: () => void;
  onPrevClick?: () => void;
  onNextClick?: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}

function ArrowButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'left' | 'right';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isLeft = direction === 'left';
  const iconPath = isLeft
    ? '/assets/icons/arrow/filled/Iconex/Filled/Left 2.svg'
    : '/assets/icons/arrow/filled/Iconex/Filled/Right 2.svg';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isLeft ? '\uC774\uC804 \uCE74\uB4DC' : '\uB2E4\uC74C \uCE74\uB4DC'}
      data-role="archive-card-arrow"
      className={cn(
        'flex h-6 w-6 items-center justify-center transition disabled:opacity-40',
        disabled ? 'text-neutral-6' : 'text-orange-3'
      )}
    >
      <span
        aria-hidden
        className="block h-6 w-6 bg-current"
        style={{
          WebkitMaskImage: `url("${iconPath}")`,
          maskImage: `url("${iconPath}")`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: '24px 24px',
          maskSize: '24px 24px',
        }}
      />
    </button>
  );
}

export default function ArchiveCard1({
  className,
  title = '\uC18C\uC7A5 \uC774\uC0C1\uC758 \uD65C\uC6A9 \uAC00\uCE58\uB97C \uB9CC\uB4E4\uB2E4',
  subtitle = '\uC720\uB791',
  imageSrc,
  imageAlt,
  cardAriaLabel,
  onCardClick,
  onPrevClick,
  onNextClick,
  disablePrev = false,
  disableNext = false,
}: ArchiveCard1Props) {
  const CardContentWrapper = onCardClick ? 'button' : 'div';

  return (
    <div className={cn('flex items-center justify-between bg-white px-4 py-7', className)}>
      <ArrowButton direction="left" onClick={onPrevClick} disabled={disablePrev} />

      <CardContentWrapper
        {...(onCardClick
          ? {
              type: 'button' as const,
              onClick: onCardClick,
              'aria-label': cardAriaLabel ?? `${title} 상세 보기`,
            }
          : {})}
        className={cn(
          'flex w-[269px] flex-col items-start gap-4',
          onCardClick && 'text-left'
        )}
      >
        <div className="relative aspect-[1080/1350] w-full overflow-hidden rounded-lg shadow-[0_0_5px_rgba(0,0,0,0.2)]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt ?? `${title} \uD3EC\uC2A4\uD130`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#F1EEE9]" />
          )}
        </div>

        <div className="w-full space-y-3">
          <div className="h-px w-full bg-neutral-5" />
          <ArchiveCardName title={title} subtitle={subtitle} className="w-full" />
        </div>
      </CardContentWrapper>

      <ArrowButton direction="right" onClick={onNextClick} disabled={disableNext} />
    </div>
  );
}
