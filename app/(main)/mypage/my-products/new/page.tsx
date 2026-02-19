'use client';

import { NavBar } from '@/components/layout';
import { useUser } from '@/hooks/useUser';
import { newProductStep1Schema, PRODUCT_NAME_MAX_LENGTH } from '@/lib/validations/product';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import type { NewProductStep1Input } from '@/lib/validations/product';
import { ko } from 'date-fns/locale';

interface TeamItem {
  id: string;
  teamName: string;
}

function ThumbnailPreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return <span className="typo-body-xsmall text-neutral-6">...</span>;
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

function DetailPreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return <span className="typo-body-xsmall text-neutral-6">...</span>;
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

async function fetchTeams(): Promise<TeamItem[]> {
  const res = await fetch('/api/user/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

function parseOrNull(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  try {
    const d = parseISO(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function TeamDropdown({
  value,
  onChange,
  error,
  teams,
  isLoading,
}: {
  value: string;
  onChange: (teamId: string, teamName: string) => void;
  error?: string;
  teams: TeamItem[];
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTeam = teams.find((t) => t.id === value);
  const filtered = search.trim()
    ? teams.filter((t) => t.teamName.toLowerCase().includes(search.trim().toLowerCase()))
    : teams;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
          error ? 'border-red-5' : 'border-neutral-5'
        )}
      >
        <span className={selectedTeam ? 'text-neutral-12' : 'text-neutral-6'}>
          {selectedTeam ? selectedTeam.teamName : '판매팀을 입력하세요.'}
        </span>
        <Image src="/assets/icons/icon-right.svg" alt="" width={20} height={20} className={open ? 'rotate-90' : ''} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-1 shadow-lg">
          <div className="border-b border-neutral-4 p-2">
            <input
              type="text"
              placeholder="팀 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded border border-neutral-5 bg-neutral-3 px-3 typo-body-xsmall text-neutral-12 placeholder:text-neutral-6"
            />
          </div>
          <ul className="max-h-44 overflow-y-auto py-1">
            {isLoading ? (
              <li className="px-4 py-3 typo-body-xsmall text-neutral-7">로딩 중...</li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-3 typo-body-xsmall text-neutral-7">등록된 팀이 없습니다.</li>
            ) : (
              filtered.map((team) => (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(team.id, team.teamName);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="w-full px-4 py-3 text-left typo-body-small text-neutral-12 hover:bg-neutral-3"
                  >
                    {team.teamName}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 typo-body-xsmall text-red-5">{error}</p>}
    </div>
  );
}

/** 정사각형 단계 표시: 완료=주황+흰 체크, 현재=Figma 5020-2903(연한 배경+주황 테두리), 비활성=회색 */
function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const totalSteps = 3;
  return (
    <div
      className="mb-6 flex justify-center gap-2"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`등록 단계 ${currentStep} of ${totalSteps}`}
    >
      {[1, 2, 3].map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <span
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
              isCompleted && 'bg-orange-6',
              isCurrent && 'border-2 border-orange-6 bg-orange-1',
              !isCompleted && !isCurrent && 'bg-neutral-4'
            )}
          >
            {isCompleted && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9.5 11.5L11.5 13.5L15.5 9.5"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const { profile, isLoading: userLoading, isAuthenticated } = useUser();

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['user', 'teams'],
    queryFn: fetchTeams,
    enabled: isAuthenticated,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NewProductStep1Input>({
    resolver: zodResolver(newProductStep1Schema),
    defaultValues: {
      teamId: '',
      name: '',
      description: '',
      type: 0,
      receiveMethod: 0,
      salesStartDate: '',
      salesEndDate: '',
    },
  });

  const teamId = watch('teamId');
  const nameValue = watch('name') ?? '';
  const nameOverLimit = nameValue.length > PRODUCT_NAME_MAX_LENGTH;
  const salesStartDateStr = watch('salesStartDate');
  const salesEndDateStr = watch('salesEndDate');

  const salesStartDate = salesStartDateStr ? parseOrNull(salesStartDateStr) : null;
  const salesEndDate = salesEndDateStr ? parseOrNull(salesEndDateStr) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [detailFiles, setDetailFiles] = useState<File[]>([]);
  const [detailDragIndex, setDetailDragIndex] = useState<number | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);

  const THUMBNAIL_MAX = 1;
  const DETAIL_MAX = 10;

  const handleDetailReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setDetailFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    setDetailDragIndex(null);
  };

  useEffect(() => {
    if (!userLoading && !isAuthenticated) router.replace('/login');
  }, [userLoading, isAuthenticated, router]);

  const onSubmit = async (_data: NewProductStep1Input) => {
    // TODO: step2 또는 API 연동
    router.push('/mypage/my-products');
  };

  if (userLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="typo-body-xsmall text-neutral-7">로딩 중...</p>
      </div>
    );
  }

  if (profile?.hasSellingPermission !== true) {
    router.replace('/mypage/my-products');
    return null;
  }

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden">
      <NavBar variant="title-back" title="새 상품 등록" />

      <div className="mx-auto w-full min-w-0 max-w-[375px] flex-1 px-4 pb-8 pt-4">
        <StepIndicator currentStep={currentStep} />

        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-5">
          {/* 판매팀 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              판매팀 <span className="text-orange-5">*</span>
            </label>
            <div className="mt-1">
              <TeamDropdown
                value={teamId}
                onChange={(id) => setValue('teamId', id, { shouldValidate: true })}
                error={errors.teamId?.message}
                teams={teams}
                isLoading={teamsLoading}
              />
            </div>
          </section>

          {/* 상품명 - Figma 5083-9264: 에러 시 라벨/테두리/아이콘/메시지 모두 빨간색 */}
          <section>
            <label
              className={cn(
                'typo-body-small-bold',
                (errors.name || nameOverLimit) ? 'text-red-5' : 'text-neutral-12'
              )}
            >
              상품명 <span className={(errors.name || nameOverLimit) ? 'text-red-5' : 'text-orange-5'}>*</span>
            </label>
            <div className="relative mt-1">
              <input
                {...register('name')}
                maxLength={PRODUCT_NAME_MAX_LENGTH}
                placeholder="예) ECO 북극곰 컵홀더"
                className={cn(
                  'h-12 w-full rounded-lg border bg-neutral-1 px-4 pr-10 typo-body-small text-neutral-12 placeholder:text-neutral-6',
                  (errors.name || nameOverLimit) ? 'border-red-5' : 'border-neutral-5'
                )}
              />
              {(errors.name || nameOverLimit) && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                  <Image src="/assets/icons/icon-warning-triangle.svg" alt="" width={20} height={20} />
                </span>
              )}
            </div>
            {(errors.name?.message || nameOverLimit) && (
              <p className="mt-1 typo-body-xsmall text-red-5" role="alert">
                {nameOverLimit ? '글자수는 13자 이내로 작성해주세요' : errors.name?.message}
              </p>
            )}
          </section>

          {/* 상품 설명 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              상품 설명 <span className="text-orange-5">*</span>
            </label>
            <input
              {...register('description')}
              placeholder="예) 커피 들고 지구 편 들기"
              className="mt-1 h-12 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-4 typo-body-small text-neutral-12 placeholder:text-neutral-6"
            />
            {errors.description && (
              <p className="mt-1 typo-body-xsmall text-red-5">{errors.description.message}</p>
            )}
          </section>

          {/* 상품 유형 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              상품 유형 <span className="text-orange-5">*</span>
            </label>
            <div className="mt-2 flex gap-4">
              {[
                { value: 0, label: 'Fund' },
                { value: 1, label: 'Buy Now' },
                { value: 2, label: 'Partner Up' },
              ].map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" value={opt.value} {...register('type')} className="h-4 w-4" />
                  <span className="typo-body-small text-neutral-10">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 수령 방식 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              수령 방식 <span className="text-orange-5">*</span>
            </label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={0} {...register('receiveMethod')} className="h-4 w-4" />
                <span className="typo-body-small text-neutral-10">택배 배송</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={1} {...register('receiveMethod')} className="h-4 w-4" />
                <span className="typo-body-small text-neutral-10">현장 수령</span>
              </label>
            </div>
          </section>

          {/* 예상 판매 기간 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              예상 판매 기간 <span className="text-orange-5">*</span>
            </label>
            <div className="date-range-field mt-1 flex min-w-0 flex-nowrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <Controller
                  name="salesStartDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      selected={salesStartDate}
                      onChange={(date: Date | null) => {
                        const value = date ? format(date, 'yyyy-MM-dd') : '';
                        field.onChange(value);
                        if (salesEndDate && date && salesEndDate < date) {
                          setValue('salesEndDate', value);
                        }
                      }}
                      onBlur={field.onBlur}
                      minDate={today}
                      locale={ko}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="YYYY-MM-DD"
                      className={cn(
                        'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                        errors.salesStartDate ? 'border-red-5' : 'border-neutral-5'
                      )}
                      calendarClassName="gcs-datepicker-calendar"
                    />
                  )}
                />
              </div>
              <span className="shrink-0 typo-body-small-bold text-neutral-8">부터</span>
              <div className="min-w-0 flex-1">
                <Controller
                  name="salesEndDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      selected={salesEndDate}
                      onChange={(date: Date | null) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      onBlur={field.onBlur}
                      minDate={salesStartDate ?? today}
                      locale={ko}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="YYYY-MM-DD"
                      className={cn(
                        'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                        errors.salesEndDate ? 'border-red-5' : 'border-neutral-5'
                      )}
                      calendarClassName="gcs-datepicker-calendar"
                    />
                  )}
                />
              </div>
              <span className="shrink-0 typo-body-small-bold text-neutral-8">까지</span>
            </div>
            {(errors.salesStartDate || errors.salesEndDate) && (
              <p className="mt-1 typo-body-xsmall text-red-5">
                {errors.salesStartDate?.message ?? errors.salesEndDate?.message}
              </p>
            )}
          </section>

          {/* 썸네일 이미지 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              썸네일 이미지 <span className="text-orange-5">*</span>
            </label>
            <p className="mt-1 typo-body-xsmall text-neutral-7">썸네일 이미지는 최대 1장까지 업로드 가능합니다.</p>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setThumbnailFile(file);
                e.target.value = '';
              }}
            />
            <div className="mt-2 flex flex-wrap items-start gap-2">
              {thumbnailFile && (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-3">
                  <ThumbnailPreview file={thumbnailFile} />
                </div>
              )}
              {!thumbnailFile && (
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex h-24 w-24 min-w-[96px] cursor-pointer items-center justify-center rounded-lg border border-neutral-5 bg-neutral-3 transition-colors hover:bg-neutral-4"
                >
                  <span className="typo-body-xsmall text-neutral-6">0/{THUMBNAIL_MAX}</span>
                </button>
              )}
              {thumbnailFile && (
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex h-24 w-24 min-w-[96px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-5 typo-body-xsmall text-neutral-6 hover:bg-neutral-3"
                >
                  변경
                </button>
              )}
            </div>
          </section>

          {/* 상세페이지 이미지 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              상세페이지 이미지 <span className="text-orange-5">*</span>
            </label>
            <p className="mt-1 typo-body-xsmall text-neutral-7">
              여러 장인 경우, 화면에 노출될 순서대로 업로드해 주세요. 드래그하여 순서를 변경할 수 있습니다.
            </p>
            <input
              ref={detailInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                setDetailFiles((prev) => [...prev, ...list].slice(0, DETAIL_MAX));
                e.target.value = '';
              }}
            />
            <ul className="mt-2 flex flex-wrap gap-2">
              {detailFiles.map((file, index) => (
                <li
                  key={index}
                  draggable
                  onDragStart={(e) => {
                    setDetailDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (detailDragIndex === null) return;
                    handleDetailReorder(detailDragIndex, index);
                  }}
                  onDragEnd={() => setDetailDragIndex(null)}
                  className={cn(
                    'relative flex h-24 w-24 shrink-0 cursor-grab items-center justify-center overflow-hidden rounded-lg border border-neutral-5 bg-neutral-3 active:cursor-grabbing',
                    detailDragIndex === index && 'opacity-60'
                  )}
                >
                  <DetailPreview file={file} />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] text-white">
                    {index + 1}
                  </span>
                </li>
              ))}
              {detailFiles.length < DETAIL_MAX && (
                <li>
                  <button
                    type="button"
                    onClick={() => detailInputRef.current?.click()}
                    className="flex h-24 w-24 min-w-[96px] cursor-pointer items-center justify-center rounded-lg border border-neutral-5 bg-neutral-3 transition-colors hover:bg-neutral-4"
                  >
                    <span className="typo-body-xsmall text-neutral-6">
                      + {detailFiles.length}/{DETAIL_MAX}
                    </span>
                  </button>
                </li>
              )}
            </ul>
            <p className="mt-1 typo-body-xsmall text-neutral-7">최대 {DETAIL_MAX}장, 드래그로 순서 변경</p>
          </section>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || nameOverLimit}
              className="h-12 w-full rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2 disabled:opacity-50"
            >
              다음
            </button>
            <p className="mt-2 text-center typo-body-xsmall text-neutral-7">
              다음으로 넘어가도 현재의 내용은 저장됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
