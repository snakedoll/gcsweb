'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { shift } from '@floating-ui/react-dom';
import DateRangeInput from '@/components/ui/admin/product/DateRangeInput';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import Radiocardgroup from '@/components/ui/admin/product/Radiocardgroup';
import ProductImage from '@/components/ui/admin/product/Image';
import SearchselectDropdown from '@/components/ui/common/SearchselectDropdown';
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

type TeamListResponse = {
  status: 'success' | 'error';
  data?: {
    teams?: Array<{ id: string; teamName: string }>;
  };
};

type Step1Draft = {
  teamId: string;
  teamName: string;
  name: string;
  description: string;
  type: ProductType;
  receiveMethod: ReceiveMethod;
  salesStartDate: string;
  salesEndDate: string;
  thumbnailUrl: string;
  detailImageUrls: string[];
  noticeImgUrl: string | null;
};

const PRODUCT_NAME_MAX_LENGTH = 13;
const TEAM_NAME_MAX_LENGTH = 17;
const PRODUCT_DESCRIPTION_MAX_LENGTH = 17;
const DETAIL_IMAGE_MAX_COUNT = 10;

function toDateOnly(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseOrNull(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  try {
    const date = parseISO(`${dateStr}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

async function uploadProductImage(file: File, usage: 'PRODUCT_THUMBNAIL' | 'PRODUCT_DETAIL' | 'PRODUCT_NOTICE') {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`/api/v1/images?usage=${usage}`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; data?: { imageUrl?: string } };

  if (!res.ok) {
    throw new Error(json.message ?? '이미지 업로드에 실패했습니다.');
  }
  const imageUrl = json.data?.imageUrl;
  if (!imageUrl) {
    throw new Error('이미지 URL을 받지 못했습니다.');
  }
  return imageUrl;
}

export default function AdminRegisterRequestStep1Page() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [step1Draft, setStep1Draft] = useState<Step1Draft | null>(null);

  const [teamOptions, setTeamOptions] = useState<Array<{ id: string; teamName: string }>>([]);
  const [teamQuery, setTeamQuery] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement | null>(null);

  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [detailUploading, setDetailUploading] = useState(false);
  const [noticeUploading, setNoticeUploading] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const detailInputRef = useRef<HTMLInputElement | null>(null);
  const noticeInputRef = useRef<HTMLInputElement | null>(null);

  const teamOverLimit = (teamQuery.length ?? 0) > TEAM_NAME_MAX_LENGTH;
  const nameOverLimit = (step1Draft?.name.length ?? 0) > PRODUCT_NAME_MAX_LENGTH;
  const descriptionOverLimit = (step1Draft?.description.length ?? 0) > PRODUCT_DESCRIPTION_MAX_LENGTH;
  const hasLengthError = teamOverLimit || nameOverLimit || descriptionOverLimit;

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
        if (!item) {
          throw new Error('등록 요청 정보를 찾을 수 없습니다.');
        }
        if (cancelled) return;

        let nextDraft: Step1Draft = {
          teamId: item.teamId,
          teamName: item.teamName ?? '',
          name: item.name ?? '',
          description: item.description ?? '',
          type: item.type,
          receiveMethod: item.receiveMethod,
          salesStartDate: toDateOnly(item.salesStartDate),
          salesEndDate: toDateOnly(item.salesEndDate),
          thumbnailUrl: item.thumbnailUrl ?? '',
          detailImageUrls: item.detailImageUrls ?? [],
          noticeImgUrl: item.noticeImgUrl ?? null,
        };

        if (typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem(`register-request-step1:${requestId}`);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as Partial<Step1Draft>;
              nextDraft = {
                ...nextDraft,
                ...parsed,
                detailImageUrls: Array.isArray(parsed.detailImageUrls)
                  ? parsed.detailImageUrls.filter((v): v is string => typeof v === 'string' && v.length > 0)
                  : nextDraft.detailImageUrls,
              };
            } catch {
              // ignore parse error
            }
          }
        }

        setStep1Draft(nextDraft);
        setTeamQuery(nextDraft.teamName);
        setErrorMessage(null);
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error?.message ?? '등록 요청 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !step1Draft) return;
    window.sessionStorage.setItem(`register-request-step1:${requestId}`, JSON.stringify(step1Draft));
  }, [requestId, step1Draft]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!teamDropdownRef.current) return;
      if (!teamDropdownRef.current.contains(event.target as Node)) {
        setShowTeamDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!showTeamDropdown) return;
    let cancelled = false;

    (async () => {
      try {
        const keyword = teamQuery.trim();
        const query = keyword ? `?name=${encodeURIComponent(keyword)}` : '';
        const res = await fetch(`/api/v1/admin/teams${query}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as TeamListResponse;
        if (!res.ok || json.status !== 'success') {
          throw new Error('판매팀 목록을 불러오지 못했습니다.');
        }
        if (cancelled) return;
        setTeamOptions((json.data?.teams ?? []).map((team) => ({ id: team.id, teamName: team.teamName })));
      } catch {
        if (!cancelled) setTeamOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showTeamDropdown, teamQuery]);

  const teamDropdownItems = useMemo(() => teamOptions.map((team) => team.teamName), [teamOptions]);

  const updateDraft = (patch: Partial<Step1Draft>) => {
    setStep1Draft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  };

  const handleTypeChange = (index: number) => {
    const nextType: ProductType = index === 0 ? 0 : index === 1 ? 1 : 2;
    if (nextType === 1) {
      // Buy Now is pickup-only by design.
      updateDraft({ type: nextType, receiveMethod: 1 });
      return;
    }
    updateDraft({ type: nextType });
  };

  const handleReceiveMethodChange = (index: number) => {
    const nextMethod: ReceiveMethod = index === 0 ? 0 : 1;
    updateDraft({ receiveMethod: nextMethod });
  };

  const handleSelectTeam = (teamName: string) => {
    const found = teamOptions.find((team) => team.teamName === teamName);
    if (!found) return;
    updateDraft({ teamId: found.id, teamName: found.teamName });
    setTeamQuery(found.teamName);
    setShowTeamDropdown(false);
  };

  const handleUploadThumbnail = async (file: File) => {
    try {
      setThumbnailUploading(true);
      const uploaded = await uploadProductImage(file, 'PRODUCT_THUMBNAIL');
      updateDraft({ thumbnailUrl: uploaded });
    } catch (error: any) {
      alert(error?.message ?? '썸네일 이미지 업로드에 실패했습니다.');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleUploadDetails = async (files: FileList) => {
    const remains = Math.max(0, DETAIL_IMAGE_MAX_COUNT - (step1Draft?.detailImageUrls.length ?? 0));
    const targetFiles = Array.from(files).slice(0, remains);
    if (targetFiles.length === 0) return;

    try {
      setDetailUploading(true);
      const uploaded = await Promise.all(targetFiles.map((file) => uploadProductImage(file, 'PRODUCT_DETAIL')));
      setStep1Draft((prev) => {
        if (!prev) return prev;
        return { ...prev, detailImageUrls: [...prev.detailImageUrls, ...uploaded] };
      });
    } catch (error: any) {
      alert(error?.message ?? '상세 이미지 업로드에 실패했습니다.');
    } finally {
      setDetailUploading(false);
    }
  };

  const handleUploadNotice = async (file: File) => {
    try {
      setNoticeUploading(true);
      const uploaded = await uploadProductImage(file, 'PRODUCT_NOTICE');
      updateDraft({ noticeImgUrl: uploaded });
    } catch (error: any) {
      alert(error?.message ?? '상품 고시 이미지 업로드에 실패했습니다.');
    } finally {
      setNoticeUploading(false);
    }
  };

  const handleNext = () => {
    if (!step1Draft || hasLengthError) return;

    if (step1Draft.type === 0) {
      router.push(`/admin/product/request/register/${requestId}/step-2`);
      return;
    }
    router.push(`/admin/product/request/register/${requestId}/step-3`);
  };

  const salesStartDate = step1Draft?.salesStartDate ? parseOrNull(step1Draft.salesStartDate) : null;
  const salesEndDate = step1Draft?.salesEndDate ? parseOrNull(step1Draft.salesEndDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="relative min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" onBack={() => setShowLeaveModal(true)} />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="current" />
              <StepProgress status={step1Draft && step1Draft.type !== 0 ? 'skipped' : 'upcoming'} />
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
          ) : step1Draft ? (
            <div className="flex flex-col gap-5 px-4 pb-2">
              <div className="relative" ref={teamDropdownRef}>
                <TextField
                  id="register-request-team"
                  label="판매팀"
                  showStar
                  placeholder="판매팀을 입력하세요."
                  state={teamOverLimit ? 'error' : step1Draft.teamName ? 'filled' : 'default'}
                  helperText={teamOverLimit ? '글자수는 17자 이내로 작성해주세요' : undefined}
                  inputProps={{
                    value: teamQuery,
                    onFocus: () => setShowTeamDropdown(true),
                    onChange: (e) => {
                      setTeamQuery(e.target.value);
                      updateDraft({ teamId: '', teamName: e.target.value });
                      setShowTeamDropdown(true);
                    },
                  }}
                />
                {showTeamDropdown ? (
                  <div className="absolute left-0 top-[74px] z-10">
                    <SearchselectDropdown
                      variant={teamDropdownItems.length ? 'Default' : 'empty'}
                      items={teamDropdownItems}
                      onItemClick={handleSelectTeam}
                    />
                  </div>
                ) : null}
              </div>

              <TextField
                id="register-request-name"
                label="상품명"
                showStar
                placeholder=" 예) ECO 북극곰 컵홀더"
                state={nameOverLimit ? 'error' : step1Draft.name ? 'filled' : 'default'}
                helperText={nameOverLimit ? '글자수는 13자 이내로 작성해주세요' : undefined}
                inputProps={{
                  value: step1Draft.name,
                  maxLength: PRODUCT_NAME_MAX_LENGTH,
                  onChange: (e) => updateDraft({ name: e.target.value }),
                }}
              />

              <TextField
                id="register-request-description"
                label="상품 설명"
                showStar
                placeholder="예) 커피 들고 지구 편 들기"
                state={descriptionOverLimit ? 'error' : step1Draft.description ? 'filled' : 'default'}
                helperText={descriptionOverLimit ? '글자수는 17자 이내로 작성해주세요' : undefined}
                inputProps={{
                  value: step1Draft.description,
                  maxLength: PRODUCT_DESCRIPTION_MAX_LENGTH,
                  onChange: (e) => updateDraft({ description: e.target.value }),
                }}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-10">상품 유형</p>
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </div>
                <Radiocardgroup
                  options={['Fund', 'Buy Now', 'Partner Up']}
                  selectedIndex={step1Draft.type === 0 ? 0 : step1Draft.type === 1 ? 1 : 2}
                  onSelect={handleTypeChange}
                />
              </div>

              {step1Draft.type === 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">수령 방식</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <Radiocardgroup
                    options={['택배 배송', '현장 수령']}
                    selectedIndex={step1Draft.receiveMethod === 0 ? 0 : 1}
                    onSelect={handleReceiveMethodChange}
                  />
                </div>
              ) : step1Draft.type === 1 ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-10">수령 방식</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">Buy Now는 현장 수령만 가능합니다.</p>
                  </div>
                  <Radiocardgroup
                    options={['택배 배송', '현장 수령']}
                    selectedIndex={1}
                    optionStatuses={['disabled', 'default']}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-10">수령 방식</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-neutral-8">Partner Up은 수령 방식 선택이 불가능 합니다.</p>
                  </div>
                  <Radiocardgroup
                    options={['택배 배송', '현장 수령']}
                    selectedIndex={null}
                    optionStatuses={['disabled', 'disabled']}
                  />
                </div>
              )}

              <DateRangeInput
                title="예상 판매 기간"
                required
                startLabel="판매 시작일"
                endLabel="판매 종료일"
                startValue={step1Draft.salesStartDate}
                endValue={step1Draft.salesEndDate}
                onChangeStart={(v) => updateDraft({ salesStartDate: v })}
                onChangeEnd={(v) => updateDraft({ salesEndDate: v })}
              />

              <div className="flex w-full flex-col gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">썸네일 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">썸네일 이미지는 최대 1장까지 업로드 가능합니다.</p>
                </div>
                <div className="flex w-full gap-[5px] overflow-x-auto">
                  {step1Draft.thumbnailUrl ? (
                    <ProductImage property1="Default" src={step1Draft.thumbnailUrl} alt="썸네일" onRemove={() => updateDraft({ thumbnailUrl: '' })} />
                  ) : (
                    <ProductImage property1="empty" countText="0/1" onClick={() => thumbnailInputRef.current?.click()} />
                  )}
                </div>
                {thumbnailUploading ? <p className="typo-body-xsmall text-neutral-8">업로드 중...</p> : null}
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!file) return;
                    handleUploadThumbnail(file);
                  }}
                />
              </div>

              <div className="flex w-full flex-col gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">상세페이지 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">여러 장인 경우, 화면에 노출될 순서대로 업로드해 주세요.</p>
                </div>
                <div className="flex w-full gap-[5px] overflow-x-auto">
                  {step1Draft.detailImageUrls.map((src, index) => (
                    <ProductImage
                      key={`${src}-${index}`}
                      property1="Default"
                      src={src}
                      alt="상세 이미지"
                      onRemove={() =>
                        setStep1Draft((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            detailImageUrls: prev.detailImageUrls.filter((_, i) => i !== index),
                          };
                        })
                      }
                    />
                  ))}
                  {(step1Draft.detailImageUrls.length ?? 0) < DETAIL_IMAGE_MAX_COUNT ? (
                    <ProductImage
                      property1={step1Draft.detailImageUrls.length === 0 ? 'empty' : 'add'}
                      countText={`${step1Draft.detailImageUrls.length}/${DETAIL_IMAGE_MAX_COUNT}`}
                      onClick={() => detailInputRef.current?.click()}
                    />
                  ) : null}
                </div>
                {detailUploading ? <p className="typo-body-xsmall text-neutral-8">업로드 중...</p> : null}
                <input
                  ref={detailInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.currentTarget.files;
                    e.currentTarget.value = '';
                    if (!files || files.length === 0) return;
                    handleUploadDetails(files);
                  }}
                />
              </div>

              <div className="flex w-full flex-col gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">상품 정보 고시 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">상품 정보 고시 이미지는 최대 1장까지 업로드 가능합니다.</p>
                </div>
                <div className="flex w-full gap-[5px] overflow-x-auto">
                  {step1Draft.noticeImgUrl ? (
                    <ProductImage property1="Default" src={step1Draft.noticeImgUrl} alt="고시 이미지" onRemove={() => updateDraft({ noticeImgUrl: null })} />
                  ) : (
                    <ProductImage property1="empty" countText="0/1" onClick={() => noticeInputRef.current?.click()} />
                  )}
                </div>
                {noticeUploading ? <p className="typo-body-xsmall text-neutral-8">업로드 중...</p> : null}
                <input
                  ref={noticeInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!file) return;
                    handleUploadNotice(file);
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || !!errorMessage || !step1Draft || hasLengthError}
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
