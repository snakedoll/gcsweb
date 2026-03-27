import Image from 'next/image';
import { cn } from '@/lib/utils';

type BuynowVariant = 'Header' | '미수령' | '수령완료' | '주문취소완료' | 'multiple' | '봉투';

interface ProductLine {
  id: string;
  name: string;
  option: string;
  priceText: string;
  isBagNotice?: boolean;
}

interface PcTableRowBuynowProps {
  className?: string;
  variant: BuynowVariant;
  no?: number | string;
  orderDateTime?: string;
  orderNumber?: string;
  transactionId?: string;
  paymentInfoTitle?: string;
  paymentAmountText?: string;
  paymentStatusText?: string;
  products?: ProductLine[];
  onRowClick?: () => void;
  onReceiptClick?: () => void;
  onCancelClick?: () => void;
  receiptDisabled?: boolean;
  cancelDisabled?: boolean;
  receiptLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_PRODUCTS: ProductLine[] = [
  { id: '1', name: '염소 후드집업', option: 'BLACK · L / 3개', priceText: '30,000원' },
];

const MULTIPLE_PRODUCTS: ProductLine[] = [
  { id: '1', name: '염소 후드집업', option: 'BLACK · L / 3개', priceText: '30,000원' },
  { id: '2', name: '염소 후드집업', option: 'L / 3개', priceText: '30,000원' },
  { id: '3', name: '염소 후드집업', option: '3개', priceText: '30,000원' },
];

const BAG_PRODUCTS: ProductLine[] = [
  { id: 'bag', name: '봉투에 담아주세요', option: '', priceText: '100원', isBagNotice: true },
  { id: '1', name: '염소 후드집업', option: 'BLACK · L / 3개', priceText: '30,000원' },
];

function rowHeightClass(variant: BuynowVariant) {
  if (variant === 'Header') return 'h-10';
  if (variant === 'multiple') return 'h-[181px]';
  if (variant === '봉투') return 'h-32';
  return 'h-[121px]';
}

function productColumnClass(variant: BuynowVariant) {
  if (variant === 'Header') return 'bg-white';
  if (variant === '주문취소완료') return 'bg-neutral-5';
  return 'bg-orange-3';
}

function receiptButtonClass(variant: BuynowVariant) {
  if (variant === '미수령' || variant === '봉투') return 'bg-orange-5';
  return 'bg-orange-3';
}

function cancelButtonClass(variant: BuynowVariant) {
  if (variant === '주문취소완료') return 'bg-orange-3';
  return 'bg-orange-5';
}

function resolveProducts(variant: BuynowVariant, products?: ProductLine[]) {
  if (products && products.length > 0) return products;
  if (variant === 'multiple') return MULTIPLE_PRODUCTS;
  if (variant === '봉투') return BAG_PRODUCTS;
  return DEFAULT_PRODUCTS;
}

export default function PcTableRow_Buynow({
  className,
  variant,
  no = 1,
  orderDateTime = '25.08.21 17:30',
  orderNumber = '2026030405',
  transactionId = 'cmn7j5ezt005qkhp5syv9msrr',
  paymentInfoTitle = '가상계좌',
  paymentAmountText = '20,000원',
  paymentStatusText = '미결제',
  products,
  onRowClick,
  onReceiptClick,
  onCancelClick,
  receiptDisabled = false,
  cancelDisabled = false,
  receiptLabel,
  cancelLabel,
}: PcTableRowBuynowProps) {
  const isHeader = variant === 'Header';
  const isCanceled = variant === '주문취소완료';
  const isUnreceived = variant === '미수령';
  const hasBag = variant === '봉투';
  const resolvedProducts = resolveProducts(variant, products);
  const resolvedReceiptLabel = receiptLabel ?? (isUnreceived || hasBag ? '미수령' : '수령');
  const resolvedCancelLabel = cancelLabel ?? (isCanceled ? '주문 취소 완료' : '주문 취소');

  return (
    <div
      className={cn(
        'flex w-[1232px] rounded-[8px] border border-neutral-5 bg-white',
        rowHeightClass(variant),
        onRowClick && !isHeader ? 'cursor-pointer' : '',
        className
      )}
      onClick={onRowClick}
      role={onRowClick ? 'button' : undefined}
      tabIndex={onRowClick ? 0 : undefined}
      onKeyDown={
        onRowClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onRowClick();
              }
            }
          : undefined
      }
    >
      <div className={cn('flex w-[72px] items-start justify-center border-r border-dashed border-neutral-5 px-3', isHeader ? 'pt-[10px]' : 'pt-[17px]')}>
        <p className={cn('text-neutral-10', isHeader ? 'typo-body-xsmall-bold' : 'typo-body-small-bold')}>
          {isHeader ? 'No.' : no}
        </p>
      </div>

