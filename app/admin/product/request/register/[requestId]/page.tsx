'use client';

import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import Radiocardgroup from '@/components/ui/admin/product/Radiocardgroup';
import Daterangepicker from '@/components/ui/admin/product/Daterangepicker';
import ProductImage from '@/components/ui/admin/product/Image';
import TextField from '@/components/ui/common/TextField';

type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1;

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
      salesStartDate: string | null;
      salesEndDate: string | null;
      thumbnailUrl?: string;
      detailImageUrls?: string[];
      noticeImgUrl?: string | null;
    };
  };
};

type RegisterRequestItem = NonNullable<RegisterRequestDetailResponse['data']>['request'];

async function uploadNoticeImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  form.append('usage', 'PRODUCT_NOTICE');

  const res = await fetch('/api/v1/images', { method: 'POST', body: form });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { message?: string }).message || '이미지 업로드에 실패했습니다.');
  }

  const data = (await res.json()) as { data?: { imageUrl?: string } };
  const imageUrl = data.data?.imageUrl;
  if (!imageUrl) throw new Error('이미지 URL을 받지 못했습니다.');
  return imageUrl;
}

function toDateOnly(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function NoticeEmptyTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[100px] w-[82px] flex-col items-center justify-center rounded-lg border border-neutral-4 bg-neutral-2"
      aria-label="상품 정보 고시 이미지 업로드"
    >
      <div className="relative h-8 w-8">
        <NextImage src="/assets/icons/light/image.svg" alt="" fill sizes="32px" />
      </div>
      <span className="mt-0.5 text-[10px] leading-[1.5] text-neutral-6">0/1</span>
    </button>
  );
}

function ImageBlock({
  label,
  helper,
  images,
  showAddTile = false,
  onAddClick,
}: {
  label: string;
  helper: string;
  images: string[];
  showAddTile?: boolean;
  onAddClick?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <p className="typo-body-small-bold text-neutral-10">{label}</p>
          <span className="typo-body-xsmall-bold text-danger">*</span>
        </div>
        <p className="text-[11px] leading-[1.5] text-neutral-8">{helper}</p>
      </div>

      <div className="flex w-full gap-[5px] overflow-x-auto">
        {images.map((src, idx) => (
          <ProductImage key={`${src}-${idx}`} property1="Default" src={src} alt={label} />
        ))}
        {showAddTile ? <ProductImage property1="add" onClick={onAddClick} /> : null}
      </div>
    </div>
  );
}

export default function AdminRegisterRequestStep1Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [noticeUploading, setNoticeUploading] = useState(false);

  const [requestData, setRequestData] = useState<RegisterRequestItem | null>(null);
  const [noticePreviewUrl, setNoticePreviewUrl] = useState<string | null>(null);
  const noticeInputRef = useRef<HTMLInputElement | null>(null);

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

        setRequestData(item);
        setNoticePreviewUrl(item.noticeImgUrl ?? null);
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

  const handleNext = () => {
    if (!requestData) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        `register-request-step1:${requestId}`,
        JSON.stringify({
          teamId: requestData.teamId,
          teamName: requestData.teamName,
          name: requestData.name,
          description: requestData.description,
          type: requestData.type,
          receiveMethod: requestData.receiveMethod,
          salesStartDate: toDateOnly(requestData.salesStartDate),
          salesEndDate: toDateOnly(requestData.salesEndDate),
          thumbnailUrl: requestData.thumbnailUrl ?? '',
          detailImageUrls: requestData.detailImageUrls ?? [],
          noticeImgUrl: noticePreviewUrl,
        })
      );
    }

    if (requestData.type === 0) {
      router.push(`/admin/product/request/register/${requestId}/step-2`);
      return;
    }
    router.push(`/admin/product/request/register/${requestId}/step-3`);
  };

  const productTypeIdx = requestData?.type === 0 ? 0 : requestData?.type === 1 ? 1 : 2;
  const receiveMethodIdx = requestData?.receiveMethod === 0 ? 0 : 1;

  return (
    <div className="relative min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" onBack={() => setShowLeaveModal(true)} />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="current" />
              <StepProgress status={requestData && requestData.type !== 0 ? 'skipped' : 'upcoming'} />
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
          ) : requestData ? (
            <div className="flex flex-col gap-5 px-4 pb-2">
              <TextField
                id="register-request-team"
                label="판매팀"
                showStar
                state="filled"
                inputProps={{ value: requestData.teamName, readOnly: true }}
              />

              <TextField
                id="register-request-name"
                label="상품명"
                showStar
                state="filled"
                inputProps={{ value: requestData.name, readOnly: true }}
              />

              <TextField
                id="register-request-description"
                label="상품 설명"
                showStar
                state="filled"
                inputProps={{ value: requestData.description, readOnly: true }}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-10">상품 유형</p>
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </div>
                <Radiocardgroup options={['Fund', 'Buy Now', 'Partner Up']} selectedIndex={productTypeIdx} />
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">수령 방식</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">Buy Now는 현장 수령만 가능합니다.</p>
                </div>
                <Radiocardgroup options={['택배 배송', '현장 수령']} selectedIndex={receiveMethodIdx} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-10">예상 판매 기간</p>
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </div>
                <Daterangepicker
                  start={{
                    label: '판매 시작일',
                    suffix: '부터',
                    value: toDateOnly(requestData.salesStartDate),
                    variant: 'filled',
                  }}
                  end={{
                    label: '판매 종료일',
                    suffix: '까지',
                    value: toDateOnly(requestData.salesEndDate),
                    variant: 'filled',
                  }}
                />
              </div>

              <ImageBlock
                label="썸네일 이미지"
                helper="썸네일 이미지는 최대 1장까지 업로드 가능합니다."
                images={requestData.thumbnailUrl ? [requestData.thumbnailUrl] : []}
              />

              <ImageBlock
                label="상세페이지 이미지"
                helper="여러 장인 경우, 화면에 노출될 순서대로 업로드해 주세요."
                images={requestData.detailImageUrls ?? []}
                showAddTile
              />

              <div className="flex w-full flex-col gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">상품 정보 고시 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">상품 정보 이미지는 최대 1장까지 업로드 가능합니다.</p>
                </div>

                {noticePreviewUrl ? (
                  <ProductImage property1="Default" src={noticePreviewUrl} alt="상품 정보 고시 이미지" onRemove={() => setNoticePreviewUrl(null)} />
                ) : (
                  <NoticeEmptyTile onClick={() => noticeInputRef.current?.click()} />
                )}

                <input
                  ref={noticeInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!file) return;

                    try {
                      setNoticeUploading(true);
                      const uploadedUrl = await uploadNoticeImage(file);
                      setNoticePreviewUrl(uploadedUrl);
                    } catch (error: any) {
                      alert(error?.message ?? '상품 정보 고시 이미지 업로드에 실패했습니다.');
                    } finally {
                      setNoticeUploading(false);
                    }
                  }}
                />
                {noticeUploading ? <p className="typo-body-xsmall text-neutral-8">업로드 중...</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || !!errorMessage || !requestData}
            className="flex w-full items-center justify-center rounded-lg bg-orange-5 p-4 disabled:cursor-not-allowed disabled:bg-orange-3"
          >
            <span className="typo-body-small-bold text-neutral-2">다음</span>
          </button>
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
