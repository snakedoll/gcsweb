'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import { cn } from '@/lib/utils';

type Step3Preset =
  | 'empty'
  | 'one-option-default'
  | 'two-options'
  | 'required-missing'
  | 'upload-complete';
type ModalPreset = 'none' | 'reject' | 'approve-private' | 'approve-public' | 'exit';

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
};

type UiOptionCard = {
  id: string;
  name: string;
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

function digitsOnly(input: string) {
  return input.replace(/[^\d]/g, '');
}

function formatWon(value: number) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function formatNumberInput(input: string) {
  const digits = digitsOnly(input);
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

function createRow(): UiOptionRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    value: '',
    extraPrice: '0',
  };
}

function createOptionCard(): UiOptionCard {
  return {
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    rows: [createRow()],
  };
}

function optionCardsFromApi(options: ApiOption[]): UiOptionCard[] {
  return (options ?? []).map((opt, index) => ({
    id: opt.id ?? `opt-${index + 1}`,
    name: opt.name ?? '',
    rows: (opt.values ?? []).map((v, vIndex) => ({
      id: v.id ?? `row-${index + 1}-${vIndex + 1}`,
      value: v.value ?? '',
      extraPrice: formatWon(v.additionalPrice ?? 0),
    })),
  }));
}

function buildPresetData(preset: Step3Preset) {
  const rows: UiOptionRow[] = [
    { id: 'r1', value: 'BLACK', extraPrice: '19,800' },
    { id: 'r2', value: 'WHITE', extraPrice: '19,800' },
    { id: 'r3', value: 'MINT', extraPrice: '19,800' },
  ];

  if (preset === 'empty') {
    return { priceText: '', options: [] as UiOptionCard[], noticeImgUrl: null as string | null };
  }

  if (preset === 'one-option-default') {
    return {
      priceText: '19,800',
      options: [{ id: 'o1', name: '', rows: [{ id: 'r1', value: '', extraPrice: '0' }] }],
      noticeImgUrl: null as string | null,
    };
  }

  if (preset === 'two-options') {
    return {
      priceText: '19,800',
      options: [
        { id: 'o1', name: '색상', rows },
        { id: 'o2', name: '', rows: [] },
      ],
      noticeImgUrl: '/uploads/product/notice/mock.jpg',
    };
  }

  if (preset === 'required-missing') {
    return {
      priceText: '19,800',
      options: [{ id: 'o1', name: '색상', rows }],
      noticeImgUrl: null as string | null,
    };
  }

  return {
    priceText: '19,800',
    options: [{ id: 'o1', name: '색상', rows }],
    noticeImgUrl: '/uploads/product/notice/mock.jpg',
  };
}

function PriceEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const hasValue = value.trim().length > 0;

  return (
    <div className="flex h-10 w-[163px] items-center rounded-lg border border-neutral-6 bg-neutral-2 px-[13px] py-[10px]">
      <div className="flex h-5 w-[137px] items-center border-b border-neutral-5">
        <input
          value={value}
          onChange={(e) => onChange(formatNumberInput(e.target.value))}
          inputMode="numeric"
          placeholder="0"
          className={cn(
            'w-[101px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
            hasValue ? 'text-black' : 'text-neutral-7'
          )}
        />
        <span className="ml-auto w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
      </div>
    </div>
  );
}

function OptionNameField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const filled = value.trim().length > 0;
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xsmall text-neutral-9">옵션명</p>
      <div
        className={cn(
          'flex h-10 items-center rounded-lg border bg-neutral-2 px-3 py-2',
          filled ? 'border-neutral-6' : 'border-neutral-5'
        )}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="예) 옵션명"
          className={cn(
            'w-full bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
            filled ? 'text-neutral-12' : 'text-neutral-7'
          )}
        />
      </div>
    </div>
  );
}

function OptionVariationField({
  row,
  onChangeValue,
  onChangeExtraPrice,
  onRemove,
}: {
  row: UiOptionRow;
  onChangeValue: (next: string) => void;
  onChangeExtraPrice: (next: string) => void;
  onRemove: () => void;
}) {
  const valueFilled = row.value.trim().length > 0;
  const extraFilled = digitsOnly(row.extraPrice).length > 0;

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between typo-body-xsmall text-neutral-9">
        <span>옵션값</span>
        <span>추가 금액</span>
      </div>

      <div className="flex h-10 items-center rounded-lg border border-neutral-5 bg-neutral-2 py-2 pl-[10px] pr-[5px]">
        <div className="flex w-[260px] items-center justify-between">
          <input
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
            placeholder="예) BLACK"
            className={cn(
              'w-[111px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
              valueFilled ? 'text-neutral-12' : 'text-neutral-7'
            )}
          />

          <span className="h-5 w-px bg-neutral-5" aria-hidden />

          <span className="flex w-[111px] items-center border-b border-neutral-5">
            <input
              value={row.extraPrice}
              onChange={(e) => onChangeExtraPrice(formatNumberInput(e.target.value))}
              inputMode="numeric"
              placeholder="0"
              className={cn(
                'w-[101px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
                extraFilled ? 'text-neutral-12' : 'text-neutral-7'
              )}
            />
            <span className="w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
          </span>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-5 w-5 items-center justify-center"
          aria-label="옵션값 삭제"
          onClick={onRemove}
        >
          <CloseIcon size={17} />
        </button>
      </div>
    </div>
  );
}

