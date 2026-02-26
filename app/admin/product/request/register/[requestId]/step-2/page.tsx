'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import { cn } from '@/lib/utils';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import PriceInput from '@/components/ui/admin/product/PriceInput';
import DaterangepickerVariation, {
  type DaterangepickerVariationVariant,
} from '@/components/ui/admin/product/DaterangepickerVariation';
import TextField from '@/components/ui/common/TextField';

type DeliveryMode = 'parcel' | 'pickup';
type FieldKey =
  | 'goalAmount'
  | 'productionStart'
  | 'productionEnd'
  | 'shippingStart'
  | 'shippingEnd'
  | 'pickupStart'
  | 'pickupEnd'
  | 'pickupLocation'
  | null;

type Step2Preset =
  | 'parcel-default'
  | 'parcel-price-focus'
  | 'parcel-date-focus'
  | 'parcel-filled'
  | 'pickup-default'
  | 'pickup-filled';

type RangeValue = { start: string; end: string };

const DEFAULT_PRESET_BY_MODE: Record<DeliveryMode, Step2Preset> = {
  parcel: 'parcel-default',
  pickup: 'pickup-default',
};

function onlyNumeric(value: string) {
  return value.replace(/\D/g, '');
}

function formatPriceDisplay(raw: string) {
  const digits = onlyNumeric(raw);
  if (!digits) return '0';
  return Number(digits).toLocaleString('ko-KR');
}

