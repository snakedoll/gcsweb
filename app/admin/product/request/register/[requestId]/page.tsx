'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import SearchselectDropdown from '@/components/ui/common/SearchselectDropdown';
import TextField from '@/components/ui/common/TextField';
import { cn } from '@/lib/utils';

type ProductType = 0 | 1 | 2;

type RegisterRequestItem = {
  requestId: string;
  teamId: string;
  teamName: string;
  type: ProductType;
  name: string;
  description: string;
};

type RegisterRequestListResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    requests?: RegisterRequestItem[];
  };
};

type FormFieldState = 'default' | 'focus' | 'filled' | 'error';
type TeamDropdownVariant = 'Default' | 'searching' | 'empty';

const TEAM_NAME_MAX = 17;
const PRODUCT_NAME_MAX = 13;
const PRODUCT_DESC_MAX = 17;
const TEAM_OPTIONS = ['염사모', 'MUA', 'HUSH', '그린무브', '커피지구단'];

function ChevronDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="#999694"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbCloseIcon() {
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/35">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M3 3L9 9M9 3L3 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EmptyImageTileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3.3" y="3.3" width="25.4" height="25.4" rx="5" stroke="#2F2824" strokeWidth="2" />
      <path d="M5.5 22.8L12.5 15.8L16.8 20L20.1 16.7L26.5 23" stroke="#2F2824" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.6" cy="10.6" r="2" fill="#2F2824" />
    </svg>
  );
}

function limitCaption(length: number, max: number) {
  return `${length}/${max}`;
}

