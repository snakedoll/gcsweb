import { cn } from '@/lib/utils';
import Item from '@/components/ui/button/Item';

export type BottomSheetVariant = '미선택' | '선택' | '선택중' | '주문 불가';

interface BottomSheetProps {
  className?: string;
  variant?: BottomSheetVariant;
  option1Label?: string;
  option2Label?: string;
  quantity?: number;
  totalPriceText?: string;
}

function MinusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="#C7C5C4" strokeWidth="1.5" />
      <path d="M9 12H15" stroke="#C7C5C4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="#C7C5C4" strokeWidth="1.5" />
      <path d="M9 12H15" stroke="#2F2824" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 9V15" stroke="#2F2824" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DownIcon({ active = false, open = false }: { active?: boolean; open?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden
      className={cn(open && 'rotate-180')}
    >
      <path d="M4.2 6.2L7.5 9.5L10.8 6.2" stroke={active ? '#3F3835' : '#999694'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QtyField({ value }: { value: number }) {
  return (
    <div className="flex h-8 flex-1 items-center justify-center rounded-[8px] border border-neutral-5 bg-neutral-2 px-3">
      <span className="typo-body-xsmall text-neutral-7">{value}</span>
    </div>
  );
}

function SheetField({
  text,
  active,
  open,
}: {
  text: string;
  active?: boolean;
  open?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between rounded border bg-neutral-2 p-3 text-left',
        active ? 'border-orange-5' : 'border-neutral-5'
      )}
    >
      <span className={cn('typo-body-xsmall', active ? 'text-neutral-10' : 'text-neutral-7')}>{text}</span>
      <DownIcon active={active} open={open} />
    </button>
  );
}

export default function BottomSheet({
  className,
  variant = '미선택',
  option1Label = '옵션 1',
  option2Label = '옵션 2',
  quantity = 1,
  totalPriceText = '4,500원',
}: BottomSheetProps) {
  const isSelecting = variant === '선택중';
  const isSelected = variant === '선택';
  const isDisabled = variant === '주문 불가';

  return (
    <div className={cn('w-[375px] overflow-hidden rounded-t-[30px] bg-neutral-3 pb-5', className)}>
      <div className="px-5">
        <div className="flex h-6 items-center justify-center bg-white">
          <span className="h-1 w-11 rounded bg-[#DEDEDE]" />
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <SheetField text={option1Label} active={isSelected} />

            <div className="flex flex-col gap-[5px]">
              <SheetField text={option2Label} active={isSelecting} open={isSelecting} />

              {isSelecting ? (
                <div className="overflow-hidden rounded-[8px] bg-white shadow-[0_0_3px_0_rgba(0,0,0,0.15)]">
                  <Item contents="리스트" className="h-11" />
                  <Item contents="리스트" className="h-11" />
                  <Item contents="리스트" className="h-11" />
                </div>
              ) : null}
            </div>
          </div>

          {!isDisabled ? (
            <div className="flex items-center gap-2">
              <button type="button" aria-label="수량 감소" className="inline-flex h-6 w-6 items-center justify-center">
                <MinusIcon />
              </button>
              <QtyField value={quantity} />
              <button type="button" aria-label="수량 증가" className="inline-flex h-6 w-6 items-center justify-center">
                <PlusIcon />
              </button>
            </div>
          ) : (
            <p className="typo-body-small whitespace-pre-line text-neutral-7">사이트에서 주문이 불가한 상태입니다.{`\n`}현장 직원에게 문의하세요</p>
          )}

          {isSelected ? (
            <>
              <div className="border-t border-dashed border-neutral-5" />
              <div className="flex items-center justify-between typo-body-medium-bold text-neutral-10">
                <span>총 결제금액</span>
                <span>{totalPriceText}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
