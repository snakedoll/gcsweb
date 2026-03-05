'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import { cn } from '@/lib/utils';
import StepProgress from '@/components/ui/admin/product/StepProgress';

type ModalType = 'reject' | 'approve' | 'leave' | null;
type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1;

type OptionRow = {
  id: string;
  value: string;
  additionalPrice: string;
};

type OptionCard = {
  id: string;
  name: string;
  rows: OptionRow[];
};

type RegisterRequestDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    request?: {
      requestId: string;
      teamId: string;
      teamName: string;
      name: string;
      description: string;
      type: ProductType;
      receiveMethod: ReceiveMethod;
      price: number;
      goalAmount: number | null;
      salesStartDate: string | null;
      salesEndDate: string | null;
      productionStartDate?: string | null;
      productionEndDate?: string | null;
      deliveryStartDate?: string | null;
      deliveryEndDate?: string | null;
      pickupStartDate?: string | null;
      pickupEndDate?: string | null;
      pickupLocation?: string | null;
      thumbnailUrl?: string;
      detailImageUrls?: string[];
      noticeImgUrl?: string | null;
      options?: Array<{
        id: string;
        name: string;
        values: Array<{ id: string; value: string; additionalPrice: number }>;
      }>;
    };
  };
};

type Step1Draft = {
  teamId?: string;
  teamName?: string;
  name?: string;
  description?: string;
  type?: ProductType;
  receiveMethod?: ReceiveMethod;
  salesStartDate?: string | null;
  salesEndDate?: string | null;
  thumbnailUrl?: string | null;
  detailImageUrls?: string[] | null;
  noticeImgUrl?: string | null;
};

type Step2Draft = {
  goalAmount?: string | null;
  productionStartDate?: string | null;
  productionEndDate?: string | null;
  deliveryStartDate?: string | null;
  deliveryEndDate?: string | null;
  pickupStartDate?: string | null;
  pickupEndDate?: string | null;
  pickupLocation?: string | null;
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

function createOptionRow(seed: string): OptionRow {
  return { id: `row-${seed}`, value: '', additionalPrice: '0' };
}

function createOptionCard(seed: string): OptionCard {
  return { id: `opt-${seed}`, name: '', rows: [createOptionRow(`${seed}-1`)] };
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function ModalToggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-[35px] rounded-full transition-colors', checked ? 'bg-orange-5' : 'bg-neutral-6')}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-neutral-2 transition-all',
          checked ? 'left-[17px]' : 'left-0.5'
        )}
      />
    </button>
  );
}

