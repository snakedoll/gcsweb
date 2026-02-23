'use client';

import { NavBar } from '@/components/layout';
import { useUser } from '@/hooks/useUser';
import {
  newProductStep1Schema,
  newProductStep2DeliverySchema,
  newProductStep2PickupSchema,
  PRODUCT_NAME_MAX_LENGTH,
} from '@/lib/validations/product';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { shift } from '@floating-ui/react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import RadioButton from '@/components/ui/button/RadioButton';
import { useQuery } from '@tanstack/react-query';
import type {
  NewProductStep1Input,
  NewProductStep2DeliveryInput,
  NewProductStep2PickupInput,
} from '@/lib/validations/product';
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
function StepIndicator({ currentStep, totalSteps = 3 }: { currentStep: number; totalSteps?: number }) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <div
      className="mb-6 flex justify-center gap-2"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`등록 단계 ${currentStep} of ${totalSteps}`}
    >
      {steps.map((step) => {
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

  const [step1Data, setStep1Data] = useState<NewProductStep1Input | null>(null);

  const productType = step1Data?.type ?? 0;
  const receiveMethod = step1Data?.receiveMethod ?? 0;
  const isBuyNow = productType === 1;
  const isPartnerUp = productType === 2;
  const isFundDelivery = productType === 0 && receiveMethod === 0;
  const isFundPickup = productType === 0 && receiveMethod === 1;

  const step2DeliveryForm = useForm<NewProductStep2DeliveryInput>({
    resolver: zodResolver(newProductStep2DeliverySchema),
    defaultValues: {
      goalAmount: 0,
      productionStartDate: '',
      productionEndDate: '',
      deliveryStartDate: '',
      deliveryEndDate: '',
    },
  });
  const step2PickupForm = useForm<NewProductStep2PickupInput>({
    resolver: zodResolver(newProductStep2PickupSchema),
    defaultValues: {
      goalAmount: 0,
      pickupStartDate: '',
      pickupEndDate: '',
      pickupLocation: '',
    },
  });

  const {
    register: registerStep2Delivery,
    handleSubmit: handleSubmitStep2Delivery,
    control: controlStep2Delivery,
    setValue: setValueStep2Delivery,
    watch: watchStep2Delivery,
    formState: { errors: errorsStep2Delivery },
  } = step2DeliveryForm;
  const {
    register: registerStep2Pickup,
    handleSubmit: handleSubmitStep2Pickup,
    control: controlStep2Pickup,
    setValue: setValueStep2Pickup,
    watch: watchStep2Pickup,
    formState: { errors: errorsStep2Pickup },
  } = step2PickupForm;

  const productionStartStr = watchStep2Delivery('productionStartDate');
  const productionEndStr = watchStep2Delivery('productionEndDate');
  const deliveryStartStr = watchStep2Delivery('deliveryStartDate');
  const deliveryEndStr = watchStep2Delivery('deliveryEndDate');
  const productionStartDate = productionStartStr ? parseOrNull(productionStartStr) : null;
  const productionEndDate = productionEndStr ? parseOrNull(productionEndStr) : null;
  const deliveryStartDate = deliveryStartStr ? parseOrNull(deliveryStartStr) : null;
  const deliveryEndDate = deliveryEndStr ? parseOrNull(deliveryEndStr) : null;

  const pickupStartStr = watchStep2Pickup('pickupStartDate');
  const pickupEndStr = watchStep2Pickup('pickupEndDate');
  const pickupStartDate = pickupStartStr ? parseOrNull(pickupStartStr) : null;
  const pickupEndDate = pickupEndStr ? parseOrNull(pickupEndStr) : null;

  const productTypeWatch = watch('type');
  useEffect(() => {
    if (productTypeWatch === 1) setValue('receiveMethod', 1);
    if (productTypeWatch === 2) setValue('receiveMethod', 0);
  }, [productTypeWatch, setValue]);

  const onSubmitStep1 = (data: NewProductStep1Input) => {
    setStep1Data(data);
    if (data.type === 1) setCurrentStep(2);
    else if (data.type === 0) setCurrentStep(2);
    else if (data.type === 2) {
      // Partner Up: 등록요청
      router.push('/mypage/my-products');
    }
  };

  const onSubmitStep2Delivery = (_data: NewProductStep2DeliveryInput) => {
    setCurrentStep(3);
  };

  const onSubmitStep2Pickup = (_data: NewProductStep2PickupInput) => {
    setCurrentStep(3);
  };

  const onSubmitStep3BuyNow = () => {
    router.push('/mypage/my-products');
  };

  const onBackToStep1 = () => setCurrentStep(1);

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
        <StepIndicator
          currentStep={currentStep}
          totalSteps={(step1Data?.type ?? productTypeWatch) === 2 ? 1 : (step1Data?.type ?? productTypeWatch) === 1 ? 2 : 3}
        />

        {currentStep === 1 && (
        <form onSubmit={handleSubmit(onSubmitStep1)} className="min-w-0 space-y-5">
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
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="mt-2 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-1">
                  {[
                    { value: 0, label: 'Fund' },
                    { value: 1, label: 'Buy Now' },
                    { value: 2, label: 'Partner Up' },
                  ].map((opt, i) => (
                    <div
                      key={opt.value}
                      role="button"
                      tabIndex={0}
                      onClick={() => field.onChange(opt.value)}
                      onKeyDown={(e) => e.key === 'Enter' && field.onChange(opt.value)}
                      className={cn(
                        'flex cursor-pointer items-center px-4 py-3',
                        i > 0 && 'border-t border-neutral-4'
                      )}
                    >
                      <RadioButton
                        checked={field.value === opt.value}
                        onChange={() => field.onChange(opt.value)}
                        label={opt.label}
                        value={opt.value}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            />
          </section>

          {/* 수령 방식: Fund=선택, Buy Now=현장수령 고정, Partner Up=비활성화 */}
          <section>
            <label className="typo-body-small-bold text-neutral-12">
              수령 방식 <span className="text-orange-5">*</span>
            </label>
            {productTypeWatch === 2 ? (
              <>
                <p className="mt-1 typo-body-xsmall text-neutral-7">
                  Partner Up은 수령 방식 선택이 불가능 합니다.
                </p>
                <div className="mt-2 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-3">
                  {[
                    { value: 0, label: '택배 배송' },
                    { value: 1, label: '현장 수령' },
                  ].map((opt, i) => (
                    <div
                      key={opt.value}
                      className={cn(
                        'flex items-center px-4 py-3 opacity-60',
                        i > 0 && 'border-t border-neutral-4'
                      )}
                    >
                      <RadioButton
                        checked={false}
                        label={opt.label}
                        disabled
                        value={opt.value}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : productTypeWatch === 1 ? (
              <>
                <p className="mt-1 typo-body-xsmall text-neutral-7">
                  Buy Now는 현장 수령만 가능합니다.
                </p>
                <div className="mt-2 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-1">
                  <div className="flex items-center px-4 py-3 opacity-60">
                    <RadioButton checked={false} label="택배 배송" disabled value={0} />
                  </div>
                  <div className="pointer-events-none flex items-center border-t border-neutral-4 px-4 py-3">
                    <RadioButton checked label="현장 수령" value={1} className="w-full" />
                  </div>
                </div>
              </>
            ) : (
              <Controller
                name="receiveMethod"
                control={control}
                render={({ field }) => (
                  <div className="mt-2 overflow-hidden rounded-lg border border-neutral-5 bg-neutral-1">
                    {[
                      { value: 0, label: '택배 배송' },
                      { value: 1, label: '현장 수령' },
                    ].map((opt, i) => (
                      <div
                        key={opt.value}
                        role="button"
                        tabIndex={0}
                        onClick={() => field.onChange(opt.value)}
                        onKeyDown={(e) => e.key === 'Enter' && field.onChange(opt.value)}
                        className={cn(
                          'flex cursor-pointer items-center px-4 py-3',
                          i > 0 && 'border-t border-neutral-4'
                        )}
                      >
                        <RadioButton
                          checked={field.value === opt.value}
                          onChange={() => field.onChange(opt.value)}
                          label={opt.label}
                          value={opt.value}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
              />
            )}
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
                      popperPlacement="bottom-start"
                      popperModifiers={[shift({ padding: 8 })]}
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
                      popperPlacement="bottom-start"
                      popperModifiers={[shift({ padding: 8 })]}
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
              {productTypeWatch === 2 ? '등록요청' : '다음'}
            </button>
            <p className="mt-2 text-center typo-body-xsmall text-neutral-7">
              다음으로 넘어가도 현재의 내용은 저장됩니다.
            </p>
          </div>
        </form>
        )}

        {currentStep === 2 && isBuyNow && (
          <div className="min-w-0 space-y-5">
            <p className="typo-body-small text-neutral-10">등록 내용을 확인해주세요.</p>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onBackToStep1}
                className="flex-1 h-12 rounded-lg border border-neutral-5 bg-neutral-1 typo-body-small-bold text-neutral-10"
              >
                이전
              </button>
              <button
                type="button"
                onClick={onSubmitStep3BuyNow}
                className="flex-1 h-12 rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2"
              >
                등록요청
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && isFundDelivery && (
          <form onSubmit={handleSubmitStep2Delivery(onSubmitStep2Delivery)} className="min-w-0 space-y-5">
            <section>
              <label className="typo-body-small-bold text-neutral-12">
                목표 금액 <span className="text-orange-5">*</span>
              </label>
              <p className="mt-1 typo-body-xsmall text-neutral-7">
                목표 금액이 없다면 0원으로 입력해주세요.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  {...registerStep2Delivery('goalAmount')}
                  placeholder="0"
                  min={0}
                  className={cn(
                    'h-12 flex-1 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12 placeholder:text-neutral-6',
                    errorsStep2Delivery.goalAmount ? 'border-red-5' : 'border-neutral-5'
                  )}
                />
                <span className="shrink-0 typo-body-small text-neutral-10">원</span>
              </div>
              {errorsStep2Delivery.goalAmount && (
                <p className="mt-1 typo-body-xsmall text-red-5">{errorsStep2Delivery.goalAmount.message}</p>
              )}
            </section>

            <section>
              <label className="typo-body-small-bold text-neutral-12">
                예상 제작 기간 <span className="text-orange-5">*</span>
              </label>
              <div className="date-range-field mt-1 flex min-w-0 flex-nowrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Controller
                    name="productionStartDate"
                    control={controlStep2Delivery}
                    render={({ field }) => (
                      <DatePicker
                        selected={productionStartDate}
                        onChange={(date: Date | null) => {
                          const value = date ? format(date, 'yyyy-MM-dd') : '';
                          field.onChange(value);
                          if (productionEndDate && date && productionEndDate < date) {
                            setValueStep2Delivery('productionEndDate', value);
                          }
                        }}
                        onBlur={field.onBlur}
                        minDate={today}
                        locale={ko}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="YYYY-MM-DD"
                        popperPlacement="bottom-start"
                        popperModifiers={[shift({ padding: 8 })]}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                          errorsStep2Delivery.productionStartDate ? 'border-red-5' : 'border-neutral-5'
                        )}
                        calendarClassName="gcs-datepicker-calendar"
                      />
                    )}
                  />
                </div>
                <span className="shrink-0 typo-body-small-bold text-neutral-8">부터</span>
                <div className="min-w-0 flex-1">
                  <Controller
                    name="productionEndDate"
                    control={controlStep2Delivery}
                    render={({ field }) => (
                      <DatePicker
                        selected={productionEndDate}
                        onChange={(date: Date | null) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        onBlur={field.onBlur}
                        minDate={productionStartDate ?? today}
                        locale={ko}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="YYYY-MM-DD"
                        popperPlacement="bottom-start"
                        popperModifiers={[shift({ padding: 8 })]}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                          errorsStep2Delivery.productionEndDate ? 'border-red-5' : 'border-neutral-5'
                        )}
                        calendarClassName="gcs-datepicker-calendar"
                      />
                    )}
                  />
                </div>
                <span className="shrink-0 typo-body-small-bold text-neutral-8">까지</span>
              </div>
              {(errorsStep2Delivery.productionStartDate || errorsStep2Delivery.productionEndDate) && (
                <p className="mt-1 typo-body-xsmall text-red-5">
                  {errorsStep2Delivery.productionStartDate?.message ??
                    errorsStep2Delivery.productionEndDate?.message}
                </p>
              )}
            </section>

            <section>
              <label className="typo-body-small-bold text-neutral-12">
                예상 배송 기간 <span className="text-orange-5">*</span>
              </label>
              <div className="date-range-field mt-1 flex min-w-0 flex-nowrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Controller
                    name="deliveryStartDate"
                    control={controlStep2Delivery}
                    render={({ field }) => (
                      <DatePicker
                        selected={deliveryStartDate}
                        onChange={(date: Date | null) => {
                          const value = date ? format(date, 'yyyy-MM-dd') : '';
                          field.onChange(value);
                          if (deliveryEndDate && date && deliveryEndDate < date) {
                            setValueStep2Delivery('deliveryEndDate', value);
                          }
                        }}
                        onBlur={field.onBlur}
                        minDate={productionEndDate ?? today}
                        locale={ko}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="YYYY-MM-DD"
                        popperPlacement="bottom-start"
                        popperModifiers={[shift({ padding: 8 })]}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                          errorsStep2Delivery.deliveryStartDate ? 'border-red-5' : 'border-neutral-5'
                        )}
                        calendarClassName="gcs-datepicker-calendar"
                      />
                    )}
                  />
                </div>
                <span className="shrink-0 typo-body-small-bold text-neutral-8">부터</span>
                <div className="min-w-0 flex-1">
                  <Controller
                    name="deliveryEndDate"
                    control={controlStep2Delivery}
                    render={({ field }) => (
                      <DatePicker
                        selected={deliveryEndDate}
                        onChange={(date: Date | null) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        onBlur={field.onBlur}
                        minDate={deliveryStartDate ?? productionEndDate ?? today}
                        locale={ko}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="YYYY-MM-DD"
                        popperPlacement="bottom-start"
                        popperModifiers={[shift({ padding: 8 })]}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                          errorsStep2Delivery.deliveryEndDate ? 'border-red-5' : 'border-neutral-5'
                        )}
                        calendarClassName="gcs-datepicker-calendar"
                      />
                    )}
                  />
                </div>
                <span className="shrink-0 typo-body-small-bold text-neutral-8">까지</span>
              </div>
              {(errorsStep2Delivery.deliveryStartDate || errorsStep2Delivery.deliveryEndDate) && (
                <p className="mt-1 typo-body-xsmall text-red-5">
                  {errorsStep2Delivery.deliveryStartDate?.message ??
                    errorsStep2Delivery.deliveryEndDate?.message}
                </p>
              )}
            </section>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onBackToStep1}
                className="flex-1 h-12 rounded-lg border border-neutral-5 bg-neutral-1 typo-body-small-bold text-neutral-10"
              >
                이전
              </button>
              <button
                type="submit"
                className="flex-1 h-12 rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2 disabled:opacity-50"
              >
                다음
              </button>
            </div>
            <p className="mt-2 text-center typo-body-xsmall text-neutral-7">
              다음으로 넘어가도 현재의 내용은 저장됩니다.
            </p>
          </form>
        )}

        {currentStep === 2 && isFundPickup && (
          <form onSubmit={handleSubmitStep2Pickup(onSubmitStep2Pickup)} className="min-w-0 space-y-5">
            <section>
              <label className="typo-body-small-bold text-neutral-12">
                목표 금액 <span className="text-orange-5">*</span>
              </label>
              <p className="mt-1 typo-body-xsmall text-neutral-7">
                목표 금액이 없다면 0원으로 입력해주세요.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  {...registerStep2Pickup('goalAmount')}
                  placeholder="0"
                  min={0}
                  className={cn(
                    'h-12 flex-1 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12 placeholder:text-neutral-6',
                    errorsStep2Pickup.goalAmount ? 'border-red-5' : 'border-neutral-5'
                  )}
                />
                <span className="shrink-0 typo-body-small text-neutral-10">원</span>
              </div>
              {errorsStep2Pickup.goalAmount && (
                <p className="mt-1 typo-body-xsmall text-red-5">{errorsStep2Pickup.goalAmount.message}</p>
              )}
            </section>

            <section>
              <label className="typo-body-small-bold text-neutral-12">
                수령 기간 <span className="text-orange-5">*</span>
              </label>
              <div className="date-range-field mt-1 flex min-w-0 flex-nowrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Controller
                    name="pickupStartDate"
                    control={controlStep2Pickup}
                    render={({ field }) => (
                      <DatePicker
                        selected={pickupStartDate}
                        onChange={(date: Date | null) => {
                          const value = date ? format(date, 'yyyy-MM-dd') : '';
                          field.onChange(value);
                          if (pickupEndDate && date && pickupEndDate < date) {
                            setValueStep2Pickup('pickupEndDate', value);
                          }
                        }}
                        onBlur={field.onBlur}
                        minDate={today}
                        locale={ko}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="YYYY-MM-DD"
                        popperPlacement="bottom-start"
                        popperModifiers={[shift({ padding: 8 })]}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                          errorsStep2Pickup.pickupStartDate ? 'border-red-5' : 'border-neutral-5'
                        )}
                        calendarClassName="gcs-datepicker-calendar"
                      />
                    )}
                  />
                </div>
                <span className="shrink-0 typo-body-small-bold text-neutral-8">부터</span>
                <div className="min-w-0 flex-1">
                  <Controller
                    name="pickupEndDate"
                    control={controlStep2Pickup}
                    render={({ field }) => (
                      <DatePicker
                        selected={pickupEndDate}
                        onChange={(date: Date | null) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        onBlur={field.onBlur}
                        minDate={pickupStartDate ?? today}
                        locale={ko}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="YYYY-MM-DD"
                        popperPlacement="bottom-start"
                        popperModifiers={[shift({ padding: 8 })]}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12',
                          errorsStep2Pickup.pickupEndDate ? 'border-red-5' : 'border-neutral-5'
                        )}
                        calendarClassName="gcs-datepicker-calendar"
                      />
                    )}
                  />
                </div>
                <span className="shrink-0 typo-body-small-bold text-neutral-8">까지</span>
              </div>
              {(errorsStep2Pickup.pickupStartDate || errorsStep2Pickup.pickupEndDate) && (
                <p className="mt-1 typo-body-xsmall text-red-5">
                  {errorsStep2Pickup.pickupStartDate?.message ?? errorsStep2Pickup.pickupEndDate?.message}
                </p>
              )}
            </section>

            <section>
              <label className="typo-body-small-bold text-neutral-12">
                수령 장소 <span className="text-orange-5">*</span>
              </label>
              <input
                {...registerStep2Pickup('pickupLocation')}
                placeholder="수령 장소를 입력해주세요"
                className={cn(
                  'mt-1 h-12 w-full rounded-lg border bg-neutral-1 px-4 typo-body-small text-neutral-12 placeholder:text-neutral-6',
                  errorsStep2Pickup.pickupLocation ? 'border-red-5' : 'border-neutral-5'
                )}
              />
              {errorsStep2Pickup.pickupLocation && (
                <p className="mt-1 typo-body-xsmall text-red-5">{errorsStep2Pickup.pickupLocation.message}</p>
              )}
            </section>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onBackToStep1}
                className="flex-1 h-12 rounded-lg border border-neutral-5 bg-neutral-1 typo-body-small-bold text-neutral-10"
              >
                이전
              </button>
              <button
                type="submit"
                className="flex-1 h-12 rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2 disabled:opacity-50"
              >
                다음
              </button>
            </div>
            <p className="mt-2 text-center typo-body-xsmall text-neutral-7">
              다음으로 넘어가도 현재의 내용은 저장됩니다.
            </p>
          </form>
        )}

        {currentStep === 3 && productType === 0 && (
          <div className="space-y-5 pt-4">
            <p className="typo-body-small text-neutral-10">3단계 (준비 중)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex-1 h-12 rounded-lg border border-neutral-5 bg-neutral-1 typo-body-small-bold text-neutral-10"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => router.push('/mypage/my-products')}
                className="flex-1 h-12 rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2"
              >
                완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
