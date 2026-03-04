'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import { NavBar } from '@/components/layout';
import { cn } from '@/lib/utils';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import PriceInput from '@/components/ui/admin/product/PriceInput';
import TextField from '@/components/ui/common/TextField';

type RegisterRequestDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    request?: {
      receiveMethod?: number;
      goalAmount?: number | null;
      productionStartDate?: string | null;
      productionEndDate?: string | null;
      deliveryStartDate?: string | null;
      deliveryEndDate?: string | null;
      pickupStartDate?: string | null;
      pickupEndDate?: string | null;
      pickupLocation?: string | null;
    };
  };
};

function toYyyyMmDd(val: string | null | undefined): string {
  if (val == null) return '';
  const s = typeof val === 'string' ? val.trim() : '';
  return s.length >= 10 ? s.slice(0, 10) : s;
}

type DeliveryMode = 'parcel' | 'pickup';
type FieldKey = 'goalAmount' | 'pickupLocation' | null;

function parseDateOrNull(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  try {
    const d = parseISO(s.trim() + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

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

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function Step2DateRange({
  title,
  startLabel,
  endLabel,
  value,
  onChange,
}: {
  title: string;
  startLabel: string;
  endLabel: string;
  value: RangeValue;
  onChange: (next: RangeValue) => void;
}) {
  const startDate = parseDateOrNull(value.start);
  const endDate = parseDateOrNull(value.end);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <p className="typo-body-small-bold text-neutral-10">{title}</p>
          <span className="typo-body-xsmall-bold text-danger">*</span>
        </div>
      </div>

      <div className="flex w-full flex-nowrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="h-5 typo-body-xsmall text-neutral-8">{startLabel}</p>
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => {
              const nextStart = date ? format(date, 'yyyy-MM-dd') : '';
              onChange({ ...value, start: nextStart });
              if (endDate && date && endDate < date) {
                onChange({ ...value, start: nextStart, end: nextStart });
              }
            }}
            minDate={TODAY}
            locale={ko}
            dateFormat="yyyy-MM-dd"
            placeholderText="YYYY-MM-DD"
            popperPlacement="bottom-start"
            className={cn(
              'h-10 w-full min-w-0 rounded-lg border bg-neutral-2 px-3 py-2 typo-body-small text-neutral-12',
              'border-neutral-5 focus:border-orange-6 focus:outline-none focus:ring-1 focus:ring-orange-6'
            )}
            calendarClassName="gcs-datepicker-calendar"
          />
        </div>
        <span className="shrink-0 typo-body-xsmall text-neutral-8">부터</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="h-5 typo-body-xsmall text-neutral-8">{endLabel}</p>
          <DatePicker
            selected={endDate}
            onChange={(date: Date | null) => onChange({ ...value, end: date ? format(date, 'yyyy-MM-dd') : '' })}
            minDate={startDate ?? TODAY}
            locale={ko}
            dateFormat="yyyy-MM-dd"
            placeholderText="YYYY-MM-DD"
            popperPlacement="bottom-start"
            className={cn(
              'h-10 w-full min-w-0 rounded-lg border bg-neutral-2 px-3 py-2 typo-body-small text-neutral-12',
              'border-neutral-5 focus:border-orange-6 focus:outline-none focus:ring-1 focus:ring-orange-6'
            )}
            calendarClassName="gcs-datepicker-calendar"
          />
        </div>
        <span className="shrink-0 typo-body-xsmall text-neutral-8">까지</span>
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
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!requestId) return;
      try {
        const res = await fetch(`/api/v1/admin/product/request/register/${requestId}`, {
          cache: 'no-store',
        });
        const json = (await res.json().catch(() => ({}))) as RegisterRequestDetailResponse;
        if (cancelled || !res.ok || json.status !== 'success') return;
        const req = json.data?.request;
        if (!req) return;

        if (req.goalAmount != null && req.goalAmount >= 0) {
          setGoalAmountRaw(String(req.goalAmount));
        }
        setProductionRange({
          start: toYyyyMmDd(req.productionStartDate),
          end: toYyyyMmDd(req.productionEndDate),
        });
        setShippingRange({
          start: toYyyyMmDd(req.deliveryStartDate),
          end: toYyyyMmDd(req.deliveryEndDate),
        });
        setPickupRange({
          start: toYyyyMmDd(req.pickupStartDate),
          end: toYyyyMmDd(req.pickupEndDate),
        });
        setPickupLocation(req.pickupLocation ?? '');
        setInitialDataLoaded(true);
      } catch {
        // ignore; keep form empty or preset values
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    // API로 기존 데이터를 불러왔으면 preset으로 덮어쓰지 않음 (기존 데이터 유지)
    if (initialDataLoaded) return;

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
    } else if (preset !== 'parcel-default') {
      setProductionRange({ start: '', end: '' });
      setShippingRange({ start: '', end: '' });
    }

    if (preset === 'pickup-filled') {
      setPickupRange({ start: '2025-02-25', end: '2025-02-25' });
      setPickupLocation('동국대학교 학술관K127');
    } else if (preset !== 'pickup-default') {
      setPickupRange({ start: '', end: '' });
      setPickupLocation('');
    }

    if (preset === 'parcel-price-focus') setFocusedField('goalAmount');
  }, [preset, initialDataLoaded]);

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

  const showKeyboard = mode === 'parcel' && focusedField === 'goalAmount';

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
                    onChange={setProductionRange}
                  />

                  <Step2DateRange
                    title="예상 배송 기간"
                    startLabel="기간 시작일"
                    endLabel="기간 종료일"
                    value={shippingRange}
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
            onNext={() => router.push(`/admin/product/request/register/${requestId}/step-3`)}
          />
        ) : null}
      </div>

      {showKeyboard ? <MockNumericKeyboard /> : null}
    </div>
  );
}
