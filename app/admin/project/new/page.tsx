'use client';

import { useMemo, useState } from 'react';
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

const TEAM_OPTIONS: Option[] = [
  { label: 'HUSH', value: 'hush' },
  { label: '팀 이름', value: 'team-1' },
  { label: '팀 이름', value: 'team-2' },
  { label: '팀 이름', value: 'team-3' },
  { label: '팀 이름', value: 'team-4' },
];

const YEAR_OPTIONS: Option[] = [
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
];

const CATEGORY_OPTIONS: Option[] = [
  { label: '여름 공모전', value: 'summer' },
  { label: '겨울 공모전', value: 'winter' },
  { label: '졸업 프로젝트', value: 'graduation' },
];

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
        active ? 'border-neutral-6' : filled ? 'border-neutral-6' : 'border-neutral-5',
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

function UploadPlaceholderCard({ title, onUpload }: { title: string; onUpload: () => void }) {
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
          <Button type="button" color="orange" size="s" className="!w-auto px-4 py-2" onClick={onUpload}>
            사진 업로드
          </Button>
        </div>
      </div>
    </section>
  );
}

function ImageDocumentMock() {
  return (
    <div className="w-full rounded-lg border border-neutral-4 bg-neutral-2 p-3">
      <div className="rounded bg-white p-3 shadow-[inset_0_0_0_1px_rgba(241,241,241,1)]">
        <div className="mb-3 flex items-start justify-between">
          <div className="text-[36px] font-bold leading-none text-neutral-10">B</div>
          <p className="text-[16px] font-bold text-neutral-10">kakaobank</p>
        </div>
        <div className="space-y-1 text-[10px] leading-[1.4] text-neutral-10">
          <p className="text-[14px] font-bold">
            강혜분 님 <span className="ml-2 text-[10px] font-normal text-danger">예시용 이미지로, 실제로는 모자이크 처리를 하시면 안됩니다.</span>
          </p>
          <p>예금종류 <span className="ml-3">입출금통장</span></p>
          <p>계좌번호 <span className="ml-3">3333-##-######</span></p>
          <p>개설일 <span className="ml-5">2017.08.29</span></p>
        </div>
        <div className="my-4 h-px bg-neutral-4" />
        <div className="flex items-end justify-between text-[9px] text-neutral-8">
          <p>위와 같이 계좌가 개설되어 있음을 확인합니다.</p>
          <p>한국카카오은행(주)</p>
        </div>
      </div>
    </div>
  );
}

function UploadPreviewCard({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <h2 className="typo-heading-small text-neutral-12">{title}</h2>
      <ImageDocumentMock />
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
            <Button type="button" color="white" size="m" className="!w-full" onClick={onContinue}>
              이어서 작성
            </Button>
            <Button type="button" color="orange" size="m" className="!w-full" onClick={onLeave}>
              나가기
            </Button>
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
}: {
  isPublic: boolean;
  onTogglePublic: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalOverlay>
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full rounded-xl bg-white px-7 pb-6 pt-10 shadow-[0px_8px_16px_rgba(0,0,0,0.08)]">
          <div className="space-y-3 text-center">
            <p className="typo-body-small-bold text-neutral-12">프로젝트를 등록하시겠습니까?</p>
            <div className="flex items-center justify-center gap-[9px]">
              <span className="typo-body-small text-neutral-12">공개</span>
              <ToggleSwitch checked={isPublic} onChange={onTogglePublic} />
            </div>
          </div>
          <div className="mt-6 flex gap-[14px]">
            <Button type="button" color="white" size="m" className="!w-full" onClick={onCancel}>
              취소
            </Button>
            <Button type="button" color="orange" size="m" className="!w-full" onClick={onConfirm}>
              등록
            </Button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function AdminProjectCreatePage() {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<OpenMenu>('none');
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>('none');

  const [title, setTitle] = useState('');
  const [team, setTeam] = useState<Option | null>(null);
  const [year, setYear] = useState<Option | null>(null);
  const [category, setCategory] = useState<Option | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  const [coverUploaded, setCoverUploaded] = useState(false);
  const [bodyUploaded, setBodyUploaded] = useState(false);

  const canSubmit = useMemo(() => Boolean(title.trim() && team && year && category && coverUploaded && bodyUploaded), [
    title,
    team,
    year,
    category,
    coverUploaded,
    bodyUploaded,
  ]);

  const isDirty = useMemo(
    () => Boolean(title.trim() || team || year || category || coverUploaded || bodyUploaded),
    [title, team, year, category, coverUploaded, bodyUploaded]
  );

  const handleBack = () => {
    setOpenMenu('none');
    if (isDirty) {
      setConfirmModal('leave');
      return;
    }
    router.push('/admin/project');
  };

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    setOpenMenu('none');
    setConfirmModal('submit');
  };

  const handleConfirmRegister = () => {
    const toast = isPublic ? 'project-created-public' : 'project-created-private';
    router.push(`/admin/project?toast=${toast}`);
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
                    placeholder="판매팀 선택"
                    value={team?.label}
                    open={openMenu === 'team'}
                    onToggle={() => setOpenMenu((prev) => (prev === 'team' ? 'none' : 'team'))}
                  />
                  {openMenu === 'team' ? (
                    <OptionListPanel
                      header="팀 검색"
                      items={TEAM_OPTIONS.filter((item) => item.value !== 'hush')}
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
                    value={year?.label}
                    open={openMenu === 'year'}
                    showAsTag={Boolean(year)}
                    onToggle={() => setOpenMenu((prev) => (prev === 'year' ? 'none' : 'year'))}
                  />
                  {openMenu === 'year' ? (
                    <OptionListPanel
                      header="연도 선택"
                      items={YEAR_OPTIONS}
                      onSelect={(item) => {
                        setYear(item);
                        setOpenMenu('none');
                      }}
                    />
                  ) : null}
                </div>

                <div className="relative">
                  <SelectField
                    label="카테고리"
                    placeholder="태그 선택"
                    value={category?.label}
                    open={openMenu === 'category'}
                    showAsTag={Boolean(category)}
                    onToggle={() => setOpenMenu((prev) => (prev === 'category' ? 'none' : 'category'))}
                  />
                  {openMenu === 'category' ? (
                    <OptionListPanel
                      header="태그 선택"
                      items={CATEGORY_OPTIONS}
                      onSelect={(item) => {
                        setCategory(item);
                        setOpenMenu('none');
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </section>

            {coverUploaded ? <UploadPreviewCard title="표지 이미지" /> : <UploadPlaceholderCard title="표지 이미지" onUpload={() => setCoverUploaded(true)} />}
            {bodyUploaded ? <UploadPreviewCard title="본문 이미지" /> : <UploadPlaceholderCard title="본문 이미지" onUpload={() => setBodyUploaded(true)} />}

            <div className="pt-4">
              <Button type="button" color="orange" size="l" status={canSubmit ? 'default' : 'disabled'} disabled={!canSubmit} onClick={handleSubmitClick}>
                등록
              </Button>
            </div>
          </div>
        </main>
      </div>

      {confirmModal === 'leave' ? (
        <LeaveConfirmModal onContinue={() => setConfirmModal('none')} onLeave={() => router.push('/admin/project')} />
      ) : null}

      {confirmModal === 'submit' ? (
        <SubmitConfirmModal
          isPublic={isPublic}
          onTogglePublic={setIsPublic}
          onCancel={() => setConfirmModal('none')}
          onConfirm={handleConfirmRegister}
        />
      ) : null}
    </div>
  );
}
