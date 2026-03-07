'use client';

import NextImage from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import TextField from '@/components/ui/common/TextField';
import DateRangeInput from '@/components/ui/admin/product/DateRangeInput';
import { cn } from '@/lib/utils';
import AdminImage from '@/components/ui/admin/product/Image';

type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1;

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
      requestedAt?: string;
    };
  };
};

type LocalImageItem = {
  id: string;
  uploadedUrl: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

function EmptyImageTileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3.3" y="3.3" width="25.4" height="25.4" rx="5" stroke="#2F2824" strokeWidth="2" />
      <path d="M5.5 22.8L12.5 15.8L16.8 20L20.1 16.7L26.5 23" stroke="#2F2824" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.6" cy="10.6" r="2" fill="#2F2824" />
    </svg>
  );
}

function RadioCardGroup({
  label,
  required,
  helperText,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  helperText?: string;
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 leading-[1.5]">
          <p className="typo-body-small-bold text-neutral-12">{label}</p>
          {required ? <span className="typo-body-xsmall-bold text-danger">*</span> : null}
        </div>
        {helperText ? (
          <p className="text-[11px] leading-[1.5] text-neutral-8">{helperText}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-[9px] rounded-lg border border-neutral-4 bg-neutral-2 p-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="flex h-7 items-center gap-2"
            onClick={() => onChange(opt.value)}
          >
            <div className={cn('h-5 w-5 rounded-full border-2',
              value === opt.value ? 'border-orange-5 bg-orange-5' : 'border-neutral-6 bg-neutral-2'
            )}>
              {value === opt.value ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              ) : null}
            </div>
            <span className={cn('typo-body-xsmall', value === opt.value ? 'text-neutral-10' : 'text-neutral-7')}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


export default function AdminUpdateRequestStep1Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productType, setProductType] = useState<ProductType>(0);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>(0);
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');

  const [thumbnailImgUrl, setThumbnailImgUrl] = useState<string | null>(null);
  const [detailImages, setDetailImages] = useState<LocalImageItem[]>([]);
  const [noticeImgUrl, setNoticeImgUrl] = useState<string | null>(null);

  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const noticeFileInputRef = useRef<HTMLInputElement>(null);

  function formatDateValue(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/product/request/update/${requestId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as UpdateRequestDetailResponse;

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '수정 요청 정보를 불러오지 못했습니다.');
        }

        const item = json.data?.request;
        if (cancelled) return;

        if (!item) {
          setLoadError('수정 요청 정보를 찾을 수 없습니다.');
          return;
        }

        setTeamName(item.teamName ?? '');
        setProductName(item.name ?? '');
        setProductDescription(item.description ?? '');
        setProductType(item.type ?? 0);
        setReceiveMethod(item.receiveMethod ?? 0);
        setSalesStartDate(formatDateValue(item.salesStartDate));
        setSalesEndDate(formatDateValue(item.salesEndDate));
        setThumbnailImgUrl(item.thumbnailUrl ?? null);
        setDetailImages(
          (item.detailImageUrls ?? []).map((url, index) => ({
            id: `server-${index}`,
            uploadedUrl: url,
            previewUrl: null,
            uploading: false,
          }))
        );
        setNoticeImgUrl(item.noticeImgUrl ?? null);
        setLoadError(null);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) setLoadError(error?.message ?? '수정 요청 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="상품 수정" onBack={() => router.push('/admin/product')} />

          <div className="flex items-center justify-center py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="current" />
              <StepProgress status={!loading && productType !== 0 ? 'skipped' : 'upcoming'} />
              <StepProgress status="upcoming" />
            </div>
          </div>

          <div className="px-4">
            {loading ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-neutral-8">수정 요청 정보를 불러오는 중...</p>
              </div>
            ) : loadError ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-danger">{loadError}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <TextField
                    id="update-request-team"
                    label="판매팀"
                    showStar
                    state={teamName ? 'filled' : 'default'}
                    inputProps={{
                      value: teamName,
                      onChange: (e) => setTeamName(e.target.value),
                    }}
                  />
                </div>

                <TextField
                  id="update-request-name"
                  label="상품명"
                  showStar
                  state={productName ? 'filled' : 'default'}
                  inputProps={{
                    value: productName,
                    onChange: (e) => setProductName(e.target.value),
                  }}
                />

                <TextField
                  id="update-request-description"
                  label="상품 설명"
                  showStar
                  state={productDescription ? 'filled' : 'default'}
                  inputProps={{
                    value: productDescription,
                    onChange: (e) => setProductDescription(e.target.value),
                  }}
                />

                <RadioCardGroup
                  label="상품 유형"
                  required
                  options={[
                    { value: 0, label: 'Fund' },
                    { value: 1, label: 'Buy Now' },
                    { value: 2, label: 'Partner Up' },
                  ]}
                  value={productType}
                  onChange={(v) => setProductType(v as ProductType)}
                />

                <RadioCardGroup
                  label="수령 방식"
                  required
                  helperText="Buy Now는 현장 수령만 가능합니다."
                  options={[
                    { value: 0, label: '택배 배송' },
                    { value: 1, label: '현장 수령' },
                  ]}
                  value={receiveMethod}
                  onChange={(v) => setReceiveMethod(v as ReceiveMethod)}
                />

                <DateRangeInput
                  title="예상 판매 기간"
                  required
                  startLabel="판매 시작일"
                  endLabel="판매 종료일"
                  startValue={salesStartDate}
                  endValue={salesEndDate}
                  onChangeStart={setSalesStartDate}
                  onChangeEnd={setSalesEndDate}
                />

                {/* 썸네일 이미지 */}
                <div className="flex w-full flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-10">썸네일 이미지</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">썸네일 이미지는 최대 1장까지 업로드 가능합니다.</p>
                  </div>
                  <div className="h-[100px] w-full">
                    {thumbnailImgUrl ? (
                      <AdminImage
                        src={thumbnailImgUrl}
                        onRemove={() => setThumbnailImgUrl(null)}
                      />
                    ) : (
                      <AdminImage
                        property1="empty"
                        countText="0/1"
                        onClick={() => thumbnailFileInputRef.current?.click()}
                      />
                    )}
                  </div>
                </div>

                {/* 상세페이지 이미지 */}
                <div className="flex w-full flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-10">상세페이지 이미지</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">여러 장인 경우, 화면에 노출될 순서대로 업로드해 주세요.</p>
                  </div>
                  <div className="flex min-h-[100px] w-full gap-[5px] overflow-x-auto pb-1">
                    {detailImages.map((item, index) => (
                      <AdminImage
                        key={item.id}
                        src={item.uploadedUrl ?? item.previewUrl}
                        onRemove={() => {
                          setDetailImages((prev) => {
                            const next = [...prev];
                            next.splice(index, 1);
                            return next;
                          });
                        }}
                      />
                    ))}
                    {detailImages.length < 10 && (
                      <AdminImage
                        property1={detailImages.length === 0 ? 'empty' : 'add'}
                        countText={`${detailImages.length}/10`}
                        onClick={() => detailFileInputRef.current?.click()}
                      />
                    )}
                  </div>
                </div>

                {/* 상품 정보 고시 이미지 */}
                <div className="flex w-full flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-10">상품 정보 고시 이미지</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">상품 정보 이미지는 최대 1장까지 업로드 가능합니다.</p>
                  </div>
                  <div className="h-[100px] w-full">
                    {noticeImgUrl ? (
                      <AdminImage
                        src={noticeImgUrl}
                        onRemove={() => setNoticeImgUrl(null)}
                      />
                    ) : (
                      <AdminImage
                        property1="empty"
                        countText="0/1"
                        onClick={() => noticeFileInputRef.current?.click()}
                      />
                    )}
                  </div>
                </div>

                <input
                  ref={thumbnailFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setThumbnailImgUrl(URL.createObjectURL(file));
                  }}
                />

                <input
                  ref={detailFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const newItems = files.map((f) => ({
                      id: Math.random().toString(36).substr(2, 9),
                      uploadedUrl: null,
                      previewUrl: URL.createObjectURL(f),
                      uploading: false,
                    }));
                    setDetailImages((prev) => [...prev, ...newItems]);
                  }}
                />

                <input
                  ref={noticeFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNoticeImgUrl(URL.createObjectURL(file));
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <button
            type="button"
            onClick={() => {
              if (productType === 0) {
                router.push(`/admin/product/request/update/${requestId}/step-2`);
              } else {
                router.push(`/admin/product/request/update/${requestId}/step-3`);
              }
            }}
            className="flex w-full items-center justify-center rounded-lg bg-orange-5 p-4"
          >
            <span className="typo-body-small-bold text-neutral-2">다음</span>
          </button>
        </div>
      </div>
    </div>
  );
}

