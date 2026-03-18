'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import DateRangeInput from '@/components/ui/admin/product/DateRangeInput';
import TextField from '@/components/ui/common/TextField';

type ProductType = 0 | 1 | 2;

type UpdateRequestDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    request?: {
      type: ProductType;
      goalAmount: number | null;
      productionStartDate: string | null;
      productionEndDate: string | null;
      deliveryStartDate: string | null;
      deliveryEndDate: string | null;
      pickupStartDate: string | null;
      pickupEndDate: string | null;
      pickupLocation: string | null;
    };
  };
};

type Step2Draft = {
  goalAmount: string;
  productionStartDate: string;
  productionEndDate: string;
  deliveryStartDate: string;
  deliveryEndDate: string;
  pickupStartDate: string;
  pickupEndDate: string;
  pickupLocation: string;
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

export default function AdminUpdateRequestStep2Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>(0);
  
  // Funding Info Fields
  const [goalAmount, setGoalAmount] = useState('');
  const [prodStart, setProdStart] = useState('');
  const [prodEnd, setProdEnd] = useState('');
  const [delivStart, setDelivStart] = useState('');
  const [delivEnd, setDelivEnd] = useState('');
  const [pickupStart, setPickupStart] = useState('');
  const [pickupEnd, setPickupEnd] = useState('');
  const [pickupLoc, setPickupLoc] = useState('');
  const step2DraftKey = `admin:update-request:${requestId}:step2`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/product/request/update/${requestId}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '정보를 불러오지 못했습니다.');
        }

        const item = json.data?.request;
        if (cancelled) return;

        if (!item) {
          setLoadError('정보를 찾을 수 없습니다.');
          return;
        }

        setProductType(item.type ?? 0);
        
        // 만약 펀딩 기반이 아닌 상품(부이노우/파트너업)이면 이 단계는 건너뛰어야 함
        if (item.type !== 0) {
          router.replace(`/admin/product/request/update/${requestId}/step-3`);
          return;
        }

        setGoalAmount(String(item.goalAmount ?? ''));
        setProdStart(toDateOnly(item.productionStartDate));
        setProdEnd(toDateOnly(item.productionEndDate));
        setDelivStart(toDateOnly(item.deliveryStartDate));
        setDelivEnd(toDateOnly(item.deliveryEndDate));
        setPickupStart(toDateOnly(item.pickupStartDate));
        setPickupEnd(toDateOnly(item.pickupEndDate));
        setPickupLoc(item.pickupLocation ?? '');

        if (typeof window !== 'undefined') {
          const raw = sessionStorage.getItem(step2DraftKey);
          if (raw) {
            try {
              const draft = JSON.parse(raw) as Partial<Step2Draft>;
              if (typeof draft.goalAmount === 'string') setGoalAmount(draft.goalAmount);
              if (typeof draft.productionStartDate === 'string') setProdStart(draft.productionStartDate);
              if (typeof draft.productionEndDate === 'string') setProdEnd(draft.productionEndDate);
              if (typeof draft.deliveryStartDate === 'string') setDelivStart(draft.deliveryStartDate);
              if (typeof draft.deliveryEndDate === 'string') setDelivEnd(draft.deliveryEndDate);
              if (typeof draft.pickupStartDate === 'string') setPickupStart(draft.pickupStartDate);
              if (typeof draft.pickupEndDate === 'string') setPickupEnd(draft.pickupEndDate);
              if (typeof draft.pickupLocation === 'string') setPickupLoc(draft.pickupLocation);
            } catch {
              sessionStorage.removeItem(step2DraftKey);
            }
          }
        }

        setLoadError(null);
      } catch (error: any) {
        if (!cancelled) setLoadError(error?.message ?? '오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [requestId, router, step2DraftKey]);

  const handleNext = () => {
    if (typeof window !== 'undefined') {
      const draft: Step2Draft = {
        goalAmount,
        productionStartDate: prodStart,
        productionEndDate: prodEnd,
        deliveryStartDate: delivStart,
        deliveryEndDate: delivEnd,
        pickupStartDate: pickupStart,
        pickupEndDate: pickupEnd,
        pickupLocation: pickupLoc,
      };
      sessionStorage.setItem(step2DraftKey, JSON.stringify(draft));
    }
    router.push(`/admin/product/request/update/${requestId}/step-3`);
  };

  if (loading) return null; // 건너뛰기 처리 중일 수 있으므로 로딩 중에는 표시하지 않음

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="상품 수정" />

          <div className="flex items-center justify-center py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="complete" />
              <StepProgress status="current" />
              <StepProgress status="upcoming" />
            </div>
          </div>

          <div className="px-4 flex flex-col gap-6 pb-4">
            <p className="typo-body-small-bold text-neutral-12">펀딩 및 일정 정보</p>

            {/* 목표 금액/수량 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <p className="typo-body-small-bold text-neutral-10 text-[13px]">목표 금액/수량</p>
                <span className="typo-body-xsmall-bold text-danger">*</span>
              </div>
              <p className="text-[11px] leading-[1.5] text-neutral-8">목표 금액이 없다면 0원으로 입력해 주세요.</p>
              <div className="flex h-10 w-[163px] items-center rounded-lg border border-neutral-6 bg-neutral-1 px-3">
                <input
                  type="text"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-transparent typo-body-xsmall text-neutral-12 outline-none"
                  placeholder="0"
                />
                <span className="ml-1 typo-body-xsmall text-neutral-7">원</span>
              </div>
            </div>

            {/* 예상 제작 기간 */}
            <DateRangeInput
              title="예상 제작 기간"
              required
              startLabel="제작 시작일"
              endLabel="제작 종료일"
              startValue={prodStart}
              endValue={prodEnd}
              onChangeStart={setProdStart}
              onChangeEnd={setProdEnd}
            />

            {/* 예상 배송 기간 */}
            <DateRangeInput
              title="예상 배송 기간"
              required
              startLabel="배송 시작일"
              endLabel="배송 종료일"
              startValue={delivStart}
              endValue={delivEnd}
              onChangeStart={setDelivStart}
              onChangeEnd={setDelivEnd}
            />

            {/* 예상 수령 기간 */}
            <div className="flex flex-col gap-5">
              <DateRangeInput
                title="예상 수령 기간"
                required
                startLabel="수령 시작일"
                endLabel="수령 종료일"
                startValue={pickupStart}
                endValue={pickupEnd}
                onChangeStart={setPickupStart}
                onChangeEnd={setPickupEnd}
              />

              <TextField
                id="update-request-pickup-location"
                label="수령 장소"
                showStar
                state={pickupLoc ? 'filled' : 'default'}
                subtext="미정일 경우, 추후 안내로 입력해 주세요."
                inputProps={{
                  value: pickupLoc,
                  onChange: (e) => setPickupLoc(e.target.value),
                }}
              />
            </div>
          </div>
        </div>


        <div className="flex gap-[10px] items-center px-4 pb-[71px] pt-[23px]">
          <button
            type="button"
            onClick={() => router.push(`/admin/product/request/update/${requestId}`)}
            className="flex h-[55px] w-[37px] items-center justify-center rounded-lg bg-[#E9DED2]"
            aria-label="이전"
          >
            <BackArrowIconV2 />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex h-[55px] flex-1 items-center justify-center rounded-lg bg-orange-5"
          >
            <span className="text-[15px] font-bold text-white">다음</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BackArrowIconV2() {
  return (
    <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden>
      <path d="M8 1L1 8L8 15" stroke="#3F3835" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
