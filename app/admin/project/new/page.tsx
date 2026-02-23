'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Button from '@/components/ui/button/Button';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import { cn } from '@/lib/utils';

type OpenMenu = 'none' | 'team' | 'year' | 'category';
type ConfirmModal = 'none' | 'leave' | 'submit';

type Option = {
  label: string;
  value: string;
};

type UploadKind = 'thumbnail' | 'detail';

type UploadState = {
  file: File | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploading: boolean;
};

function PlusSmallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 4.5V15.5" stroke="#999694" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M4.5 10H15.5" stroke="#999694" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="27" height="27" rx="6" stroke="#8A8582" strokeWidth="2" />
      <circle cx="22.2" cy="10.4" r="2.3" fill="#8A8582" />
      <path d="M6.8 23.2L13.2 16.5L17.3 20.2L20 17.4L25.2 23.2" stroke="#8A8582" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FieldLabel({ label, required = true }: { label: string; required?: boolean }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <span className="typo-body-small-bold text-neutral-10">{label}</span>
      {required ? <span className="typo-body-xsmall-bold text-danger">*</span> : null}
    </div>
  );
}

function BaseFieldShell({
  children,
  active = false,
  filled = false,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  filled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg border bg-neutral-2 px-3',
        active || filled ? 'border-neutral-6' : 'border-neutral-5',
        className
      )}
    >
      {children}
    </div>
  );
}

function TitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <FieldLabel label="제목" />
      <BaseFieldShell filled={Boolean(value)}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="예)  조용하게 지구를 지키는 방법"
          className="w-full bg-transparent typo-body-xsmall text-neutral-12 placeholder:text-neutral-7 outline-none"
        />
      </BaseFieldShell>
    </div>
  );
}

function TagPill({ text }: { text: string }) {
  return <span className="inline-flex items-center rounded-lg bg-neutral-4 px-2 py-0.5 typo-body-xsmall text-neutral-10">{text}</span>;
}

function SelectField({
  label,
  placeholder,
  value,
  open,
  onToggle,
  showAsTag = false,
}: {
  label: string;
  placeholder: string;
  value?: string;
  open?: boolean;
  onToggle: () => void;
  showAsTag?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <button type="button" onClick={onToggle} className="w-full text-left">
        <BaseFieldShell active={open} filled={Boolean(value)}>
          {showAsTag && value ? (
            <TagPill text={value} />
          ) : (
            <span className={cn('typo-body-xsmall', value ? 'text-neutral-12' : 'text-neutral-7')}>{value ?? placeholder}</span>
          )}
          <PlusSmallIcon />
        </BaseFieldShell>
      </button>
    </div>
  );
}