function OptionCard({
  option,
  index,
  onChangeName,
  onRemoveCard,
  onAddRow,
  onChangeRowValue,
  onChangeRowExtraPrice,
  onRemoveRow,
}: {
  option: UiOptionCard;
  index: number;
  onChangeName: (next: string) => void;
  onRemoveCard: () => void;
  onAddRow: () => void;
  onChangeRowValue: (rowId: string, next: string) => void;
  onChangeRowExtraPrice: (rowId: string, next: string) => void;
  onRemoveRow: (rowId: string) => void;
}) {
  return (
    <div className="w-full rounded-lg bg-neutral-1 px-[15px] py-[11px]">
      <div className="flex w-full flex-col items-center gap-[14px]">
        <div className="flex w-full flex-col gap-[14px]">
          <div className="flex w-full items-center justify-between">
            <p className="typo-heading-xxsmall text-black">{`옵션 ${index + 1}`}</p>
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center"
              aria-label="옵션 삭제"
              onClick={onRemoveCard}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex w-full flex-col gap-3">
            <OptionNameField value={option.name} onChange={onChangeName} />
            {option.rows.map((row) => (
              <OptionVariationField
                key={row.id}
                row={row}
                onChangeValue={(next) => onChangeRowValue(row.id, next)}
                onChangeExtraPrice={(next) => onChangeRowExtraPrice(row.id, next)}
                onRemove={() => onRemoveRow(row.id)}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center"
          aria-label="옵션값 추가"
          onClick={onAddRow}
        >
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

function ExitConfirmModal({
  onContinue,
  onLeave,
}: {
  onContinue: () => void;
  onLeave: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
        <div className="w-full max-w-[343px] rounded-xl bg-white px-7 pb-[23px] pt-10">
          <div className="flex flex-col gap-[30px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="typo-body-small-bold text-neutral-12">작성을 취소하시겠습니까?</p>
              <p className="typo-body-xsmall text-neutral-10">지금까지 작성한 글은 저장되지 않습니다.</p>
            </div>
            <div className="flex w-full gap-[14px]">
              <button
                type="button"
                onClick={onContinue}
                className="flex flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2 px-4 py-3"
              >
                <span className="typo-body-small-bold text-neutral-10">이어서 작성</span>
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex flex-1 items-center justify-center rounded-lg bg-orange-5 px-4 py-3"
              >
                <span className="typo-body-small-bold text-neutral-2">나가기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function normalizeOptionPayload(optionCards: UiOptionCard[]) {
  const parsed: Array<{ name: string; values: Array<{ value: string; additionalPrice: number }> }> = [];

  for (const option of optionCards) {
    const optionName = option.name.trim();
    const normalizedRows = option.rows.map((row) => ({
      value: row.value.trim(),
      extraDigits: digitsOnly(row.extraPrice),
    }));

    const hasAnyRowInput = normalizedRows.some((row) => row.value || row.extraDigits);
    const hasAnyInput = optionName || hasAnyRowInput;

    if (!hasAnyInput) continue;
    if (!optionName) return { ok: false as const, message: '옵션명은 비워둘 수 없습니다.' };

    const values: Array<{ value: string; additionalPrice: number }> = [];
    for (const row of normalizedRows) {
      const hasRowInput = row.value || row.extraDigits;
      if (!hasRowInput) continue;
      if (!row.value) return { ok: false as const, message: '옵션값은 비워둘 수 없습니다.' };
      values.push({
        value: row.value,
        additionalPrice: row.extraDigits ? Number(row.extraDigits) : 0,
      });
    }

    parsed.push({ name: optionName, values });
  }

  return { ok: true as const, value: parsed };
}

export default function AdminRegisterRequestStep3Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const searchParams = useSearchParams();
  const requestId = String(params?.requestId ?? '');

  const viewQuery = searchParams.get('view');
  const modalQuery = (searchParams.get('modal') as ModalPreset | null) ?? 'none';
  const presetViews: Step3Preset[] = ['empty', 'one-option-default', 'two-options', 'required-missing', 'upload-complete'];
  const usePreset = presetViews.includes(viewQuery as Step3Preset);
  const preset = usePreset ? (viewQuery as Step3Preset) : 'empty';

  const [detailLoading, setDetailLoading] = useState(!usePreset);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [optionCards, setOptionCards] = useState<UiOptionCard[]>([]);
  const [noticeImgUrl, setNoticeImgUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState('');

  useEffect(() => {
    if (!usePreset) return;

    const data = buildPresetData(preset);
    setPriceInput(data.priceText);
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
    setShowExitModal(modalQuery === 'exit');
    setBaselineSnapshot(JSON.stringify({ priceInput: data.priceText, optionCards: data.options }));
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
        const nextPriceInput = formatWon(Number(req.price ?? 0));
        const nextOptions = optionCardsFromApi(req.options ?? []);

        setRequestDetail(req);
        setPriceInput(nextPriceInput);
        setOptionCards(nextOptions);
        setNoticeImgUrl(req.noticeImgUrl ?? null);
        setBaselineSnapshot(JSON.stringify({ priceInput: nextPriceInput, optionCards: nextOptions }));
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

  const currentSnapshot = useMemo(
    () => JSON.stringify({ priceInput, optionCards }),
    [priceInput, optionCards]
  );
  const hasUnsavedChanges = Boolean(baselineSnapshot) && currentSnapshot !== baselineSnapshot;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const showSmallOptionAddButton = optionCards.length >= 2;
  const registerEnabled = Boolean(noticeImgUrl);

  const updateOptionCard = (optionId: string, updater: (prev: UiOptionCard) => UiOptionCard) => {
    setOptionCards((prev) => prev.map((card) => (card.id === optionId ? updater(card) : card)));
  };

  const leaveStep3 = () => {
    router.push(`/admin/product/request/register/${requestId}/step-2`);
  };

  const handleBackAttempt = () => {
    if (submitting) return;
    if (hasUnsavedChanges) {
      setShowExitModal(true);
      return;
    }
    leaveStep3();
  };

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
      router.push('/admin/product/request/register?toast=reject');
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

    const priceDigits = digitsOnly(priceInput);
    const price = priceDigits ? Number(priceDigits) : 0;
    if (!Number.isInteger(price) || price < 0) {
      alert('가격 형식을 확인해주세요.');
      return;
    }

    const normalizedOptions = normalizeOptionPayload(optionCards);
    if (!normalizedOptions.ok) {
      alert(normalizedOptions.message);
      return;
    }

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
        price,
        options: normalizedOptions.value,
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

      router.push(`/admin/product/request/register?toast=${isPublic ? 'approve-public' : 'approve-private'}`);
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
          <NavBar variant="title-back" title="새 상품 등록" onBack={handleBackAttempt} />

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
                  <PriceEditor value={priceInput} onChange={setPriceInput} />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="space-y-1">
                    <p className="typo-body-small-bold text-neutral-10">옵션</p>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">옵션 추가는 선택 사항입니다.</p>
                  </div>

                  {optionCards.map((option, index) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      index={index}
                      onChangeName={(next) => updateOptionCard(option.id, (prev) => ({ ...prev, name: next }))}
                      onRemoveCard={() => setOptionCards((prev) => prev.filter((card) => card.id !== option.id))}
                      onAddRow={() =>
                        updateOptionCard(option.id, (prev) => ({ ...prev, rows: [...prev.rows, createRow()] }))
                      }
                      onChangeRowValue={(rowId, next) =>
                        updateOptionCard(option.id, (prev) => ({
                          ...prev,
                          rows: prev.rows.map((row) => (row.id === rowId ? { ...row, value: next } : row)),
                        }))
                      }
                      onChangeRowExtraPrice={(rowId, next) =>
                        updateOptionCard(option.id, (prev) => ({
                          ...prev,
                          rows: prev.rows.map((row) => (row.id === rowId ? { ...row, extraPrice: next || '0' } : row)),
                        }))
                      }
                      onRemoveRow={(rowId) =>
                        updateOptionCard(option.id, (prev) => ({
                          ...prev,
                          rows: prev.rows.filter((row) => row.id !== rowId),
                        }))
                      }
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => setOptionCards((prev) => [...prev, createOptionCard()])}
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
                onClick={handleBackAttempt}
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

      {showExitModal ? (
        <ExitConfirmModal onContinue={() => setShowExitModal(false)} onLeave={leaveStep3} />
      ) : null}
    </div>
  );
}