      <div className={cn('flex w-[120px] border-r border-dashed border-neutral-5 px-[18px]', isHeader ? 'items-center py-[10px]' : 'items-start py-4')}>
        <p className={cn('w-full text-neutral-10', isHeader ? 'typo-body-xsmall-bold' : 'typo-body-xsmall')}>
          {isHeader ? '주문시각' : orderDateTime}
        </p>
      </div>

      <div className={cn('flex w-[160px] border-r border-dashed border-neutral-5 px-[18px]', isHeader ? 'items-center py-[10px]' : 'items-start py-4')}>
        {isHeader ? (
          <p className="typo-body-xsmall-bold w-full text-neutral-10">주문번호 · 거래번호</p>
        ) : (
          <div className="flex w-full flex-col gap-[3px] text-neutral-10">
            <p className="typo-body-small w-full">{orderNumber}</p>
            {variant === '수령완료' ? <p className="typo-body-small w-full">{transactionId}</p> : null}
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex w-[285px] flex-col gap-[10px] border-r border-dashed border-neutral-5 px-4',
          productColumnClass(variant),
          isHeader ? 'justify-center py-[10px]' : 'justify-start py-4'
        )}
      >
        {isHeader ? (
          <p className="typo-body-xsmall-bold text-orange-5">주문 상품</p>
        ) : (
          resolvedProducts.map((product) => (
            <div key={product.id} className="flex w-full items-start justify-between gap-4">
              <div className="flex w-[137px] flex-col gap-[3px] text-neutral-10">
                {product.isBagNotice ? (
                  <div className="flex items-center gap-[5px]">
                    <Image src="/assets/icons/light/info-circle.svg" alt="" width={18} height={18} />
                    <p className="typo-body-xsmall w-full">{product.name}</p>
                  </div>
                ) : (
                  <>
                    <p className="typo-body-xsmall w-full">{product.name}</p>
                    <p className="typo-body-xsmall w-full">{product.option}</p>
                  </>
                )}
              </div>
              <p className="typo-body-xsmall-bold w-[116px] text-right text-neutral-10">
                {product.priceText}
              </p>
            </div>
          ))
        )}
      </div>

      <div className={cn('flex w-[200px] border-r border-dashed border-neutral-5 px-[18px]', isHeader ? 'items-center py-[10px]' : 'items-start py-4')}>
        {isHeader ? (
          <p className="typo-body-xsmall-bold w-full text-neutral-10">결제 정보</p>
        ) : (
          <div className="flex w-full flex-col gap-[3px] text-neutral-10">
            <p className="typo-body-xsmall">{paymentInfoTitle}</p>
            <p className="typo-body-xsmall-bold">{paymentAmountText}</p>
          </div>
        )}
      </div>

      <div className={cn('flex w-[140px] border-r border-dashed border-neutral-5 px-[18px]', isHeader ? 'items-center py-[10px]' : 'items-start py-4')}>
        <p className={cn('w-full text-neutral-10', isHeader ? 'typo-body-xsmall-bold' : 'typo-body-xsmall')}>
          {isHeader ? '결제여부' : paymentStatusText}
        </p>
      </div>

      <div className={cn('flex w-[110px] border-r border-dashed border-neutral-5 px-[18px]', isHeader ? 'items-center py-[10px]' : 'items-start py-4')}>
        {isHeader ? (
          <p className="typo-body-xsmall-bold w-full text-neutral-10">수령여부</p>
        ) : (
          <button
            type="button"
            disabled={receiptDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onReceiptClick?.();
            }}
            className={cn(
              'typo-body-xsmall-bold inline-flex h-[26px] w-full items-center justify-center rounded-[4px] text-neutral-2',
              receiptDisabled ? 'cursor-not-allowed opacity-60' : '',
              receiptButtonClass(variant)
            )}
          >
            {resolvedReceiptLabel}
          </button>
        )}
      </div>

      <div
        className={cn(
          'flex w-[145px] px-[18px]',
          isHeader ? 'items-center py-[10px]' : 'items-start py-4',
          isUnreceived ? 'border-r border-dashed border-orange-7' : ''
        )}
      >
        {isHeader ? (
          <p className="typo-body-xsmall-bold w-full text-neutral-10">주문취소</p>
        ) : (
          <button
            type="button"
            disabled={cancelDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onCancelClick?.();
            }}
            className={cn(
              'typo-body-xsmall-bold inline-flex h-[26px] w-full items-center justify-center rounded-[4px] text-neutral-2',
              cancelDisabled ? 'cursor-not-allowed opacity-60' : '',
              cancelButtonClass(variant)
            )}
          >
            {resolvedCancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}