async function uploadNoticeImage(file: File) {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch('/api/v1/images?usage=PRODUCT_NOTICE', {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.status !== 'success' || !json?.data?.imageUrl) {
    throw new Error(json?.message ?? '상품 정보 고시 이미지 업로드에 실패했습니다.');
  }

  return String(json.data.imageUrl);
}

function NoticeImageField({
  previewUrl,
  uploadedUrl,
  uploading,
  onPickClick,
  onRemove,
}: {
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploading: boolean;
  onPickClick: () => void;
  onRemove: () => void;
}) {
  const imageSrc = previewUrl ?? uploadedUrl;
  const hasImage = Boolean(imageSrc);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <p className="typo-body-small-bold text-neutral-10">상품 정보 고시 이미지</p>
          <span className="typo-body-xsmall-bold text-danger">*</span>
        </div>
        <p className="text-[11px] leading-[1.5] text-neutral-8">상품 정보 이미지는 최대 1장까지 업로드 가능합니다.</p>
      </div>

      <button
        type="button"
        onClick={onPickClick}
        disabled={uploading}
        className="flex h-[45px] w-full items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 px-3"
      >
        <span className="typo-body-xsmall text-neutral-7">Placeholder</span>
        <span className="typo-body-xsmall text-neutral-8">{uploading ? '업로드 중...' : ''}</span>
      </button>

      <div className="h-[100px] w-full">
        {hasImage ? (
          <div className="relative h-[100px] w-[82px] overflow-hidden rounded-lg">
            <Image src={imageSrc!} alt="상품 정보 고시 이미지" fill unoptimized className="object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-1 top-1 inline-flex"
              aria-label="상품 정보 고시 이미지 삭제"
              disabled={uploading}
            >
              <ThumbCloseIcon />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickClick}
            disabled={uploading}
            className="flex h-[100px] w-[82px] flex-col items-center justify-center rounded-lg border border-neutral-4 bg-neutral-2"
            aria-label="상품 정보 고시 이미지 업로드"
          >
            <EmptyImageTileIcon />
            <span className="mt-px text-[10px] leading-[1.5] text-neutral-6">0/1</span>
          </button>
        )}
      </div>
    </div>
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

export default function AdminRegisterRequestStep1PartialPage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [teamQuery, setTeamQuery] = useState('');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'team' | 'name' | 'description' | null>(null);

  const [noticeImgUrl, setNoticeImgUrl] = useState<string | null>(null);
  const [noticePreviewUrl, setNoticePreviewUrl] = useState<string | null>(null);
  const [noticeUploading, setNoticeUploading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState('');

  const teamFieldWrapRef = useRef<HTMLDivElement | null>(null);
  const noticeFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/admin/product/request/register/list', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as RegisterRequestListResponse;

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '등록 요청 정보를 불러오지 못했습니다.');
        }

        const item = (json.data?.requests ?? []).find((row) => row.requestId === requestId);
        if (cancelled) return;

        if (!item) {
          setLoadError('등록 요청 정보를 찾을 수 없습니다.');
          return;
        }

        setTeamName(item.teamName ?? '');
        setProductName(item.name ?? '');
        setProductDescription(item.description ?? '');
        setTeamQuery(item.teamName ?? '');
        setBaselineSnapshot(
          JSON.stringify({
            teamName: item.teamName ?? '',
            productName: item.name ?? '',
            productDescription: item.description ?? '',
            noticeImgUrl: null,
          })
        );
        setLoadError(null);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) setLoadError(error?.message ?? '등록 요청 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!teamFieldWrapRef.current) return;
      if (!teamFieldWrapRef.current.contains(event.target as Node)) {
        setTeamDropdownOpen(false);
        setFocusedField((prev) => (prev === 'team' ? null : prev));
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (noticePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(noticePreviewUrl);
    };
  }, [noticePreviewUrl]);

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        teamName,
        productName,
        productDescription,
        noticeImgUrl,
      }),
    [teamName, productName, productDescription, noticeImgUrl]
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

  const teamError = teamName.length > TEAM_NAME_MAX;
  const nameError = productName.length > PRODUCT_NAME_MAX;
  const descriptionError = productDescription.length > PRODUCT_DESC_MAX;

  const filteredTeamOptions = useMemo(() => {
    const keyword = teamQuery.trim().toLowerCase();
    if (!keyword) return TEAM_OPTIONS;
    return TEAM_OPTIONS.filter((team) => team.toLowerCase().includes(keyword));
  }, [teamQuery]);

  const teamDropdownVariant: TeamDropdownVariant = !teamQuery.trim()
    ? 'Default'
    : filteredTeamOptions.length > 0
      ? 'searching'
      : 'empty';

  const teamTextFieldState: FormFieldState = teamError
    ? 'error'
    : focusedField === 'team'
      ? 'focus'
      : teamName.trim()
        ? 'filled'
        : 'default';
  const nameTextFieldState: FormFieldState = nameError
    ? 'error'
    : focusedField === 'name'
      ? 'focus'
      : productName.trim()
        ? 'filled'
        : 'default';
  const descriptionTextFieldState: FormFieldState = descriptionError
    ? 'error'
    : focusedField === 'description'
      ? 'focus'
      : productDescription.trim()
        ? 'filled'
        : 'default';

  const onChangeNoticeFile = async (file: File | null) => {
    if (!file) return;

    try {
      setNoticeUploading(true);
      const objectUrl = URL.createObjectURL(file);
      setNoticePreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objectUrl;
      });

      const uploadedUrl = await uploadNoticeImage(file);
      setNoticeImgUrl(uploadedUrl);
    } catch (error: any) {
      console.error(error);
      alert(error?.message ?? '상품 정보 고시 이미지 업로드에 실패했습니다.');
      setNoticePreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setNoticeUploading(false);
    }
  };

  const leaveToRegisterList = () => {
    router.push('/admin/product/request/register');
  };

  const handleBackAttempt = () => {
    if (noticeUploading) return;
    if (hasUnsavedChanges) {
      setShowExitModal(true);
      return;
    }
    leaveToRegisterList();
  };

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" onBack={handleBackAttempt} />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="current" />
              <StepProgress status="skipped" />
              <StepProgress status="upcoming" />
            </div>
          </div>

          <div className="px-4">
            {loading ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-neutral-8">등록 요청 정보를 불러오는 중...</p>
              </div>
            ) : loadError ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-danger">{loadError}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div ref={teamFieldWrapRef} className="relative">
                  <TextField
                    id="register-request-team"
                    label="판매팀"
                    showStar
                    state={teamTextFieldState}
                    inputProps={{
                      value: teamName,
                      onFocus: () => {
                        setFocusedField('team');
                        setTeamDropdownOpen(true);
                      },
                      onChange: (e) => {
                        const nextValue = e.target.value;
                        setTeamName(nextValue);
                        setTeamQuery(nextValue);
                        setFocusedField('team');
                        setTeamDropdownOpen(true);
                      },
                    }}
                    rightSlot={<ChevronDownIcon />}
                    caption={limitCaption(teamName.length, TEAM_NAME_MAX)}
                    captionClassName={cn('text-right', teamError ? 'text-danger' : 'text-neutral-8')}
                  />

                  {teamDropdownOpen ? (
                    <div className="absolute left-0 top-[74px] z-10">
                      <SearchselectDropdown
                        className="w-[343px] shadow-[0_2px_8px_rgba(47,40,36,0.08)]"
                        variant={teamDropdownVariant}
                        placeholder="판매팀 검색"
                        query={teamQuery}
                        items={filteredTeamOptions}
                        emptyText="검색 결과가 없습니다."
                        onItemClick={(item) => {
                          setTeamName(item);
                          setTeamQuery(item);
                          setTeamDropdownOpen(false);
                          setFocusedField(null);
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <TextField
                  id="register-request-name"
                  label="상품명"
                  showStar
                  state={nameTextFieldState}
                  inputProps={{
                    value: productName,
                    onFocus: () => setFocusedField('name'),
                    onBlur: () => setFocusedField((prev) => (prev === 'name' ? null : prev)),
                    onChange: (e) => setProductName(e.target.value),
                  }}
                  caption={limitCaption(productName.length, PRODUCT_NAME_MAX)}
                  captionClassName={cn('text-right', nameError ? 'text-danger' : 'text-neutral-8')}
                />

                <TextField
                  id="register-request-description"
                  label="상품 설명"
                  showStar
                  state={descriptionTextFieldState}
                  inputProps={{
                    value: productDescription,
                    onFocus: () => setFocusedField('description'),
                    onBlur: () => setFocusedField((prev) => (prev === 'description' ? null : prev)),
                    onChange: (e) => setProductDescription(e.target.value),
                  }}
                  caption={limitCaption(productDescription.length, PRODUCT_DESC_MAX)}
                  captionClassName={cn('text-right', descriptionError ? 'text-danger' : 'text-neutral-8')}
                />

                <NoticeImageField
                  previewUrl={noticePreviewUrl}
                  uploadedUrl={noticeImgUrl}
                  uploading={noticeUploading}
                  onPickClick={() => noticeFileInputRef.current?.click()}
                  onRemove={() => {
                    setNoticeImgUrl(null);
                    setNoticePreviewUrl((prev) => {
                      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
                      return null;
                    });
                  }}
                />

                <input
                  ref={noticeFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void onChangeNoticeFile(file);
                    e.currentTarget.value = '';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <button
            type="button"
            onClick={() => router.push(`/admin/product/request/register/${requestId}/step-2`)}
            className="flex w-full items-center justify-center rounded-lg bg-orange-5 p-4"
          >
            <span className="typo-body-small-bold text-neutral-2">다음</span>
          </button>
        </div>
      </div>

      {showExitModal ? (
        <ExitConfirmModal onContinue={() => setShowExitModal(false)} onLeave={leaveToRegisterList} />
      ) : null}
    </div>
  );
}
