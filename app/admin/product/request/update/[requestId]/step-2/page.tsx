'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';

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
        setProdStart(item.productionStartDate?.split('T')[0] ?? '');
        setProdEnd(item.productionEndDate?.split('T')[0] ?? '');
        setDelivStart(item.deliveryStartDate?.split('T')[0] ?? '');
        setDelivEnd(item.deliveryEndDate?.split('T')[0] ?? '');
        setPickupStart(item.pickupStartDate?.split('T')[0] ?? '');
        setPickupEnd(item.pickupEndDate?.split('T')[0] ?? '');
        setPickupLoc(item.pickupLocation ?? '');

        setLoadError(null);
      } catch (error: any) {
        if (!cancelled) setLoadError(error?.message ?? '오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [requestId, router]);

  const handleNext = () => {
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

          <div className="px-4 flex flex-col gap-6">
            <p className="typo-body-small-bold text-neutral-12">펀딩 및 일정 정보</p>

            {/* 목표 수량 */}
            <div className="flex flex-col gap-2">
              <p className="typo-body-xsmall-bold text-neutral-10 text-[13px]">목표 수량</p>
              <div className="flex h-10 items-center rounded-lg border border-neutral-6 bg-neutral-1 px-3">
                <input
                  type="text"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-transparent text-[13px] text-neutral-12 outline-none"
                  placeholder="예) 100"
                />
                <span className="ml-1 text-[13px] text-neutral-7">개</span>
              </div>
            </div>

            {/* 제작 기간 */}
            <div className="flex flex-col gap-2">
              <p className="typo-body-xsmall-bold text-neutral-10 text-[13px]">제작 기간</p>
              <div className="flex items-center gap-2">
                <input type="date" value={prodStart} onChange={(e) => setProdStart(e.target.value)} className="flex-1 rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" />
                <span className="text-neutral-6">~</span>
                <input type="date" value={prodEnd} onChange={(e) => setProdEnd(e.target.value)} className="flex-1 rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" />
              </div>
            </div>

            {/* 배송 기간 */}
            <div className="flex flex-col gap-2">
              <p className="typo-body-xsmall-bold text-neutral-10 text-[13px]">배송 기간</p>
              <div className="flex items-center gap-2">
                <input type="date" value={delivStart} onChange={(e) => setDelivStart(e.target.value)} className="flex-1 rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" />
                <span className="text-neutral-6">~</span>
                <input type="date" value={delivEnd} onChange={(e) => setDelivEnd(e.target.value)} className="flex-1 rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" />
              </div>
            </div>

            {/* 픽업 기간 */}
            <div className="flex flex-col gap-2">
              <p className="typo-body-xsmall-bold text-neutral-10 text-[13px]">현장 수령 및 픽업 기간</p>
              <div className="flex items-center gap-2">
                <input type="date" value={pickupStart} onChange={(e) => setPickupStart(e.target.value)} className="flex-1 rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" />
                <span className="text-neutral-6">~</span>
                <input type="date" value={pickupEnd} onChange={(e) => setPickupEnd(e.target.value)} className="flex-1 rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" />
              </div>
              <input type="text" value={pickupLoc} onChange={(e) => setPickupLoc(e.target.value)} className="w-full rounded-lg border border-neutral-6 bg-neutral-1 p-2 text-[13px]" placeholder="수령 장소 입력" />
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