function OptionListPanel({
  header,
  items,
  rowHeight = 'h-10',
  onSelect,
}: {
  header: string;
  items: Option[];
  rowHeight?: string;
  onSelect: (item: Option) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-20 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-2 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]">
      <div className="flex h-9 items-center border-b border-neutral-4 bg-neutral-5 px-3">
        <span className="typo-body-xsmall text-neutral-7">{header}</span>
      </div>
      <div className="max-h-[132px] overflow-y-auto py-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item)}
            className={cn('flex w-full items-center px-3 text-left typo-body-small text-neutral-10', rowHeight)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TagInputPanel({
  placeholder,
  value,
  onChange,
  onAdd,
  items = [],
  onSelectItem,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  items?: Option[];
  onSelectItem?: (item: Option) => void;
}) {
  const filteredItems = items.filter((item) =>
    value.trim() ? item.label.toLowerCase().includes(value.trim().toLowerCase()) : true
  );

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+1px)] z-20 overflow-hidden rounded-b-lg border border-neutral-5 border-t-0 bg-neutral-2">
      <div className="flex h-10 items-center justify-between bg-neutral-5 px-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent typo-body-xsmall text-neutral-10 placeholder:text-neutral-7 outline-none"
        />
        <button type="button" onClick={onAdd} className="ml-2 inline-flex size-5 items-center justify-center">
          <PlusSmallIcon />
        </button>
      </div>
      {filteredItems.length > 0 ? (
        <div className="max-h-[120px] overflow-y-auto border-t border-neutral-4 bg-neutral-2 py-1">
          {filteredItems.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onSelectItem?.(item)}
              className="flex h-9 w-full items-center px-3 text-left typo-body-xsmall text-neutral-10"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="h-2 bg-neutral-2" />
    </div>
  );
}

function UploadPlaceholderCard({
  title,
  onUpload,
  uploading,
}: {
  title: string;
  onUpload: () => void;
  uploading: boolean;
}) {
  const kind = title.replace('이미지', '').trim();

  return (
    <section className="space-y-4">
      <h2 className="typo-heading-small text-neutral-12">{title}</h2>
      <div className="rounded-lg border border-neutral-4 bg-neutral-2 p-4">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="pt-1">
            <ImagePlaceholderIcon />
          </div>
          <div className="space-y-1 text-center">
            <p className="typo-body-small text-neutral-8">프로젝트 {kind} 이미지를 선택해주세요.</p>
            <p className="typo-body-xsmall text-neutral-7">50MB 이하의 JPEG, PNG 포멧</p>
          </div>
          <Button type="button" color="orange" size="s" className="!w-auto px-4 py-2" onClick={onUpload} disabled={uploading} status={uploading ? 'disabled' : 'default'}>
            {uploading ? '업로드 중...' : '사진 업로드'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function UploadPreviewCard({ title, previewUrl, uploading, onReplace }: { title: string; previewUrl: string; uploading: boolean; onReplace: () => void }) {
  return (
    <section className="space-y-4">
      <h2 className="typo-heading-small text-neutral-12">{title}</h2>
      <div className="w-full rounded-lg border border-neutral-4 bg-neutral-2 p-3">
        <div className="relative overflow-hidden rounded bg-white">
          <div className="relative aspect-[343/319] w-full">
            <Image src={previewUrl} alt={title} fill className="object-cover" unoptimized />
          </div>
          <div className="absolute right-3 top-3">
            <Button type="button" color="white" size="s" className="!w-auto px-3 py-1.5" onClick={onReplace} disabled={uploading}>
              {uploading ? '업로드 중...' : '변경'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="mx-auto h-full w-full max-w-[375px] bg-black/30">{children}</div>
    </div>
  );
}

function LeaveConfirmModal({ onContinue, onLeave }: { onContinue: () => void; onLeave: () => void }) {
  return (
    <ModalOverlay>
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full rounded-xl bg-white px-7 pb-5 pt-10 shadow-[0px_8px_16px_rgba(0,0,0,0.08)]">
          <div className="space-y-1 text-center">
            <p className="typo-body-small-bold text-neutral-12">작성을 취소하시겠습니까?</p>
            <p className="typo-body-xsmall text-neutral-8">지금까지 작성한 글은 저장되지 않습니다.</p>
          </div>
          <div className="mt-8 flex gap-[14px]">
            <Button type="button" color="white" size="m" className="!w-full" onClick={onContinue}>이어서 작성</Button>
            <Button type="button" color="orange" size="m" className="!w-full" onClick={onLeave}>나가기</Button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function SubmitConfirmModal({
  isPublic,
  onTogglePublic,
  onCancel,
  onConfirm,
  submitting,
}: {
  isPublic: boolean;
  onTogglePublic: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <ModalOverlay>
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full rounded-xl bg-white px-7 pb-6 pt-10 shadow-[0px_8px_16px_rgba(0,0,0,0.08)]">
          <div className="space-y-3 text-center">
            <p className="typo-body-small-bold text-neutral-12">프로젝트를 등록하시겠습니까?</p>
            <div className="flex items-center justify-center gap-[9px]">
              <span className="typo-body-small text-neutral-12">공개</span>
              <ToggleSwitch checked={isPublic} onChange={onTogglePublic} disabled={submitting} />
            </div>
          </div>
          <div className="mt-6 flex gap-[14px]">
            <Button type="button" color="white" size="m" className="!w-full" onClick={onCancel} disabled={submitting}>취소</Button>
            <Button type="button" color="orange" size="m" className="!w-full" onClick={onConfirm} disabled={submitting} status={submitting ? 'disabled' : 'default'}>
              {submitting ? '등록 중...' : '등록'}
            </Button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

async function uploadImage(file: File, usage: 'PROJECT_THUMBNAIL' | 'PROJECT_DETAIL') {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`/api/v1/images?usage=${usage}`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.status !== 'success' || !json?.data?.imageUrl) {
    throw new Error(json?.message ?? '이미지 업로드에 실패했습니다.');
  }

  return String(json.data.imageUrl);
}

export default function AdminProjectCreatePage() {
  const router = useRouter();

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);

  const [openMenu, setOpenMenu] = useState<OpenMenu>('none');
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>('none');

  const [teamOptions, setTeamOptions] = useState<Option[]>([]);
  const [yearOptions, setYearOptions] = useState<Option[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [team, setTeam] = useState<Option | null>(null);
  const [yearTag, setYearTag] = useState('');
  const [categoryTag, setCategoryTag] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [thumbnail, setThumbnail] = useState<UploadState>({ file: null, previewUrl: null, uploadedUrl: null, uploading: false });
  const [detail, setDetail] = useState<UploadState>({ file: null, previewUrl: null, uploadedUrl: null, uploading: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/admin/project/meta');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.status !== 'success') {
          throw new Error(json?.message ?? '메타 데이터를 불러오지 못했습니다.');
        }
        if (cancelled) return;

        setTeamOptions((json.data?.teams ?? []).map((item: any) => ({ label: String(item.label), value: String(item.id) })));
        setYearOptions((json.data?.years ?? []).map((item: any) => ({ label: String(item.label), value: String(item.id) })));
        setCategoryOptions((json.data?.categories ?? []).map((item: any) => ({ label: String(item.label), value: String(item.id) })));
      } catch (error: any) {
        if (!cancelled) {
          console.error(error);
          alert(error?.message ?? '메타 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(
    () => Boolean(title.trim() && team && yearTag && categoryTag && thumbnail.uploadedUrl && detail.uploadedUrl && !thumbnail.uploading && !detail.uploading && !metaLoading),
    [title, team, yearTag, categoryTag, thumbnail, detail, metaLoading]
  );

  const isDirty = useMemo(
    () => Boolean(title.trim() || team || yearTag || categoryTag || yearInput.trim() || categoryInput.trim() || thumbnail.file || detail.file),
    [title, team, yearTag, categoryTag, yearInput, categoryInput, thumbnail.file, detail.file]
  );

  const handleBack = () => {
    setOpenMenu('none');
    if (isDirty) {
      setConfirmModal('leave');
      return;
    }
    router.push('/admin/project');
  };

  const handleFileSelected = async (kind: UploadKind, file: File | null) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('JPEG, PNG 형식만 업로드 가능합니다.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('50MB 이하 파일만 업로드 가능합니다.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const setState = kind === 'thumbnail' ? setThumbnail : setDetail;
    const usage = kind === 'thumbnail' ? 'PROJECT_THUMBNAIL' : 'PROJECT_DETAIL';

    setState((prev) => ({ ...prev, file, previewUrl, uploading: true }));

    try {
      const uploadedUrl = await uploadImage(file, usage);
      setState((prev) => ({ ...prev, file, previewUrl, uploadedUrl, uploading: false }));
    } catch (error: any) {
      console.error(error);
      setState((prev) => ({ ...prev, uploading: false, uploadedUrl: null }));
      alert(error?.message ?? '이미지 업로드에 실패했습니다.');
    }
  };

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    setOpenMenu('none');
    setConfirmModal('submit');
  };

  const handleConfirmRegister = async () => {
    if (!team || !yearTag || !categoryTag || !thumbnail.uploadedUrl || !detail.uploadedUrl) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/project/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          teamId: team.value,
          year: yearTag,
          category: categoryTag,
          thumbnailUrl: thumbnail.uploadedUrl,
          detailUrl: detail.uploadedUrl,
          isPublic,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? '프로젝트 등록에 실패했습니다.');
      }

      const toast = isPublic ? 'project-created-public' : 'project-created-private';
      router.push(`/admin/project?toast=${toast}`);
    } catch (error: any) {
      console.error(error);
      alert(error?.message ?? '프로젝트 등록에 실패했습니다.');
      setSubmitting(false);
      setConfirmModal('none');
    }
  };

  const handleCreateYearTag = () => {
    const normalized = yearInput.trim();
    if (!normalized) return;
    if (!/^\d{4}$/.test(normalized)) {
      alert('연도는 4자리 숫자로 입력해주세요. 예: 2025');
      return;
    }
    setYearTag(normalized);
    setYearInput('');
    setOpenMenu('none');
  };

  const handleCreateCategoryTag = () => {
    const normalized = categoryInput.trim();
    if (!normalized) return;
    setCategoryTag(normalized);
    setCategoryInput('');
    setOpenMenu('none');
  };

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar variant="title-back" title="새 프로젝트 등록" onBack={handleBack} />

        <main className="px-4 py-10">
          <div className="flex flex-col gap-10">
            <section className="space-y-4">
              <h2 className="typo-heading-small text-neutral-12">프로젝트 정보</h2>

              <div className="space-y-6">
                <TitleField value={title} onChange={setTitle} />

                <div className="relative">
                  <SelectField
                    label="팀"
                    placeholder={metaLoading ? '불러오는 중...' : '판매팀 선택'}
                    value={team?.label}
                    open={openMenu === 'team'}
                    onToggle={() => !metaLoading && setOpenMenu((prev) => (prev === 'team' ? 'none' : 'team'))}
                  />
                  {openMenu === 'team' ? (
                    <OptionListPanel
                      header="팀 검색"
                      items={teamOptions}
                      rowHeight="h-12"
                      onSelect={(item) => {
                        setTeam(item);
                        setOpenMenu('none');
                      }}
                    />
                  ) : null}
                </div>

                <div className="relative">
                  <SelectField
                    label="연도"
                    placeholder="연도 선택"
                    value={yearTag || undefined}
                    open={openMenu === 'year'}
                    showAsTag={Boolean(yearTag)}
                    onToggle={() => setOpenMenu((prev) => (prev === 'year' ? 'none' : 'year'))}
                  />
                  {openMenu === 'year' ? (
                    <TagInputPanel
                      placeholder="연도 입력"
                      value={yearInput}
                      onChange={setYearInput}
                      onAdd={handleCreateYearTag}
                      items={yearOptions}
                      onSelectItem={(item) => {
                        setYearTag(item.label);
                        setYearInput('');
                        setOpenMenu('none');
                      }}
                    />
                  ) : null}
                </div>

                <div className="relative">
                  <SelectField
                    label="카테고리"
                    placeholder="태그 선택"
                    value={categoryTag || undefined}
                    open={openMenu === 'category'}
                    showAsTag={Boolean(categoryTag)}
                    onToggle={() => setOpenMenu((prev) => (prev === 'category' ? 'none' : 'category'))}
                  />
                  {openMenu === 'category' ? (
                    <TagInputPanel
                      placeholder="태그 선택"
                      value={categoryInput}
                      onChange={setCategoryInput}
                      onAdd={handleCreateCategoryTag}
                      items={categoryOptions}
                      onSelectItem={(item) => {
                        setCategoryTag(item.label);
                        setCategoryInput('');
                        setOpenMenu('none');
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </section>

            {thumbnail.previewUrl ? (
              <UploadPreviewCard title="표지 이미지" previewUrl={thumbnail.previewUrl} uploading={thumbnail.uploading} onReplace={() => thumbnailInputRef.current?.click()} />
            ) : (
              <UploadPlaceholderCard title="표지 이미지" uploading={thumbnail.uploading} onUpload={() => thumbnailInputRef.current?.click()} />
            )}

            {detail.previewUrl ? (
              <UploadPreviewCard title="본문 이미지" previewUrl={detail.previewUrl} uploading={detail.uploading} onReplace={() => detailInputRef.current?.click()} />
            ) : (
              <UploadPlaceholderCard title="본문 이미지" uploading={detail.uploading} onUpload={() => detailInputRef.current?.click()} />
            )}

            <div className="pt-4">
              <Button type="button" color="orange" size="l" status={canSubmit ? 'default' : 'disabled'} disabled={!canSubmit} onClick={handleSubmitClick}>
                등록
              </Button>
            </div>
          </div>
        </main>
      </div>

      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          void handleFileSelected('thumbnail', e.target.files?.[0] ?? null);
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={detailInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          void handleFileSelected('detail', e.target.files?.[0] ?? null);
          e.currentTarget.value = '';
        }}
      />

      {confirmModal === 'leave' ? (
        <LeaveConfirmModal onContinue={() => setConfirmModal('none')} onLeave={() => router.push('/admin/project')} />
      ) : null}

      {confirmModal === 'submit' ? (
        <SubmitConfirmModal
          isPublic={isPublic}
          onTogglePublic={setIsPublic}
          onCancel={() => setConfirmModal('none')}
          onConfirm={() => void handleConfirmRegister()}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}
