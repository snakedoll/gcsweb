'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import PriceInput from '@/components/ui/admin/product/PriceInput';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import { cn } from '@/lib/utils';

type Step3Preset =
  | 'empty'
  | 'one-option-default'
  | 'two-options'
  | 'required-missing'
  | 'upload-complete';
type ModalPreset = 'none' | 'reject' | 'approve-private' | 'approve-public';

type ApiOptionValue = { id?: string; value: string; additionalPrice: number };
type ApiOption = { id?: string; name: string; values: ApiOptionValue[] };

type RequestDetail = {
  requestId: string;
  productId: string;
  teamId: string;
  teamName: string;
  name: string;
  description: string;
  type: 0 | 1 | 2;
  receiveMethod: 0 | 1;
  price: number;
  goalAmount: number | null;
  salesStartDate: string;
  salesEndDate: string;
  productionStartDate: string | null;
  productionEndDate: string | null;
  deliveryStartDate: string | null;
  deliveryEndDate: string | null;
  pickupStartDate: string | null;
  pickupEndDate: string | null;
  pickupLocation: string | null;
  thumbnailUrl: string;
  detailImageUrls: string[];
  noticeImgUrl: string | null;
  options: ApiOption[];
};

type UiOptionRow = {
  id: string;
  value: string;
  extraPrice: string;
  filled: boolean;
};

type UiOptionCard = {
  id: string;
  title: string;
  name: string;
  nameFilled: boolean;
  rows: UiOptionRow[];
};

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 5L7.5 10L12.5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusPillIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="6" fill="#A9A6A3" />
      <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function formatWon(value: number) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function optionCardsFromApi(options: ApiOption[]): UiOptionCard[] {
  return options.map((opt, idx) => ({
    id: opt.id ?? `opt-${idx + 1}`,
    title: `옵션 ${idx + 1}`,
    name: opt.name || '예) 옵션명',
    nameFilled: Boolean(opt.name),
    rows: (opt.values ?? []).map((v, vIdx) => ({
      id: v.id ?? `row-${idx + 1}-${vIdx + 1}`,
      value: v.value || '예) BLACK',
      extraPrice: formatWon(v.additionalPrice ?? 0),
      filled: Boolean(v.value),
    })),
  }));
}

function buildPresetData(preset: Step3Preset) {
  const rows: UiOptionRow[] = [
    { id: 'r1', value: 'BLACK', extraPrice: '19,800', filled: true },
    { id: 'r2', value: 'WHITE', extraPrice: '19,800', filled: true },
    { id: 'r3', value: 'MINT', extraPrice: '19,800', filled: true },
  ];

  if (preset === 'empty') {
    return { price: 0, options: [] as UiOptionCard[], noticeImgUrl: null as string | null };
  }

  if (preset === 'one-option-default') {
    return {
      price: 19800,
      options: [
        {
          id: 'o1',
          title: '옵션 1',
          name: '예) 옵션명',
          nameFilled: false,
          rows: [{ id: 'r1', value: '예) BLACK', extraPrice: '0', filled: false }],
        },
      ],
      noticeImgUrl: null as string | null,
    };
  }

  if (preset === 'two-options') {
    return {
      price: 19800,
      options: [
        { id: 'o1', title: '옵션 1', name: '색상', nameFilled: true, rows },
        { id: 'o2', title: '옵션 2', name: '예) 옵션명', nameFilled: false, rows: [] },
      ],
      noticeImgUrl: '/uploads/product/notice/mock.jpg',
    };
  }

  if (preset === 'required-missing') {
    return {
      price: 19800,
      options: [{ id: 'o1', title: '옵션 1', name: '색상', nameFilled: true, rows }],
      noticeImgUrl: null as string | null,
    };
  }

  return {
    price: 19800,
    options: [{ id: 'o1', title: '옵션 1', name: '색상', nameFilled: true, rows }],
    noticeImgUrl: '/uploads/product/notice/mock.jpg',
  };
}

function OptionNameField({ value, filled }: { value: string; filled: boolean }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xsmall text-neutral-9">옵션명</p>
      <div
        className={cn(
          'flex h-10 items-center rounded-lg border bg-neutral-2 px-3 py-2',
          filled ? 'border-neutral-6' : 'border-neutral-5'
        )}
      >
        <span className={cn('typo-body-xsmall', filled ? 'text-neutral-12' : 'text-neutral-7')}>{value}</span>
      </div>
    </div>
  );
}

