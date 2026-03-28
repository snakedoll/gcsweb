import { cn } from '@/lib/utils';
import Dropdown from '@/components/ui/button/Dropdown';
import MinusIconButton from '@/components/ui/common/MinusIconButton';
import PlusIconButton from '@/components/ui/common/PlusIconButton';

export type BottomSheetVariant = '미선택' | '선택중' | '선택' | '주문 불가';

export interface BottomSheetOptionValue {
  value: string;
  additionalPrice?: number | null;
  additionalPriceText?: string | null;
}

export interface BottomSheetOption {
  name: string;
  values: BottomSheetOptionValue[];
}

interface BottomSheetProps {
  className?: string;
  variant?: BottomSheetVariant;
  options?: BottomSheetOption[];
  selectedValues?: Array<string | null>;
  openOptionIndex?: number | null;
  quantity?: number;
  totalPriceText?: string;
  onOptionToggle?: (index: number) => void;
  onOptionSelect?: (optionIndex: number, value: string) => void;
  onQuantityChange?: (next: number) => void;
}

function getOptionSubtext(optionValue: BottomSheetOptionValue): string | undefined {
  if (
    typeof optionValue.additionalPriceText === 'string' &&
    optionValue.additionalPriceText.trim().length > 0
  ) {
    return optionValue.additionalPriceText;
  }

  const additionalPrice = Number(optionValue.additionalPrice ?? 0);
  if (!Number.isFinite(additionalPrice) || additionalPrice <= 0) return undefined;
  return `+${additionalPrice.toLocaleString('ko-KR')}원`;
}

export default function BottomSheet({
  className,
  variant = '미선택',
  options = [],
  selectedValues = [],
  openOptionIndex = null,
  quantity = 1,
  totalPriceText = '0원',
  onOptionToggle,
  onOptionSelect,
  onQuantityChange,
}: BottomSheetProps) {
  const isSelected = variant === '선택';
  const isOrderBlocked = variant === '주문 불가';
  const canDecrease = quantity > 1;

  // Figma default states:
  // - option 2개: 요약 미노출
  // - option 1개/없음: 요약 노출
  const shouldShowSummary = !isOrderBlocked && (isSelected || options.length <= 1);

  return (
    <div className={cn('w-[375px] overflow-hidden rounded-t-[30px] bg-neutral-3 pb-5', className)}>
      <div className="px-5">
        <div className="relative h-6 w-full opacity-40">
          <span className="absolute left-1/2 top-2 h-1 w-11 -translate-x-1/2 rounded bg-[#414141]" />
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {options.length > 0 ? (
            <div className="flex flex-col gap-3">
              {options.map((option, index) => {
                const selected = selectedValues[index] ?? null;
                const hasValue = Boolean(selected);
                const isOpened = openOptionIndex === index;

                return (
                  <div key={`${option.name}-${index}`} className="flex flex-col gap-[5px]">
                    <Dropdown
                      label=""
                      size="l"
                      state={isOpened ? 'open' : hasValue ? 'selected' : 'default'}
                      placeholder={option.name || `옵션 ${index + 1}`}
                      value={selected ?? undefined}
                      items={(option.values ?? []).map((value) => ({
                        label: value.value,
                        value: value.value,
                        subtext: getOptionSubtext(value),
                      }))}
                      open={isOpened}
                      onToggle={() => onOptionToggle?.(index)}
                      onSelect={(value) => onOptionSelect?.(index, value)}
                      className="gap-[5px]"
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {isOrderBlocked ? (
            <p className="typo-body-small whitespace-pre-line text-neutral-7">
              사이트에서 주문이 불가능한 상태입니다.{'\n'}현장 직원에게 문의하세요.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center"
                onClick={() => canDecrease && onQuantityChange?.(quantity - 1)}
                disabled={!canDecrease}
                aria-label="수량 감소"
              >
                <MinusIconButton disabled={!canDecrease} />
              </button>

              <div className="flex h-[30px] w-[22px] items-center justify-center rounded-[8px] border border-neutral-6 bg-neutral-2 px-2 py-1">
                <span className="typo-body-xsmall text-neutral-12">{quantity}</span>
              </div>

              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center"
                onClick={() => onQuantityChange?.(quantity + 1)}
                aria-label="수량 증가"
              >
                <PlusIconButton disabled={false} />
              </button>
            </div>
          )}

          {shouldShowSummary ? (
            <>
              <div className="border-t border-dashed border-neutral-5" />
              <div className="flex items-center justify-between">
                <span className="typo-body-medium-bold text-neutral-10">총 결제금액</span>
                <span className="typo-body-medium-bold text-neutral-10">{totalPriceText}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