function ActionModal({
  type,
  isPublic,
  onChangePublic,
  onClose,
  onConfirm,
  loading,
}: {
  type: Exclude<ModalType, null>;
  isPublic: boolean;
  onChangePublic: (next: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (type === 'leave') {
    return (
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
                onClick={onClose}
                disabled={loading}
                className="flex h-[47px] flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2"
              >
                <span className="typo-body-small-bold text-neutral-10">이어서 작성</span>
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex h-[47px] flex-1 items-center justify-center rounded-lg bg-orange-5"
              >
                <span className="typo-body-small-bold text-neutral-2">나가기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
      <div className={cn('w-full max-w-[343px] rounded-xl bg-neutral-1 px-7 pb-6 pt-10', type === 'approve' ? 'h-[183px]' : 'h-[163px]')}>
        <div className={cn('flex h-full flex-col items-center', type === 'approve' ? 'justify-between' : 'justify-end gap-[30px]')}>
          <div className={cn('flex w-full flex-col items-center justify-center', type === 'approve' ? 'gap-[10px]' : '')}>
            <p className="w-[265px] text-center typo-heading-xxsmall text-neutral-12">
              {type === 'reject' ? '상품글 등록 요청을 거부하시겠습니까?' : '상품글을 등록하시겠습니까?'}
            </p>
            {type === 'approve' ? (
              <div className="flex items-center gap-[9px]">
                <span className="typo-body-small text-black">{isPublic ? '공개' : '비공개'}</span>
                <ModalToggle checked={isPublic} onChange={onChangePublic} />
              </div>
            ) : null}
          </div>

          <div className="flex w-full items-end gap-[14px]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-[47px] flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2"
            >
              <span className="typo-body-small-bold text-neutral-10">취소</span>
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex h-[47px] flex-1 items-center justify-center rounded-lg bg-orange-5 disabled:bg-orange-3"
            >
              <span className="typo-body-small-bold text-neutral-2">확인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const isFilled = Boolean(digitsOnly(value));
  return (
    <div
      className={cn(
        'flex h-10 w-[163px] items-center rounded-lg border bg-neutral-2 px-[13px] py-[10px]',
        isFilled ? 'border-neutral-6' : 'border-neutral-4'
      )}
    >
      <div className="flex h-5 w-[137px] items-center border-b border-neutral-5">
        <input
          value={value}
          onChange={(e) => onChange(formatNumber(e.target.value))}
          inputMode="numeric"
          placeholder="0"
          className={cn(
            'w-[101px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
            isFilled ? 'text-black' : 'text-neutral-7'
          )}
        />
        <span className="ml-auto w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
      </div>
    </div>
  );
}

function OptionCardView({
  card,
  index,
  onChangeName,
  onChangeRowValue,
  onChangeRowPrice,
  onRemoveRow,
  onAddRow,
  onRemoveCard,
}: {
  card: OptionCard;
  index: number;
  onChangeName: (next: string) => void;
  onChangeRowValue: (rowId: string, next: string) => void;
  onChangeRowPrice: (rowId: string, next: string) => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow: () => void;
  onRemoveCard: () => void;
}) {
  return (
    <div className="w-full rounded-lg bg-neutral-1 px-[15px] py-[11px]">
      <div className="flex flex-col items-center gap-[14px]">
        <div className="flex w-full flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <p className="typo-heading-xxsmall text-black">{`옵션 ${index + 1}`}</p>
            <button type="button" className="inline-flex h-5 w-5 items-center justify-center" onClick={onRemoveCard} aria-label="옵션 삭제">
              <CloseIcon />
            </button>
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-col gap-1">
              <p className="typo-body-xsmall text-neutral-9">옵션명</p>
              <div className={cn('flex h-10 items-center rounded-lg border bg-neutral-2 px-3', card.name.trim() ? 'border-neutral-6' : 'border-neutral-5')}>
                <input
                  value={card.name}
                  onChange={(e) => onChangeName(e.target.value)}
                  placeholder="예) 프린팅"
                  className={cn(
                    'w-full bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
                    card.name.trim() ? 'text-neutral-12' : 'text-neutral-7'
                  )}
                />
              </div>
            </div>

            {card.rows.map((row) => (
              <div key={row.id} className="flex w-full flex-col gap-1">
                <div className="flex items-center justify-between typo-body-xsmall text-neutral-9">
                  <span>옵션값</span>
                  <span>추가 금액</span>
                </div>
                <div className="flex h-10 items-center rounded-lg border border-neutral-5 bg-neutral-2 py-2 pl-[10px] pr-[5px]">
                  <div className="flex w-[260px] items-center justify-between">
                    <input
                      value={row.value}
                      onChange={(e) => onChangeRowValue(row.id, e.target.value)}
                      placeholder="예) BLACK"
                      className={cn(
                        'w-[111px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
                        row.value.trim() ? 'text-neutral-12' : 'text-neutral-7'
                      )}
                    />
                    <span className="h-5 w-px bg-neutral-5" />
                    <span className="flex w-[111px] items-center border-b border-neutral-5">
                      <input
                        value={row.additionalPrice}
                        onChange={(e) => onChangeRowPrice(row.id, formatNumber(e.target.value))}
                        inputMode="numeric"
                        placeholder="0"
                        className={cn(
                          'w-[101px] bg-transparent typo-body-xsmall outline-none placeholder:text-neutral-7',
                          digitsOnly(row.additionalPrice) ? 'text-neutral-12' : 'text-neutral-7'
                        )}
                      />
                      <span className="w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
                    </span>
                  </div>
                  <button type="button" className="ml-auto inline-flex h-5 w-5 items-center justify-center" onClick={() => onRemoveRow(row.id)} aria-label="옵션값 삭제">
                    <CloseIcon size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="inline-flex h-6 w-6 items-center justify-center" onClick={onAddRow} aria-label="옵션값 추가">
          <PlusPillIcon />
        </button>
      </div>
    </div>
  );
}

export default function AdminRegisterRequestStep3Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [price, setPrice] = useState('0');
  const [cards, setCards] = useState<OptionCard[]>([]);
  const [step1Draft, setStep1Draft] = useState<Step1Draft | null>(null);
  const [step2Draft, setStep2Draft] = useState<Step2Draft | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const step1Raw = window.sessionStorage.getItem(`register-request-step1:${requestId}`);
    const step2Raw = window.sessionStorage.getItem(`register-request-step2:${requestId}`);

    if (step1Raw) {
      try {
        setStep1Draft(JSON.parse(step1Raw));
      } catch {
        setStep1Draft(null);
      }
    }
    if (step2Raw) {
      try {
        setStep2Draft(JSON.parse(step2Raw));
      } catch {
        setStep2Draft(null);
      }
    }
  }, [requestId]);

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

        setPrice(formatNumber(String(item.price ?? 0)));
        setCards(
          (item.options ?? []).map((opt, optIndex) => ({
            id: opt.id || `opt-${optIndex + 1}`,
            name: opt.name,
            rows: (opt.values ?? []).map((value, valueIndex) => ({
              id: value.id || `row-${optIndex + 1}-${valueIndex + 1}`,
              value: value.value,
              additionalPrice: formatNumber(String(value.additionalPrice ?? 0)) || '0',
            })),
          }))
        );

        setStep1Draft((prev) =>
          prev ?? {
            teamId: item.teamId,
            teamName: item.teamName,
            name: item.name,
            description: item.description,
            type: item.type,
            receiveMethod: item.receiveMethod,
            salesStartDate: toDateOnly(item.salesStartDate),
            salesEndDate: toDateOnly(item.salesEndDate),
            thumbnailUrl: item.thumbnailUrl ?? '',
            detailImageUrls: item.detailImageUrls ?? [],
            noticeImgUrl: item.noticeImgUrl ?? null,
          }
        );

        setStep2Draft((prev) => {
          if (prev) return prev;
          if (item.type !== 0) return null;
          return {
            goalAmount: String(item.goalAmount ?? 0),
            productionStartDate: toDateOnly(item.productionStartDate),
            productionEndDate: toDateOnly(item.productionEndDate),
            deliveryStartDate: toDateOnly(item.deliveryStartDate),
            deliveryEndDate: toDateOnly(item.deliveryEndDate),
            pickupStartDate: toDateOnly(item.pickupStartDate),
            pickupEndDate: toDateOnly(item.pickupEndDate),
            pickupLocation: item.pickupLocation ?? null,
          };
        });

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
  }, [requestId]);

  const canAddCard = cards.length < 3;
  const scrollOptionArea = cards.length >= 2;

  const registerEnabled = useMemo(() => {
    const hasPrice = digitsOnly(price).length > 0;
    if (!step1Draft || !hasPrice) return false;

    const commonRequired =
      Boolean(step1Draft.teamId?.trim()) &&
      Boolean(step1Draft.teamName?.trim()) &&
      Boolean(step1Draft.name?.trim()) &&
      Boolean(step1Draft.description?.trim()) &&
      [0, 1, 2].includes(Number(step1Draft.type)) &&
      [0, 1].includes(Number(step1Draft.receiveMethod)) &&
      Boolean(step1Draft.salesStartDate) &&
      Boolean(step1Draft.salesEndDate) &&
      Boolean(step1Draft.thumbnailUrl) &&
      Array.isArray(step1Draft.detailImageUrls) &&
      (step1Draft.detailImageUrls?.length ?? 0) > 0 &&
      Boolean(step1Draft.noticeImgUrl);

    if (!commonRequired) return false;

    if (step1Draft.type !== 0) return true;
    if (!step2Draft) return false;

    const hasGoal = step2Draft.goalAmount != null && digitsOnly(step2Draft.goalAmount).length >= 1;
    if (step1Draft.receiveMethod === 0) {
      return (
        hasGoal &&
        Boolean(step2Draft.productionStartDate) &&
        Boolean(step2Draft.productionEndDate) &&
        Boolean(step2Draft.deliveryStartDate) &&
        Boolean(step2Draft.deliveryEndDate)
      );
    }

    return (
      hasGoal &&
      Boolean(step2Draft.pickupStartDate) &&
      Boolean(step2Draft.pickupEndDate) &&
      Boolean(step2Draft.pickupLocation?.trim())
    );
  }, [price, step1Draft, step2Draft]);

  const handleModalConfirm = async () => {
    if (actionLoading) return;

    if (modalType === 'leave') {
      setModalType(null);
      router.back();
      return;
    }

    if (modalType === 'reject') {
      try {
        setActionLoading(true);
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
        alert(error?.message ?? '거부 처리에 실패했습니다.');
      } finally {
        setActionLoading(false);
        setModalType(null);
      }
      return;
    }

    if (modalType === 'approve') {
      if (!step1Draft) {
        alert('1단계 정보가 없습니다.');
        return;
      }

      const optionsPayload = cards
        .filter((card) => card.name.trim().length > 0)
        .map((card) => ({
          name: card.name.trim(),
          values: card.rows
            .filter((row) => row.value.trim().length > 0)
            .map((row) => ({
              value: row.value.trim(),
              additionalPrice: Number(digitsOnly(row.additionalPrice) || '0'),
            })),
        }));

      const payload: Record<string, unknown> = {
        action: 'approve',
        teamId: step1Draft.teamId,
        name: step1Draft.name,
        description: step1Draft.description,
        type: step1Draft.type,
        receiveMethod: step1Draft.receiveMethod,
        salesStartDate: step1Draft.salesStartDate,
        salesEndDate: step1Draft.salesEndDate,
        thumbnailUrl: step1Draft.thumbnailUrl,
        detailImageUrls: step1Draft.detailImageUrls,
        noticeImgUrl: step1Draft.noticeImgUrl,
        price: Number(digitsOnly(price) || '0'),
        options: optionsPayload,
        isPublic,
      };

      if (step1Draft.type === 0) {
        payload.goalAmount = Number(digitsOnly(step2Draft?.goalAmount ?? '0'));
        if (step1Draft.receiveMethod === 0) {
          payload.productionStartDate = step2Draft?.productionStartDate ?? null;
          payload.productionEndDate = step2Draft?.productionEndDate ?? null;
          payload.deliveryStartDate = step2Draft?.deliveryStartDate ?? null;
          payload.deliveryEndDate = step2Draft?.deliveryEndDate ?? null;
        } else {
          payload.pickupStartDate = step2Draft?.pickupStartDate ?? null;
          payload.pickupEndDate = step2Draft?.pickupEndDate ?? null;
          payload.pickupLocation = step2Draft?.pickupLocation ?? null;
        }
      }

      try {
        setActionLoading(true);
        const res = await fetch(`/api/v1/admin/product/request/register/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.status !== 'success') {
          throw new Error(json?.message ?? '승인 처리에 실패했습니다.');
        }
        router.push(`/admin/product/request/register?toast=${isPublic ? 'approve-public' : 'approve-private'}`);
      } catch (error: any) {
        alert(error?.message ?? '승인 처리에 실패했습니다.');
      } finally {
        setActionLoading(false);
        setModalType(null);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" onBack={() => setModalType('leave')} />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="complete" />
              <StepProgress status={step1Draft?.type === 0 ? 'complete' : 'skipped'} />
              <StepProgress status="current" />
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
            <div className={cn('px-4', scrollOptionArea && 'h-[546px] overflow-y-auto')}>
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">가격</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <PriceEditor value={price} onChange={setPrice} />
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="typo-body-small-bold text-neutral-10">옵션</p>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">옵션 추가는 선택 사항입니다.</p>
                  </div>

                  {cards.map((card, idx) => (
                    <OptionCardView
                      key={card.id}
                      card={card}
                      index={idx}
                      onChangeName={(next) => setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, name: next } : c)))}
                      onChangeRowValue={(rowId, next) =>
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === card.id ? { ...c, rows: c.rows.map((r) => (r.id === rowId ? { ...r, value: next } : r)) } : c
                          )
                        )
                      }
                      onChangeRowPrice={(rowId, next) =>
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === card.id
                              ? { ...c, rows: c.rows.map((r) => (r.id === rowId ? { ...r, additionalPrice: next || '0' } : r)) }
                              : c
                          )
                        )
                      }
                      onRemoveRow={(rowId) =>
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, rows: c.rows.filter((r) => r.id !== rowId) } : c))
                        )
                      }
                      onAddRow={() =>
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === card.id ? { ...c, rows: [...c.rows, createOptionRow(`${card.id}-${c.rows.length + 1}`)] } : c
                          )
                        )
                      }
                      onRemoveCard={() => setCards((prev) => prev.filter((c) => c.id !== card.id))}
                    />
                  ))}

                  {canAddCard ? (
                    <button
                      type="button"
                      onClick={() => setCards((prev) => [...prev, createOptionCard(`${Date.now()}`)])}
                      className="flex h-10 w-full items-center justify-center rounded-lg bg-[#E9DED2]"
                    >
                      <span className="typo-body-xsmall-bold text-neutral-10">옵션 추가</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-start gap-[10px]">
              <button
                type="button"
                onClick={() => {
                  if (step1Draft?.type === 0) {
                    router.push(`/admin/product/request/register/${requestId}/step-2`);
                  } else {
                    router.push(`/admin/product/request/register/${requestId}`);
                  }
                }}
                className="flex h-[55px] w-[37px] items-center justify-center rounded-lg bg-[#E9DED2] text-neutral-12"
                aria-label="이전"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => setModalType('reject')}
                disabled={loading || !!errorMessage || actionLoading}
                className="flex h-[55px] flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2 disabled:cursor-not-allowed disabled:bg-neutral-3"
              >
                <span className="typo-body-small-bold text-neutral-10">거부</span>
              </button>
              <button
                type="button"
                disabled={!registerEnabled || actionLoading || loading || !!errorMessage}
                onClick={() => {
                  if (!registerEnabled) return;
                  setModalType('approve');
                }}
                className={cn(
                  'flex h-[55px] flex-1 items-center justify-center rounded-lg disabled:cursor-not-allowed',
                  registerEnabled ? 'bg-orange-5' : 'bg-orange-3'
                )}
              >
                <span className="typo-body-small-bold text-neutral-2">등록</span>
              </button>
            </div>
            <p className="text-center typo-body-xsmall text-neutral-8">
              상품 정보 고시 이미지를 포함한 필수 정보를
              <br />
              업로드해야 등록 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {modalType ? (
        <ActionModal
          type={modalType}
          isPublic={isPublic}
          onChangePublic={setIsPublic}
          onClose={() => setModalType(null)}
          onConfirm={handleModalConfirm}
          loading={actionLoading}
        />
      ) : null}
    </div>
  );
}
