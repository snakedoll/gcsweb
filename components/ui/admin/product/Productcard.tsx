import React from 'react';
import Image from 'next/image';
import CheckboxButton from '@/components/ui/button/CheckboxButton';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import ProductLike from './ProductLike';
import ProductDDay from './ProductDDay';
import FundPercent from './FundPercent';
import { cn } from '@/lib/utils';
import type { ProductDDayColor } from './ProductDDay';

export type ProductcardType = 'fund' | 'buynow/partnerup' | 'all';
export type ProductcardView = 'shop' | 'admin' | 'seller' | 'cart';

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
  cartOptionText?: string;
  cartPriceText?: string;
  cartTags?: string[];
  liked?: boolean;
  onLikeClick?: (e: React.MouseEvent) => void;
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

function CartTag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[8px] bg-orange-3 px-2 py-[2px] typo-body-xsmall text-orange-7">
      {text}
    </span>
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
  liked,
  onLikeClick,
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
  liked?: boolean;
  onLikeClick?: (e: React.MouseEvent) => void;
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
              <div className="w-fit">
                <PeriodField value={periodText} />
              </div>
            </div>
          ) : null}

          {showDday || showLikeInContext ? (
            <div className={cn('flex items-center', showLikeInContext ? 'justify-between' : 'justify-start')}>
              {showDday ? <ProductDDay color={dDayColor} text={dDayText} /> : <span />}
              {showLikeInContext ? (
                <ProductLike
                  selected={liked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLikeClick?.(e);
                  }}
                />
              ) : null}
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
  cartOptionText = 'BLACK·S / 1개',
  cartPriceText = '30,300원',
  cartTags = ['Fund', '택배 배송'],
  liked = false,
  onLikeClick,
}: ProductcardProps) {
  const isFund = type === 'fund';
  const isBuy = type === 'buynow/partnerup';
  const isShop = view === 'shop';
  const isAdmin = view === 'admin';
  const isSeller = view === 'seller';
  const isCartAll = type === 'all' && view === 'cart';
  const safePercent = Math.max(0, Math.min(100, Math.round(progressPercent)));

  if (isCartAll) {
    return (
      <div className={cn('flex w-[312px] flex-col gap-2', className)}>
        <div className="flex gap-4">
          <div className="relative h-[100px] w-[80px] shrink-0 overflow-hidden rounded bg-neutral-4">
            {imageSrc ? <Image src={imageSrc} alt="" fill unoptimized sizes="80px" className="object-cover" /> : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="typo-body-small text-neutral-8">{brand}</p>
            <p className="truncate typo-body-small-bold text-neutral-12">{title}</p>
            <p className="typo-body-xsmall text-neutral-11">{cartOptionText}</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {cartTags.map((tag) => (
                <CartTag key={tag} text={tag} />
              ))}
            </div>
          </div>
        </div>

        <DashDivider className="w-full" />
        <p className="typo-body-small-bold text-neutral-11">{cartPriceText}</p>
      </div>
    );
  }

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
          liked={liked}
          onLikeClick={onLikeClick}
        />

        {isFund ? (
          <div className={cn('flex w-full flex-col items-start', isShop ? 'gap-[10px]' : 'gap-[5px]')}>
            {isAdmin || isSeller ? (
              <p className="typo-body-xsmall text-neutral-8">
                <span>달성/목표 금액 : </span>
                <span className="text-orange-5">{achievedAmountText}</span>
                <span>{` / ${totalAmountText}`}</span>
              </p>
            ) : null}
            <ProgressBar percent={safePercent} />
          </div>
        ) : null}

        {isFund || isAdmin || isSeller ? (
          <div className={cn('flex w-full items-center', isBuy && !isAdmin && !isSeller ? 'justify-end' : 'justify-between')}>
            {isFund ? <FundPercent variant={safePercent >= 100 ? '달성' : '미달성'} percentText={`${safePercent}%`} /> : null}
            {isShop && isFund ? (
              <ProductLike
                selected={liked}
                onClick={(e) => {
                  e.stopPropagation();
                  onLikeClick?.(e);
                }}
              />
            ) : null}
            {isAdmin || isSeller ? (
              <LikeCount count={likeCount} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
