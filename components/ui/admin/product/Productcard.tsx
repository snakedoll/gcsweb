import Image from 'next/image';
import CheckboxButton from '@/components/ui/button/CheckboxButton';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import { cn } from '@/lib/utils';
import FundPercent from './FundPercent';
import ProductDDay from './ProductDDay';
import ProductLike from './ProductLike';
import type { ProductDDayColor } from './ProductDDay';

export type ProductcardType = 'fund' | 'buynow/partnerup';
export type ProductcardView = 'shop' | 'admin' | 'seller';

interface ProductcardProps {
  className?: string;
  type?: ProductcardType;
  view?: ProductcardView;
  imageSrc?: string;
  brand?: string;
  title?: string;
  description?: string;
  dDayText?: string;
  dDayColor?: ProductDDayColor;
  periodText?: string;
  achievedAmountText?: string;
  totalAmountText?: string;
  progressPercent?: number;
  likeCount?: number;
  homeExpose?: boolean;
  publicChecked?: boolean;
  onHomeExposeChange?: (checked: boolean) => void;
  onPublicChange?: (checked: boolean) => void;
  onCardClick?: () => void;
}

function DashDivider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full border-t border-dashed border-neutral-5', className)} aria-hidden />;
}

function PeriodField({ value }: { value: string }) {
  return (
    <div className="inline-flex h-[22px] items-center justify-center rounded-[3px] border border-neutral-5 px-[6px] py-px">
      <span className="typo-body-xsmall text-neutral-7">{value}</span>
    </div>
  );
}

function LikeCount({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-[3px] typo-body-xsmall text-neutral-8">
      <span>좋아요 수</span>
      <span>{count}</span>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-[7px] w-full overflow-hidden rounded-[3.5px] border border-neutral-5 bg-neutral-3">
      <div className="h-[7px] rounded-[3.5px] bg-[#EFDDC9]" style={{ width: `${safePercent}%` }} />
    </div>
  );
}

function ProductContext({
  imageSrc,
  brand,
  title,
  description,
  showPeriod,
  periodLabel,
  periodText,
  showDday,
  showLikeInContext,
  dDayText,
  dDayColor,
  onCardClick,
}: {
  imageSrc?: string;
  brand: string;
  title: string;
  description: string;
  showPeriod: boolean;
  periodLabel: string;
  periodText: string;
  showDday: boolean;
  showLikeInContext: boolean;
  dDayText: string;
  dDayColor: ProductDDayColor;
  onCardClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCardClick}
      className={cn('flex w-full items-center justify-between text-left', onCardClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <div className="relative h-[125px] w-[102px] overflow-hidden rounded bg-neutral-4">
        {imageSrc ? <Image src={imageSrc} alt="" fill unoptimized sizes="102px" className="object-cover" /> : null}
      </div>

      <div className="w-[205px] pl-3">
        <div className="flex flex-col gap-[7px]">
          <div className="flex flex-col gap-[3px]">
            <p className="typo-body-xsmall text-neutral-11">{brand}</p>
            <div className="flex flex-col gap-px">
              <p className="truncate typo-heading-xsmall text-neutral-12">{title}</p>
              <p className="line-clamp-1 typo-body-xsmall text-neutral-11">{description}</p>
            </div>
          </div>

          <DashDivider className={showPeriod ? 'w-[194px]' : 'w-[193px]'} />

          {showPeriod ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] leading-[1.5] text-neutral-8">{periodLabel}</p>
              <div className="w-[154px]">
                <PeriodField value={periodText} />
              </div>
            </div>
          ) : null}

          {showDday || showLikeInContext ? (
            <div className={cn('flex items-center', showLikeInContext ? 'justify-between' : 'justify-start')}>
              {showDday ? <ProductDDay color={dDayColor} text={dDayText} /> : <span />}
              {showLikeInContext ? <ProductLike /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function Productcard({
  className,
  type = 'fund',
  view = 'shop',
  imageSrc,
  brand = 'MUA',
  title = '상품 제목',
  description = '상품 설명',
  dDayText = 'D-5',
  dDayColor = 'Gray',
  periodText = '2025.05.05 - 2025.06.05',
  achievedAmountText = '370,000원',
  totalAmountText = '570,000원',
  progressPercent = 70,
  likeCount = 17,
  homeExpose = false,
  publicChecked = false,
  onHomeExposeChange,
  onPublicChange,
  onCardClick,
}: ProductcardProps) {
  const isFund = type === 'fund';
  const isBuy = type === 'buynow/partnerup';
  const isShop = view === 'shop';
  const isAdmin = view === 'admin';
  const isSeller = view === 'seller';
  const safePercent = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <div
      className={cn(
        'w-[343px] overflow-hidden rounded-lg border border-neutral-4 bg-neutral-2 px-[18px]',
        isAdmin ? 'pb-4 pt-3' : 'py-4',
        className
      )}
    >
      <div className="flex flex-col gap-[10px]">
        {isAdmin ? (
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center justify-between">
              <CheckboxButton checked={homeExpose} label="홈에 노출" onChange={onHomeExposeChange} />
              <div className="inline-flex items-center gap-[9px]">
                <span className="text-[11px] leading-[1.5] text-neutral-7">공개</span>
                <ToggleSwitch checked={publicChecked} onChange={onPublicChange} />
              </div>
            </div>
            <DashDivider className="w-full" />
          </div>
        ) : null}

        <ProductContext
          imageSrc={imageSrc}
          brand={brand}
          title={title}
          description={description}
          showPeriod={isAdmin || isSeller}
          periodLabel={isBuy ? '판매 기간' : '펀딩 기간'}
          periodText={periodText}
          showDday={isShop}
          showLikeInContext={isShop && isBuy}
          dDayText={dDayText}
          dDayColor={dDayColor}
          onCardClick={onCardClick}
        />

        {isFund ? (
          <div className={cn('flex w-full flex-col items-start', isShop ? 'gap-[10px]' : 'gap-[5px]')}>
            {isAdmin || isSeller ? (
              <p className="typo-body-xsmall text-neutral-8">
                <span>달성/목표 금액 : </span>
                <span className="text-orange-5">{achievedAmountText}</span>
                <span>{`/ ${totalAmountText}`}</span>
              </p>
            ) : null}
            <ProgressBar percent={safePercent} />
          </div>
        ) : null}

        {isFund || isAdmin || isSeller ? (
          <div className={cn('flex w-full items-center', isBuy ? 'justify-end' : 'justify-between')}>
            {isFund ? <FundPercent variant={safePercent >= 100 ? '달성' : '미달성'} percentText={`${safePercent}%`} /> : null}
            {isShop && isFund ? <ProductLike /> : null}
            {isAdmin || isSeller ? <LikeCount count={likeCount} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
