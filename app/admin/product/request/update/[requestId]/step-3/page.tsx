'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import { cn } from '@/lib/utils';

type ProductType = 0 | 1 | 2;
const MAX_OPTION_CARD_COUNT = 2;

type OptionValue = {
  id: string;
  value: string;
  additionalPrice: number;
};

type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
};

type UpdateRequestDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    request?: {
      requestId: string;
      productId: string | null;
      teamId: string;
      teamName: string;
      name: string;
      description: string;
      type: ProductType;
      price: number;
      goalAmount: number | null;
      options?: OptionGroup[];
    };
  };
};

function formatWon(value: number | null | undefined) {
  const safe = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safe.toLocaleString('ko-KR')}\uC6D0`;
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmColor = 'orange',
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: 'orange' | 'red';
}) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
        <div className="w-full max-w-[343px] rounded-xl bg-white px-7 pb-[23px] pt-10">
          <div className="flex flex-col gap-[30px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="typo-body-small-bold text-neutral-12">{title}</p>
              {description ? (
                <p className="typo-body-xsmall text-neutral-10">{description}</p>
              ) : null}
            </div>
            <div className="flex w-full gap-[14px]">
              <button
                type="button"
                onClick={onCancel}
                className="flex flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-neutral-2 px-4 py-3"
              >
                <span className="typo-body-small-bold text-neutral-10">{cancelLabel}</span>
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  'flex flex-1 items-center justify-center rounded-lg px-4 py-3',
                  confirmColor === 'red' ? 'bg-danger' : 'bg-orange-5'
                )}
              >
                <span className="typo-body-small-bold text-neutral-2">{confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminUpdateRequestStep3Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [options, setOptions] = useState<OptionGroup[]>([]);
  const [productType, setProductType] = useState<ProductType>(0);
  const canAddOptionCard = options.length < MAX_OPTION_CARD_COUNT;

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/product/request/update/${requestId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as UpdateRequestDetailResponse;

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '?섏젙 ?붿껌 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??');
        }

        const item = json.data?.request;
        if (cancelled) return;

        if (!item) {
          setLoadError('?섏젙 ?붿껌 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎.');
          return;
        }

        setProductType(item.type ?? 0);
        setPrice(String(item.price ?? ''));
        setOptions(item.options ?? []);
        setLoadError(null);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) setLoadError(error?.message ?? '?섏젙 ?붿껌 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const handleApproveConfirm = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/admin/product/request/update/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? '?뱀씤 泥섎━???ㅽ뙣?덉뒿?덈떎.');
      }

      router.push('/admin/product/request/update?toast=approve');
    } catch (error: any) {
      alert(error?.message ?? '?뱀씤 泥섎━???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setActionLoading(false);
      setShowApproveModal(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/admin/product/request/update/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? '嫄곕? 泥섎━???ㅽ뙣?덉뒿?덈떎.');
      }

      router.push('/admin/product/request/update?toast=reject');
    } catch (error: any) {
      alert(error?.message ?? '嫄곕? 泥섎━???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="?곹뭹 ?섏젙" />

          {/* 吏꾪뻾諛? Buy Now/Partner Up? 2?④퀎瑜??ㅽ궢??*/}
          <div className="flex items-center justify-center py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="complete" />
              <StepProgress status={loading ? 'upcoming' : (productType === 0 ? 'complete' : 'skipped')} />
              <StepProgress status="current" />
            </div>
          </div>

          <div className="px-4">
            {loading ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-neutral-8">?섏젙 ?붿껌 ?뺣낫瑜?遺덈윭?ㅻ뒗 以?..</p>
              </div>
            ) : loadError ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-danger">{loadError}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* 媛寃?*/}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-12">가격</p>
                    <span className="text-danger">*</span>
                  </div>
                  <div className="relative flex h-10 w-full items-center rounded-lg border border-neutral-6 bg-neutral-1 px-3">
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-transparent text-[13px] text-neutral-12 outline-none"
                    />
                    <span className="ml-1 text-[13px] text-neutral-7">원</span>
                  </div>
                </div>

                {/* ?듭뀡 */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="typo-body-small-bold text-neutral-12">?듭뀡</p>
                    <p className="text-[11px] text-neutral-8 font-normal">?듭뀡 異붽????좏깮 ?ы빆?낅땲??</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {options.map((opt, optIdx) => (
                      <div key={opt.id} className="w-full rounded-xl bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-transparent pb-1">
                            <p className="text-[15px] font-bold text-black">?듭뀡 {optIdx + 1}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setOptions((prev) => prev.filter((_, i) => i !== optIdx));
                              }}
                            >
                              <CloseIconV2 />
                            </button>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <p className="text-[13px] text-neutral-9">옵션명</p>
                            <div className="flex h-10 items-center rounded-lg border border-neutral-5 bg-neutral-2 px-3">
                              <input
                                type="text"
                                value={opt.name}
                                onChange={(e) => {
                                  const next = [...options];
                                  next[optIdx].name = e.target.value;
                                  setOptions(next);
                                }}
                                className="w-full bg-transparent text-[13px] text-neutral-12 outline-none"
                                placeholder="\uC608) \uD504\uB9B0\uD305"
                              />
                            </div>
                          </div>

                          <div className="flex items-center text-[13px] text-neutral-9">
                            <span className="w-1/2">옵션값</span>
                            <span className="w-1/2">異붽? 湲덉븸</span>
                          </div>

                          <div className="flex flex-col gap-2.5">
                            {opt.values.map((v, vIdx) => (
                              <div key={v.id} className="flex h-10 items-center justify-between gap-[5px] rounded-lg border border-neutral-6 bg-neutral-1 px-2.5 py-1.5">
                                <div className="flex flex-1 items-center gap-[10px]">
                                  <input
                                    type="text"
                                    value={v.value}
                                    onChange={(e) => {
                                      const next = [...options];
                                      next[optIdx].values[vIdx].value = e.target.value;
                                      setOptions(next);
                                    }}
                                    className="w-[85px] bg-transparent text-[13px] text-neutral-12 outline-none"
                                    placeholder="BLACK"
                                  />
                                  <div className="h-4 w-[1px] bg-neutral-5" />
                                  <div className="flex flex-1 items-center border-b border-neutral-5">
                                    <input
                                      type="text"
                                      value={v.additionalPrice ? v.additionalPrice.toLocaleString() : ''}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        const next = [...options];
                                        next[optIdx].values[vIdx].additionalPrice = val ? parseInt(val, 10) : 0;
                                        setOptions(next);
                                      }}
                                      className="w-full bg-transparent text-left text-[13px] text-neutral-12 outline-none"
                                      placeholder="0"
                                    />
                                    <span className="ml-1 shrink-0 text-[13px] text-neutral-7">원</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...options];
                                    next[optIdx].values.splice(vIdx, 1);
                                    setOptions(next);
                                  }}
                                  className="shrink-0"
                                >
                                  <CloseIconV3 />
                                </button>
                              </div>
                            ))}
                            
                            <div className="flex justify-center mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...options];
                                  next[optIdx].values.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    value: '',
                                    additionalPrice: 0,
                                  });
                                  setOptions(next);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-7 text-white"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {canAddOptionCard ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOptions((prev) =>
                          prev.length >= MAX_OPTION_CARD_COUNT
                            ? prev
                            : [
                                ...prev,
                                {
                                  id: Math.random().toString(36).substr(2, 9),
                                  name: '',
                                  values: [{ id: Math.random().toString(36).substr(2, 9), value: '', additionalPrice: 0 }],
                                },
                              ]
                        );
                      }}
                      className="mt-6 flex h-[44px] w-full items-center justify-center rounded-lg bg-[#E9DED2] text-[13px] font-bold text-[#3F3835]"
                    >
                      옵션 추가
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-[10px] items-center px-4 pb-[71px] pt-[23px]">
          <button
            type="button"
            onClick={() => {
              if (productType === 0) {
                router.push(`/admin/product/request/update/${requestId}/step-2`);
              } else {
                router.push(`/admin/product/request/update/${requestId}`);
              }
            }}
            className="flex h-[55px] w-[37px] items-center justify-center rounded-lg bg-[#E9DED2]"
            aria-label="?댁쟾"
          >
            <BackArrowIconV2 />
          </button>
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading}
            className="flex h-[55px] flex-1 items-center justify-center rounded-lg border border-neutral-5 bg-white shadow-sm"
          >
            <span className="text-[15px] font-bold text-[#3F3835]">嫄곕?</span>
          </button>
          <button
            type="button"
            onClick={() => setShowApproveModal(true)}
            disabled={actionLoading}
            className="flex h-[55px] flex-1 items-center justify-center rounded-lg bg-orange-5 shadow-sm"
          >
            <span className="text-[15px] font-bold text-white">?뱀씤</span>
          </button>
        </div>
      </div>

      {showApproveModal ? (
        <ConfirmModal
          title="?섏젙 ?붿껌???뱀씤?섏떆寃좎뒿?덇퉴?"
          description="?뱀씤 ???곹뭹 ?뺣낫媛 ?섏젙?⑸땲??"
          confirmLabel="?뺤씤"
          cancelLabel="痍⑥냼"
          onConfirm={handleApproveConfirm}
          onCancel={() => setShowApproveModal(false)}
          confirmColor="orange"
        />
      ) : null}

      {showRejectModal ? (
        <ConfirmModal
          title="?섏젙 ?붿껌??嫄곕??섏떆寃좎뒿?덇퉴?"
          description="嫄곕? ???섏젙 ?붿껌????젣?⑸땲??"
          confirmLabel="?뺤씤"
          cancelLabel="痍⑥냼"
          onConfirm={handleRejectConfirm}
          onCancel={() => setShowRejectModal(false)}
          confirmColor="orange"
        />
      ) : null}
    </div>
  );
}

function CloseIconV2() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7L17 17M17 7L7 17" stroke="#999694" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIconV3() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7L17 17M17 7L7 17" stroke="#C7C5C4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackArrowIconV2() {
  return (
    <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden>
      <path d="M8 1L1 8L8 15" stroke="#3F3835" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