function OptionVariationField({ row }: { row: UiOptionRow }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between typo-body-xsmall text-neutral-9">
        <span>옵션값</span>
        <span>추가 금액</span>
      </div>
      <div
        className={cn(
          'flex h-10 items-center rounded-lg border bg-neutral-2 py-2 pl-[10px] pr-[5px]',
          row.filled ? 'border-neutral-6' : 'border-neutral-5'
        )}
      >
        <div className="flex w-[260px] items-center justify-between">
          <span className={cn('w-[111px] typo-body-xsmall', row.filled ? 'text-neutral-12' : 'text-neutral-7')}>
            {row.value}
          </span>
          <span className="h-5 w-px bg-neutral-5" aria-hidden />
          <span className="flex w-[111px] items-center border-b border-neutral-5 typo-body-xsmall">
            <span className={cn('w-[101px]', row.filled ? 'text-neutral-12' : 'text-neutral-7')}>{row.extraPrice}</span>
            <span className="w-[10px] text-right text-neutral-7">원</span>
          </span>
        </div>
        <button type="button" className="ml-auto inline-flex h-5 w-5 items-center justify-center" aria-label="옵션값 삭제">
          <CloseIcon size={17} />
        </button>
      </div>
    </div>
  );
}

function OptionCard({ option }: { option: UiOptionCard }) {
  return (
    <div className="w-full rounded-lg bg-neutral-1 px-[15px] py-[11px]">
      <div className="flex w-full flex-col items-center gap-[14px]">
        <div className="flex w-full flex-col gap-[14px]">
          <div className="flex w-full items-center justify-between">
            <p className="typo-heading-xxsmall text-black">{option.title}</p>
            <button type="button" className="inline-flex h-5 w-5 items-center justify-center" aria-label="옵션 삭제">
              <CloseIcon />
            </button>
          </div>

          <div className="flex w-full flex-col gap-3">
            <OptionNameField value={option.name} filled={option.nameFilled} />
            {option.rows.map((row) => (
              <OptionVariationField key={row.id} row={row} />
            ))}
          </div>
        </div>

        <button type="button" className="inline-flex h-6 w-6 items-center justify-center" aria-label="옵션값 추가">
          <PlusPillIcon />
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({
  type,
  isPublic,
  onTogglePublic,
  onCancel,
  onConfirm,
  submitting,
}: {
  type: 'approve' | 'reject';
  isPublic: boolean;
  onTogglePublic: (next: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
        <div className="w-full max-w-[343px] rounded-xl bg-white px-7 pb-6 pt-10">
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full flex-col items-center gap-[10px]">
              <p className="text-center typo-body-small-bold text-neutral-12">
                {type === 'reject' ? '상품글 등록 요청을 거부하시겠습니까?' : '상품글을 등록하시겠습니까?'}
              </p>
              {type === 'approve' ? (
                <div className="flex items-center justify-center gap-[9px]">
                  <span className="typo-body-small text-black">{isPublic ? '공개' : '비공개'}</span>
                  <ToggleSwitch checked={isPublic} onChange={onTogglePublic} disabled={submitting} />
                </div>
              ) : null}
            </div>

            <div className="flex w-full gap-[14px]">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="flex flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2 px-4 py-3"
              >
                <span className="typo-body-small-bold text-neutral-10">취소</span>
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="flex flex-1 items-center justify-center rounded-lg bg-orange-5 px-4 py-3 disabled:opacity-70"
              >
                <span className="typo-body-small-bold text-neutral-2">{submitting ? '처리 중...' : '확인'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminRegisterRequestStep3Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const searchParams = useSearchParams();
  const requestId = String(params?.requestId ?? '');

  const viewQuery = searchParams.get('view');
  const modalQuery = (searchParams.get('modal') as ModalPreset | null) ?? 'none';

  const presetViews: Step3Preset[] = [
    'empty',
    'one-option-default',
    'two-options',
    'required-missing',
    'upload-complete',
  ];

  const usePreset = presetViews.includes(viewQuery as Step3Preset);
  const preset = usePreset ? (viewQuery as Step3Preset) : 'empty';

  const [detailLoading, setDetailLoading] = useState(!usePreset);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(null);
  const [priceRaw, setPriceRaw] = useState(0);
  const [optionCards, setOptionCards] = useState<UiOptionCard[]>([]);
  const [noticeImgUrl, setNoticeImgUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (!usePreset) return;

    const data = buildPresetData(preset);
    setPriceRaw(data.price);
    setOptionCards(data.options);
    setNoticeImgUrl(data.noticeImgUrl);
    setIsPublic(modalQuery === 'approve-public');
    setModalType(
      modalQuery === 'reject'
        ? 'reject'
        : modalQuery === 'approve-private' || modalQuery === 'approve-public'
          ? 'approve'
          : null
    );
    setDetailError(null);
    setDetailLoading(false);
  }, [usePreset, preset, modalQuery]);

  useEffect(() => {
    if (usePreset) return;
    let cancelled = false;

    (async () => {
      try {
        setDetailLoading(true);
        const res = await fetch(`/api/v1/admin/product/request/register/${requestId}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.status !== 'success' || !json?.data?.request) {
          throw new Error(json?.message ?? '등록 요청 상세를 불러오지 못했습니다.');
        }

        if (cancelled) return;

        const req = json.data.request as RequestDetail;
        setRequestDetail(req);
        setPriceRaw(Number(req.price ?? 0));
        setOptionCards(optionCardsFromApi(req.options ?? []));
        setNoticeImgUrl(req.noticeImgUrl ?? null);
        setDetailError(null);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) setDetailError(error?.message ?? '등록 요청 상세를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId, usePreset]);

  const priceDisplay = useMemo(() => formatWon(priceRaw), [priceRaw]);
  const showSmallOptionAddButton = optionCards.length >= 2;
  const registerEnabled = Boolean(noticeImgUrl);

  const handleRejectConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/admin/product/request/register/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? '거부 처리에 실패했습니다.');
      }
      alert('등록 요청을 거부했습니다.');
      router.push('/admin/product/request/register');
    } catch (error: any) {
      console.error(error);
      alert(error?.message ?? '거부 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
      setModalType(null);
    }
  };

  const handleApproveConfirm = async () => {
    if (!requestDetail || !noticeImgUrl) return;

    try {
      setSubmitting(true);

      const body = {
        action: 'approve',
        teamId: requestDetail.teamId,
        name: requestDetail.name,
        description: requestDetail.description,
        type: requestDetail.type,
        receiveMethod: requestDetail.receiveMethod,
        salesStartDate: requestDetail.salesStartDate,
        salesEndDate: requestDetail.salesEndDate,
        thumbnailUrl: requestDetail.thumbnailUrl,
        detailImageUrls: requestDetail.detailImageUrls,
        noticeImgUrl,
        goalAmount: requestDetail.goalAmount,
        productionStartDate: requestDetail.productionStartDate,
        productionEndDate: requestDetail.productionEndDate,
        deliveryStartDate: requestDetail.deliveryStartDate,
        deliveryEndDate: requestDetail.deliveryEndDate,
        pickupStartDate: requestDetail.pickupStartDate,
        pickupEndDate: requestDetail.pickupEndDate,
        pickupLocation: requestDetail.pickupLocation,
        price: requestDetail.price,
        options: (requestDetail.options ?? []).map((opt) => ({
          name: opt.name,
          values: (opt.values ?? []).map((v) => ({
            value: v.value,
            additionalPrice: v.additionalPrice,
          })),
        })),
        isPublic,
      };

      const res = await fetch(`/api/v1/admin/product/request/register/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? '등록 승인에 실패했습니다.');
      }

      alert('상품글 등록 요청을 승인했습니다.');
      router.push('/admin/product');
    } catch (error: any) {
      console.error(error);
      alert(error?.message ?? '등록 승인에 실패했습니다.');
    } finally {
      setSubmitting(false);
      setModalType(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="complete" />
              <StepProgress status="complete" />
              <StepProgress status="current" />
            </div>
          </div>

          <div className={cn('px-4', optionCards.length >= 2 ? 'h-[546px] overflow-y-auto' : '')}>
            {detailLoading ? (
              <div className="py-10 text-center">
                <p className="typo-body-small text-neutral-8">등록 요청 상세 로딩 중...</p>
              </div>
            ) : detailError ? (
              <div className="py-10 text-center">
                <p className="typo-body-small text-danger">{detailError}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">가격</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <PriceInput property1={priceRaw ? 'filled' : 'Default'} value={priceDisplay} suffix="원" />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="space-y-1">
                    <p className="typo-body-small-bold text-neutral-10">옵션</p>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">옵션 추가는 선택 사항입니다.</p>
                  </div>

                  {optionCards.map((option) => (
                    <OptionCard key={option.id} option={option} />
                  ))}

                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-center rounded-lg bg-[#E9DED2] text-neutral-10',
                      showSmallOptionAddButton ? 'h-10 typo-body-xsmall-bold' : 'p-4 typo-body-small-bold'
                    )}
                  >
                    옵션 추가
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-start gap-[10px]">
              <button
                type="button"
                onClick={() => router.push(`/admin/product/request/register/${requestId}/step-2`)}
                className="flex h-[52px] w-[38px] items-center justify-center rounded-lg bg-[#E9DED2] text-neutral-12"
                aria-label="이전"
                disabled={submitting}
              >
                <ChevronLeftIcon />
              </button>

              <button
                type="button"
                onClick={() => setModalType('reject')}
                disabled={submitting || detailLoading || !!detailError}
                className="flex h-[52px] flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2"
              >
                <span className="typo-body-small-bold text-neutral-10">거부</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (registerEnabled) setModalType('approve');
                }}
                disabled={submitting || detailLoading || !!detailError || !registerEnabled}
                className={cn(
                  'flex h-[52px] flex-1 items-center justify-center rounded-lg disabled:opacity-100',
                  registerEnabled ? 'bg-orange-5' : 'bg-orange-3'
                )}
              >
                <span className="typo-body-small-bold text-neutral-2">등록</span>
              </button>
            </div>

            <p className="text-center typo-body-xsmall text-neutral-8">
              1단계에서 등록된 상품 정보 고시 이미지를 포함해
              <br />
              필수 정보를 확인한 뒤 등록할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {modalType ? (
        <ConfirmModal
          type={modalType}
          isPublic={isPublic}
          onTogglePublic={setIsPublic}
          onCancel={() => setModalType(null)}
          onConfirm={modalType === 'reject' ? handleRejectConfirm : handleApproveConfirm}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}