function Step2DateRange({
  title,
  startLabel,
  endLabel,
  value,
  focusedField,
  setFocusedField,
  onChange,
}: {
  title: string;
  startLabel: string;
  endLabel: string;
  value: RangeValue;
  focusedField: FieldKey;
  setFocusedField: Dispatch<SetStateAction<FieldKey>>;
  onChange: (next: RangeValue) => void;
}) {
  const isStartFocused = focusedField === (title.includes('제작') ? 'productionStart' : title.includes('배송') ? 'shippingStart' : 'pickupStart');
  const isEndFocused = focusedField === (title.includes('제작') ? 'productionEnd' : title.includes('배송') ? 'shippingEnd' : 'pickupEnd');

  const startKey: FieldKey = title.includes('제작')
    ? 'productionStart'
    : title.includes('배송')
      ? 'shippingStart'
      : 'pickupStart';
  const endKey: FieldKey = title.includes('제작')
    ? 'productionEnd'
    : title.includes('배송')
      ? 'shippingEnd'
      : 'pickupEnd';

  const getVariant = (text: string, isFocused: boolean): DaterangepickerVariationVariant => {
    if (isFocused) return 'focused';
    if (text.trim()) return 'filled';
    return 'Default';
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <p className="typo-body-small-bold text-neutral-10">{title}</p>
          <span className="typo-body-xsmall-bold text-danger">*</span>
        </div>
      </div>

      <div className="flex h-16 w-full items-center justify-between">
        <div className="flex h-full w-[158px] flex-col gap-1">
          <p className="h-5 typo-body-xsmall text-neutral-8">{startLabel}</p>
          <div className="flex items-center gap-[7px]">
            <div className="relative">
              <DaterangepickerVariation
                property1={getVariant(value.start, isStartFocused)}
                value={value.start || undefined}
              />
              <input
                aria-label={`${title} 시작일`}
                value={value.start}
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                className="absolute inset-0 h-10 w-[125px] rounded-lg opacity-0"
                onFocus={() => setFocusedField(startKey)}
                onBlur={() => setFocusedField((prev) => (prev === startKey ? null : prev))}
                onChange={(e) => onChange({ ...value, start: e.target.value })}
              />
            </div>
            <span className="typo-heading-xxsmall text-neutral-13">부터</span>
          </div>
        </div>

        <div className="flex h-full w-[158px] flex-col gap-1">
          <p className="h-5 typo-body-xsmall text-neutral-8">{endLabel}</p>
          <div className="flex items-center gap-[7px]">
            <div className="relative">
              <DaterangepickerVariation
                property1={getVariant(value.end, isEndFocused)}
                value={value.end || undefined}
              />
              <input
                aria-label={`${title} 종료일`}
                value={value.end}
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                className="absolute inset-0 h-10 w-[125px] rounded-lg opacity-0"
                onFocus={() => setFocusedField(endKey)}
                onBlur={() => setFocusedField((prev) => (prev === endKey ? null : prev))}
                onChange={(e) => onChange({ ...value, end: e.target.value })}
              />
            </div>
            <span className="typo-heading-xxsmall text-neutral-13">까지</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomActions({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="px-4 pb-8 pt-[17px]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex w-full items-start gap-[9px]">
          <button
            type="button"
            onClick={onPrev}
            className="flex flex-1 items-center justify-center rounded-lg bg-[#E9DED2] p-4"
          >
            <span className="typo-body-small-bold text-neutral-12">이전</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex flex-1 items-center justify-center rounded-lg bg-orange-3 p-4"
          >
            <span className="typo-body-small-bold text-neutral-2">다음</span>
          </button>
        </div>
        <p className="typo-body-xsmall text-neutral-8">다음으로 넘어가도 현재의 내용은 저장됩니다.</p>
      </div>
    </div>
  );
}

function MockNumericKeyboard() {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[375px] bg-[#D2D3D8] px-[6px] pt-2">
      <div className="space-y-[7px] pb-[7px]">
        {rows.map((row) => (
          <div key={row.join('')} className="grid grid-cols-3 gap-[6px]">
            {row.map((key) => (
              <div key={key} className="flex h-[46px] items-center justify-center rounded-[5px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.3)]">
                <span className="text-[26px] leading-[26px] text-black">{key}</span>
              </div>
            ))}
          </div>
        ))}

        <div className="grid grid-cols-3 gap-[6px]">
          <div className="flex h-[46px] items-center justify-center">
            <span className="text-[26px] leading-[26px] text-black">+ * #</span>
          </div>
          <div className="flex h-[46px] items-center justify-center rounded-[5px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.3)]">
            <span className="text-[26px] leading-[26px] text-black">0</span>
          </div>
          <div className="flex h-[46px] items-center justify-center">
            <span className="text-[22px] leading-[22px] text-black">⌫</span>
          </div>
        </div>
      </div>
      <div className="flex h-[71px] items-end justify-center pb-2">
        <div className="h-[5px] w-[138px] rounded-[100px] bg-black" />
      </div>
    </div>
  );
}

export default function AdminRegisterRequestStep2Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const searchParams = useSearchParams();
  const requestId = String(params?.requestId ?? '');

  const modeFromQuery = searchParams.get('mode');
  const presetFromQuery = searchParams.get('view') as Step2Preset | null;
  const mode: DeliveryMode = modeFromQuery === 'pickup' ? 'pickup' : 'parcel';
  const preset = presetFromQuery ?? DEFAULT_PRESET_BY_MODE[mode];

  const [goalAmountRaw, setGoalAmountRaw] = useState('');
  const [productionRange, setProductionRange] = useState<RangeValue>({ start: '', end: '' });
  const [shippingRange, setShippingRange] = useState<RangeValue>({ start: '', end: '' });
  const [pickupRange, setPickupRange] = useState<RangeValue>({ start: '', end: '' });
  const [pickupLocation, setPickupLocation] = useState('');
  const [focusedField, setFocusedField] = useState<FieldKey>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFocusedField(null);

    if (preset === 'parcel-default' || preset === 'pickup-default') {
      setGoalAmountRaw('');
    }
    if (preset === 'parcel-filled' || preset === 'parcel-date-focus') {
      setGoalAmountRaw('19800');
    }
    if (preset === 'parcel-price-focus') {
      setGoalAmountRaw('1980');
    }
    if (preset === 'pickup-filled') {
      setGoalAmountRaw('19800');
    }

    if (preset === 'parcel-filled') {
      setProductionRange({ start: '2025-02-25', end: '2025-02-25' });
      setShippingRange({ start: '2025-02-25', end: '2025-02-25' });
    } else if (preset === 'parcel-date-focus') {
      setProductionRange({ start: '20', end: '' });
      setShippingRange({ start: '', end: '' });
    } else {
      setProductionRange({ start: '', end: '' });
      setShippingRange({ start: '', end: '' });
    }

    if (preset === 'pickup-filled') {
      setPickupRange({ start: '2025-02-25', end: '2025-02-25' });
      setPickupLocation('동국대학교 학술관K127');
    } else {
      setPickupRange({ start: '', end: '' });
      setPickupLocation('');
    }

    if (preset === 'parcel-price-focus') setFocusedField('goalAmount');
    if (preset === 'parcel-date-focus') setFocusedField('productionStart');
  }, [preset]);

  useEffect(() => {
    if (focusedField === 'goalAmount') {
      priceInputRef.current?.focus();
    }
  }, [focusedField]);

  const goalAmountDisplay = useMemo(() => formatPriceDisplay(goalAmountRaw), [goalAmountRaw]);
  const goalAmountVariant: 'Default' | 'focus' | 'filled' =
    focusedField === 'goalAmount' ? 'focus' : goalAmountRaw ? 'filled' : 'Default';

  const pickupLocationState =
    focusedField === 'pickupLocation' ? 'focus' : pickupLocation.trim() ? 'filled' : 'default';

  const showKeyboard =
    mode === 'parcel' &&
    (focusedField === 'goalAmount' ||
      focusedField === 'productionStart' ||
      focusedField === 'productionEnd' ||
      focusedField === 'shippingStart' ||
      focusedField === 'shippingEnd');

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="complete" />
              <StepProgress status="current" />
              <StepProgress status="upcoming" />
            </div>
          </div>

          <div className={cn('px-4', showKeyboard ? 'pb-[8px]' : '')}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">목표 금액</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">
                    목표 금액이 없다면 0원으로 입력해주세요.
                  </p>
                </div>

                <div
                  className="relative w-fit"
                  onMouseDown={() => setFocusedField('goalAmount')}
                  onTouchStart={() => setFocusedField('goalAmount')}
                >
                  <PriceInput property1={goalAmountVariant} value={goalAmountDisplay} suffix="원" />
                  <input
                    ref={priceInputRef}
                    aria-label="목표 금액"
                    inputMode="numeric"
                    value={goalAmountRaw}
                    className="absolute inset-0 h-10 w-[163px] rounded-lg opacity-0"
                    onFocus={() => setFocusedField('goalAmount')}
                    onBlur={() => setFocusedField((prev) => (prev === 'goalAmount' ? null : prev))}
                    onChange={(e) => setGoalAmountRaw(onlyNumeric(e.target.value))}
                  />
                </div>
              </div>

              {mode === 'parcel' ? (
                <>
                  <Step2DateRange
                    title="예상 제작 기간"
                    startLabel="기간 시작일"
                    endLabel="기간 종료일"
                    value={productionRange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    onChange={setProductionRange}
                  />

                  <Step2DateRange
                    title="예상 배송 기간"
                    startLabel="기간 시작일"
                    endLabel="기간 종료일"
                    value={shippingRange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    onChange={setShippingRange}
                  />
                </>
              ) : (
                <>
                  <Step2DateRange
                    title="예상 수령 기간"
                    startLabel="기간 시작일"
                    endLabel="기간 종료일"
                    value={pickupRange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    onChange={setPickupRange}
                  />

                  <TextField
                    id="register-request-step2-pickup-location"
                    label="수령 장소"
                    showStar
                    state={pickupLocationState}
                    subtext='미정인 경우, “미정”으로 입력해 주세요.'
                    placeholder="예) 동국대학교 학술관K127"
                    inputProps={{
                      value: pickupLocation,
                      onFocus: () => setFocusedField('pickupLocation'),
                      onBlur: () => setFocusedField((prev) => (prev === 'pickupLocation' ? null : prev)),
                      onChange: (e) => setPickupLocation(e.target.value),
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {!showKeyboard ? (
          <BottomActions
            onPrev={() => router.back()}
            onNext={() => router.push(`/admin/product/request/register/${requestId}`)}
          />
        ) : null}
      </div>

      {showKeyboard ? <MockNumericKeyboard /> : null}
    </div>
  );
}
