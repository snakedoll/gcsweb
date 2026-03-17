'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import DateRangeInput from '@/components/ui/admin/product/DateRangeInput';
import TextField from '@/components/ui/common/TextField';

type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1;
type Step2Mode = 'parcel' | 'pickup';

type RegisterRequestDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    request?: {
      type: ProductType;
      receiveMethod: ReceiveMethod;
      goalAmount: number | null;
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

type Step1Draft = {
  type?: ProductType;
  receiveMethod?: ReceiveMethod;
};

function toDateOnly(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

function formatNumber(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

function NumberEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const isFilled = Boolean(digitsOnly(value));
  return (
    <div
      className={`flex h-10 w-[163px] items-center rounded-lg border bg-neutral-2 px-[13px] py-[10px] ${
        isFilled ? 'border-neutral-6' : 'border-neutral-4'
      }`}
    >
      <div className="flex h-5 w-[137px] items-center border-b border-neutral-5">
        <input
          value={value}
          onChange={(e) => onChange(formatNumber(e.target.value))}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          className={`w-[101px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7 ${
            isFilled ? 'text-black' : 'text-neutral-7'
          }`}
        />
        <span className="ml-auto w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
      </div>
    </div>
  );
}

export default function AdminRegisterRequestStep2Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [mode, setMode] = useState<Step2Mode>('parcel');
  const [goalAmount, setGoalAmount] = useState('0');
  const [productionStartDate, setProductionStartDate] = useState('');
  const [productionEndDate, setProductionEndDate] = useState('');
  const [deliveryStartDate, setDeliveryStartDate] = useState('');
  const [deliveryEndDate, setDeliveryEndDate] = useState('');
  const [pickupStartDate, setPickupStartDate] = useState('');
  const [pickupEndDate, setPickupEndDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/product/request/register/${requestId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as RegisterRequestDetailResponse;
        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '등록 요청 정보를 불러오지 못했습니다.');
        }

        const item = json.data?.request;
        if (!item) throw new Error('등록 요청 정보를 찾을 수 없습니다.');
        if (cancelled) return;

        let step1Draft: Step1Draft | null = null;
        if (typeof window !== 'undefined') {
          const step1Raw = window.sessionStorage.getItem(`register-request-step1:${requestId}`);
          if (step1Raw) {
            try {
              step1Draft = JSON.parse(step1Raw) as Step1Draft;
            } catch {
              step1Draft = null;
            }
          }
        }

        const effectiveType = step1Draft?.type ?? item.type;
        const effectiveReceiveMethod = step1Draft?.receiveMethod ?? item.receiveMethod;
        if (effectiveType !== 0) {
          router.replace(`/admin/product/request/register/${requestId}/step-3`);
          return;
        }

        setMode(effectiveReceiveMethod === 1 ? 'pickup' : 'parcel');
        setGoalAmount(formatNumber(String(item.goalAmount ?? 0)) || '0');
        setProductionStartDate(toDateOnly(item.productionStartDate));
        setProductionEndDate(toDateOnly(item.productionEndDate));
        setDeliveryStartDate(toDateOnly(item.deliveryStartDate));
        setDeliveryEndDate(toDateOnly(item.deliveryEndDate));
        setPickupStartDate(toDateOnly(item.pickupStartDate));
        setPickupEndDate(toDateOnly(item.pickupEndDate));
        setPickupLocation(item.pickupLocation ?? '');

        if (typeof window !== 'undefined') {
          const step2Raw = window.sessionStorage.getItem(`register-request-step2:${requestId}`);
          if (step2Raw) {
            try {
              const parsed = JSON.parse(step2Raw) as {
                goalAmount?: string | null;
                productionStartDate?: string | null;
                productionEndDate?: string | null;
                deliveryStartDate?: string | null;
                deliveryEndDate?: string | null;
                pickupStartDate?: string | null;
                pickupEndDate?: string | null;
                pickupLocation?: string | null;
              };

              if (parsed.goalAmount != null) setGoalAmount(parsed.goalAmount);
              if (parsed.productionStartDate != null) setProductionStartDate(parsed.productionStartDate);
              if (parsed.productionEndDate != null) setProductionEndDate(parsed.productionEndDate);
              if (parsed.deliveryStartDate != null) setDeliveryStartDate(parsed.deliveryStartDate);
              if (parsed.deliveryEndDate != null) setDeliveryEndDate(parsed.deliveryEndDate);
              if (parsed.pickupStartDate != null) setPickupStartDate(parsed.pickupStartDate);
              if (parsed.pickupEndDate != null) setPickupEndDate(parsed.pickupEndDate);
              if (parsed.pickupLocation != null) setPickupLocation(parsed.pickupLocation);
            } catch {
              // ignore parse error
            }
          }
        }

        setErrorMessage(null);
      } catch (error: any) {
        if (!cancelled) setErrorMessage(error?.message ?? '등록 요청 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || loading || errorMessage) return;
    window.sessionStorage.setItem(
      `register-request-step2:${requestId}`,
      JSON.stringify({
        goalAmount,
        productionStartDate: mode === 'parcel' ? productionStartDate : null,
        productionEndDate: mode === 'parcel' ? productionEndDate : null,
        deliveryStartDate: mode === 'parcel' ? deliveryStartDate : null,
        deliveryEndDate: mode === 'parcel' ? deliveryEndDate : null,
        pickupStartDate: mode === 'pickup' ? pickupStartDate : null,
        pickupEndDate: mode === 'pickup' ? pickupEndDate : null,
        pickupLocation: mode === 'pickup' ? pickupLocation : null,
      })
    );
  }, [
    requestId,
    loading,
    errorMessage,
    mode,
    goalAmount,
    productionStartDate,
    productionEndDate,
    deliveryStartDate,
    deliveryEndDate,
    pickupStartDate,
    pickupEndDate,
    pickupLocation,
  ]);

  const handleNext = () => {
    router.push(`/admin/product/request/register/${requestId}/step-3`);
  };

  return (
    <div className="relative min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" onBack={() => router.push(`/admin/product/request/register/${requestId}`)} />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="complete" />
              <StepProgress status="current" />
              <StepProgress status="upcoming" />
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center">
              <p className="typo-body-small text-neutral-8">등록 요청 정보를 불러오는 중...</p>
            </div>
          ) : errorMessage ? (
            <div className="px-4 py-8 text-center">
              <p className="typo-body-small text-danger">{errorMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-4">
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">목표 금액</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">목표 금액이 없다면 0원으로 입력해 주세요.</p>
                </div>
                <NumberEditor value={goalAmount} onChange={(next) => setGoalAmount(next || '0')} />
              </div>

              {mode === 'parcel' ? (
                <>
                  <DateRangeInput
                    title="예상 제작 기간"
                    required
                    startLabel="제작 시작일"
                    endLabel="제작 종료일"
                    startValue={productionStartDate}
                    endValue={productionEndDate}
                    onChangeStart={setProductionStartDate}
                    onChangeEnd={setProductionEndDate}
                  />
                  <DateRangeInput
                    title="예상 배송 기간"
                    required
                    startLabel="배송 시작일"
                    endLabel="배송 종료일"
                    startValue={deliveryStartDate}
                    endValue={deliveryEndDate}
                    onChangeStart={setDeliveryStartDate}
                    onChangeEnd={setDeliveryEndDate}
                  />
                </>
              ) : (
                <>
                  <DateRangeInput
                    title="예상 수령 기간"
                    required
                    startLabel="수령 시작일"
                    endLabel="수령 종료일"
                    startValue={pickupStartDate}
                    endValue={pickupEndDate}
                    onChangeStart={setPickupStartDate}
                    onChangeEnd={setPickupEndDate}
                  />

                  <TextField
                    id="register-request-step2-pickup-location"
                    label="수령 장소"
                    showStar
                    placeholder="예) 동국대학교 학술관K127"
                    state={pickupLocation ? 'filled' : 'default'}
                    subtext="미정일 경우, 추후 안내로 입력해 주세요."
                    inputProps={{
                      value: pickupLocation,
                      onChange: (e) => setPickupLocation(e.target.value),
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-start gap-[9px]">
              <button
                type="button"
                onClick={() => router.push(`/admin/product/request/register/${requestId}`)}
                className="flex flex-1 items-center justify-center rounded-lg bg-[#E9DED2] p-4"
              >
                <span className="typo-body-small-bold text-neutral-12">이전</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading || !!errorMessage}
                className="flex flex-1 items-center justify-center rounded-lg bg-orange-5 p-4 disabled:cursor-not-allowed disabled:bg-orange-3"
              >
                <span className="typo-body-small-bold text-neutral-2">다음</span>
              </button>
            </div>
            <p className="typo-body-xsmall text-neutral-8">다음으로 넘어가도 현재 입력 내용은 저장됩니다.</p>
          </div>
        </div>
      </div>

      {showLeaveModal ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[343px] rounded-xl bg-neutral-1 px-7 pb-[23px] pt-10">
            <div className="flex w-[287px] flex-col gap-[30px]">
              <div className="flex w-full flex-col items-center justify-center gap-1">
                <p className="w-[265px] text-center typo-heading-xxsmall text-neutral-12">작성을 취소하시겠습니까?</p>
                <p className="w-[265px] text-center typo-body-xsmall text-neutral-12">지금까지 작성된 글은 저장되지 않습니다.</p>
              </div>
              <div className="flex w-full items-end gap-[14px]">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex h-[47px] flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2"
                >
                  <span className="typo-body-small-bold text-neutral-10">이어서 작성</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveModal(false);
                    router.back();
                  }}
                  className="flex h-[47px] flex-1 items-center justify-center rounded-lg bg-orange-5"
                >
                  <span className="typo-body-small-bold text-neutral-2">나가기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
