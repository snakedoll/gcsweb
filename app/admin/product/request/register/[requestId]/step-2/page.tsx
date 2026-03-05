'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import PriceInput from '@/components/ui/admin/product/PriceInput';
import Daterangepicker from '@/components/ui/admin/product/Daterangepicker';
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

function toDateOnly(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function Step2DateField({
  title,
  startLabel,
  endLabel,
  startValue,
  endValue,
}: {
  title: string;
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <p className="typo-body-small-bold text-neutral-10">{title}</p>
        <span className="typo-body-xsmall-bold text-danger">*</span>
      </div>
      <Daterangepicker
        start={{
          label: startLabel,
          suffix: '부터',
          value: startValue,
          variant: 'filled',
        }}
        end={{
          label: endLabel,
          suffix: '까지',
          value: endValue,
          variant: 'filled',
        }}
      />
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

        if (item.type !== 0) {
          router.replace(`/admin/product/request/register/${requestId}/step-3`);
          return;
        }

        setMode(item.receiveMethod === 1 ? 'pickup' : 'parcel');
        setGoalAmount(String(item.goalAmount ?? 0));
        setProductionStartDate(toDateOnly(item.productionStartDate));
        setProductionEndDate(toDateOnly(item.productionEndDate));
        setDeliveryStartDate(toDateOnly(item.deliveryStartDate));
        setDeliveryEndDate(toDateOnly(item.deliveryEndDate));
        setPickupStartDate(toDateOnly(item.pickupStartDate));
        setPickupEndDate(toDateOnly(item.pickupEndDate));
        setPickupLocation(item.pickupLocation ?? '');
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

  const handleNext = () => {
    if (typeof window !== 'undefined') {
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
    }
    router.push(`/admin/product/request/register/${requestId}/step-3`);
  };

  return (
    <div className="relative min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" onBack={() => setShowLeaveModal(true)} />

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
                  <p className="text-[11px] leading-[1.5] text-neutral-8">목표 금액이 없다면 0원으로 입력해주세요.</p>
                </div>
                <PriceInput property1="filled" value={goalAmount} suffix="원" />
              </div>

              {mode === 'parcel' ? (
                <>
                  <Step2DateField
                    title="예상 제작 기간"
                    startLabel="제작 시작일"
                    endLabel="제작 종료일"
                    startValue={productionStartDate}
                    endValue={productionEndDate}
                  />
                  <Step2DateField
                    title="예상 배송 기간"
                    startLabel="배송 시작일"
                    endLabel="배송 종료일"
                    startValue={deliveryStartDate}
                    endValue={deliveryEndDate}
                  />
                </>
              ) : (
                <>
                  <Step2DateField
                    title="예상 수령 기간"
                    startLabel="수령 시작일"
                    endLabel="수령 종료일"
                    startValue={pickupStartDate}
                    endValue={pickupEndDate}
                  />

                  <TextField
                    id="register-request-step2-pickup-location"
                    label="수령 장소"
                    showStar
                    state={pickupLocation ? 'filled' : 'default'}
                    subtext='미정인 경우, “미정”으로 입력해 주세요.'
                    inputProps={{
                      value: pickupLocation,
                      readOnly: true,
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
                onClick={() => router.back()}
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
            <p className="typo-body-xsmall text-neutral-8">다음으로 넘어가도 현재의 내용은 저장됩니다.</p>
          </div>
        </div>
      </div>

      {showLeaveModal ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[343px] rounded-xl bg-neutral-1 px-7 pb-[23px] pt-10">
            <div className="flex w-[287px] flex-col gap-[30px]">
              <div className="flex w-full flex-col items-center justify-center gap-1">
                <p className="w-[265px] text-center typo-heading-xxsmall text-neutral-12">작성을 취소하시겠습니까?</p>
                <p className="w-[265px] text-center typo-body-xsmall text-neutral-12">지금까지 작성한 글은 저장되지 않습니다.</p>
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
