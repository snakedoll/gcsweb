'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress, { type StepProgressStatus } from '@/components/ui/admin/product/StepProgress';
import TextField from '@/components/ui/common/TextField';
import Modal from '@/components/ui/common/Modal';
import Radiocardgroup from '@/components/ui/admin/product/Radiocardgroup';
import DaterangepickerVariation from '@/components/ui/admin/product/DaterangepickerVariation';
import ProductImage from '@/components/ui/admin/product/Image';

type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1 | null;
type Step = 1 | 2 | 3;

type OptionItem = {
  id: string;
  optionName: string;
  values: Array<{ id: string; value: string; extraPrice: number }>;
};

type ProductDetailResponse = {
  status: 'success' | 'error';
  code?: string;
  message?: string;
  data?: {
    product?: {
      id: string;
      teamId: string;
      teamName: string;
      name: string;
      description: string;
      type: ProductType;
      receiveMethod: ReceiveMethod;
      salesStartDate: string;
      salesEndDate: string;
      images: {
        thumbnailUrl: string;
        detailImageUrls: string[];
        noticeImgUrl: string;
      };
      goalAmount: number | null;
      productionStartDate: string | null;
      productionEndDate: string | null;
      deliveryStartDate: string | null;
      deliveryEndDate: string | null;
      pickupStartDate: string | null;
      pickupEndDate: string | null;
      pickupLocation: string | null;
      price: number;
      options: Array<{ name: string; values: Array<{ value: string; additionalPrice: number }> }>;
      updatedAt: string;
    };
  };
};

const DETAIL_IMAGE_MAX = 10;

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toIsoDate(value: string, end = false) {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return `${v}T${end ? '23:59:59.000' : '00:00:00.000'}Z`;
}

async function uploadProductImage(file: File, usage: 'PRODUCT_THUMBNAIL' | 'PRODUCT_DETAIL' | 'PRODUCT_NOTICE') {
  const form = new FormData();
  form.append('image', file);
  form.append('usage', usage);
  const res = await fetch('/api/v1/images', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status !== 'success' || !json?.data?.imageUrl) {
    throw new Error(json?.message ?? '이미지 업로드에 실패했습니다.');
  }
  return String(json.data.imageUrl);
}

function ArrowButton({
  direction,
  onClick,
  disabled = false,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-[55px] w-[37px] items-center justify-center rounded-[8px] bg-[#e9ded2] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={direction === 'left' ? '이전' : '다음'}
    >
      {direction === 'left' ? (
        <NextImage src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
      ) : (
        <NextImage src="/assets/icons/icon-right.svg" alt="" width={6} height={12} />
      )}
    </button>
  );
}

function PriceField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex h-10 w-[163px] items-center rounded-[8px] border border-neutral-4 bg-neutral-2 px-[13px] py-[10px]">
      <div className="flex h-5 w-[137px] items-center border-b border-neutral-4">
        <input
          value={String(value)}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value || 0)))}
          className="w-[125px] bg-transparent typo-body-xsmall text-neutral-7 outline-none"
        />
        <span className="w-[12px] text-right typo-body-xsmall text-neutral-7">원</span>
      </div>
    </div>
  );
}

function DatePair({
  startLabel,
  endLabel,
  startValue,
  endValue,
  onChangeStart,
  onChangeEnd,
}: {
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  return (
    <div className="flex h-16 w-full items-center justify-between">
      <div className="flex h-16 w-[158px] flex-col gap-1">
        <p className="typo-body-xsmall text-neutral-8">{startLabel}</p>
        <div className="flex items-center gap-[7px]">
          <div className="relative">
            <DaterangepickerVariation property1={startValue ? 'filled' : 'Default'} value={startValue || undefined} />
            <input
              value={startValue}
              onChange={(e) => onChangeStart(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="absolute inset-0 bg-transparent px-[14px] typo-body-small text-neutral-12 outline-none"
            />
          </div>
          <p className="typo-heading-xxsmall text-neutral-13">부터</p>
        </div>
      </div>
      <div className="flex h-16 w-[158px] flex-col gap-1">
        <p className="typo-body-xsmall text-neutral-8">{endLabel}</p>
        <div className="flex items-center gap-[7px]">
          <div className="relative">
            <DaterangepickerVariation property1={endValue ? 'filled' : 'Default'} value={endValue || undefined} />
            <input
              value={endValue}
              onChange={(e) => onChangeEnd(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="absolute inset-0 bg-transparent px-[14px] typo-body-small text-neutral-12 outline-none"
            />
          </div>
          <p className="typo-heading-xxsmall text-neutral-13">까지</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const productId = useMemo(() => (typeof params?.productId === 'string' ? params.productId.trim() : ''), [params]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState({ thumbnail: false, detail: false, notice: false });

  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProductType>(0);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>(0);
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [detailImageUrls, setDetailImageUrls] = useState<string[]>([]);
  const [noticeImgUrl, setNoticeImgUrl] = useState('');
  const [goalAmount, setGoalAmount] = useState(0);
  const [productionStartDate, setProductionStartDate] = useState('');
  const [productionEndDate, setProductionEndDate] = useState('');
  const [deliveryStartDate, setDeliveryStartDate] = useState('');
  const [deliveryEndDate, setDeliveryEndDate] = useState('');
  const [pickupStartDate, setPickupStartDate] = useState('');
  const [pickupEndDate, setPickupEndDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [price, setPrice] = useState(0);
  const [options, setOptions] = useState<OptionItem[]>([]);

  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const detailInputRef = useRef<HTMLInputElement | null>(null);
  const noticeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!productId) {
        setErrorMessage('유효하지 않은 상품 ID입니다.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/admin/product/update/${productId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as ProductDetailResponse;
        if (!res.ok || json.status !== 'success' || !json.data?.product) {
          throw new Error(json.message ?? '상품 정보를 불러오지 못했습니다.');
        }
        if (cancelled) return;
        const p = json.data.product;
        setTeamId(p.teamId);
        setTeamName(p.teamName);
        setUpdatedAt(p.updatedAt);
        setName(p.name);
        setDescription(p.description);
        setType(p.type);
        setReceiveMethod(p.receiveMethod);
        setSalesStartDate(toDateInput(p.salesStartDate));
        setSalesEndDate(toDateInput(p.salesEndDate));
        setThumbnailUrl(p.images.thumbnailUrl || '');
        setDetailImageUrls(Array.isArray(p.images.detailImageUrls) ? p.images.detailImageUrls : []);
        setNoticeImgUrl(p.images.noticeImgUrl || '');
        setGoalAmount(p.goalAmount ?? 0);
        setProductionStartDate(toDateInput(p.productionStartDate));
        setProductionEndDate(toDateInput(p.productionEndDate));
        setDeliveryStartDate(toDateInput(p.deliveryStartDate));
        setDeliveryEndDate(toDateInput(p.deliveryEndDate));
        setPickupStartDate(toDateInput(p.pickupStartDate));
        setPickupEndDate(toDateInput(p.pickupEndDate));
        setPickupLocation(p.pickupLocation ?? '');
        setPrice(p.price ?? 0);
        setOptions(
          (p.options ?? []).map((opt, oi) => ({
            id: `opt-${oi}-${Date.now()}`,
            optionName: opt.name,
            values: (opt.values ?? []).map((v, vi) => ({
              id: `val-${oi}-${vi}-${Date.now()}`,
              value: v.value,
              extraPrice: v.additionalPrice,
            })),
          }))
        );
      } catch (error: any) {
        if (!cancelled) setErrorMessage(error?.message ?? '상품 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const isStep1Complete = useMemo(() => {
    const common =
      teamId.trim() &&
      name.trim() &&
      description.trim() &&
      salesStartDate.trim() &&
      salesEndDate.trim() &&
      thumbnailUrl.trim() &&
      detailImageUrls.length > 0 &&
      noticeImgUrl.trim();
    if (!common) return false;
    if (type === 0) return receiveMethod === 0 || receiveMethod === 1;
    if (type === 1) return receiveMethod === 1;
    return receiveMethod === null;
  }, [teamId, name, description, salesStartDate, salesEndDate, thumbnailUrl, detailImageUrls.length, noticeImgUrl, type, receiveMethod]);

  const isStep2Complete = useMemo(() => {
    if (type !== 0) return true;
    if (goalAmount < 0) return false;
    if (receiveMethod === 0) return productionStartDate && productionEndDate && deliveryStartDate && deliveryEndDate;
    if (receiveMethod === 1) return pickupStartDate && pickupEndDate && pickupLocation.trim();
    return false;
  }, [type, receiveMethod, goalAmount, productionStartDate, productionEndDate, deliveryStartDate, deliveryEndDate, pickupStartDate, pickupEndDate, pickupLocation]);

  const optionError = useMemo(() => {
    const nameSet = new Set<string>();
    for (const opt of options) {
      const n = opt.optionName.trim();
      if (!n) return '옵션명은 비워둘 수 없습니다.';
      if (nameSet.has(n)) return '옵션명은 중복될 수 없습니다.';
      nameSet.add(n);
      const valueSet = new Set<string>();
      for (const v of opt.values) {
        const value = v.value.trim();
        if (!value) return '옵션값은 비워둘 수 없습니다.';
        if (valueSet.has(value)) return '동일 옵션 내 옵션값은 중복될 수 없습니다.';
        valueSet.add(value);
        if (!Number.isInteger(v.extraPrice) || v.extraPrice < 0) return '추가금액은 0 이상 정수여야 합니다.';
      }
    }
    return null;
  }, [options]);

  const isStep3Complete = useMemo(() => price >= 0 && !optionError, [price, optionError]);

  const progress: [StepProgressStatus, StepProgressStatus, StepProgressStatus] = useMemo(() => {
    if (currentStep === 1) return ['current', 'upcoming', 'upcoming'];
    if (currentStep === 2) return [isStep1Complete ? 'complete' : 'current', 'current', 'upcoming'];
    const second: StepProgressStatus = type === 0 ? (isStep2Complete ? 'complete' : 'current') : 'skipped';
    return [isStep1Complete ? 'complete' : 'current', second, 'current'];
  }, [currentStep, isStep1Complete, isStep2Complete, type]);

  const onTypeSelect = (index: number) => {
    const next: ProductType = index === 0 ? 0 : index === 1 ? 1 : 2;
    setType(next);
    if (next === 1) setReceiveMethod(1);
    if (next === 2) setReceiveMethod(null);
    if (next === 0 && receiveMethod === null) setReceiveMethod(0);
  };

  const addOption = () => setOptions((prev) => [...prev, { id: `opt-${Date.now()}`, optionName: '', values: [{ id: `val-${Date.now()}`, value: '', extraPrice: 0 }] }]);
  const removeOption = (optionId: string) => setOptions((prev) => prev.filter((o) => o.id !== optionId));
  const addOptionValue = (optionId: string) => setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, values: [...o.values, { id: `val-${Date.now()}`, value: '', extraPrice: 0 }] } : o)));
  const removeOptionValue = (optionId: string, valueId: string) => setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, values: o.values.filter((v) => v.id !== valueId) } : o)));
  const updateOptionName = (optionId: string, value: string) => setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, optionName: value } : o)));
  const updateOptionValue = (optionId: string, valueId: string, field: 'value' | 'extraPrice', value: string) =>
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? {
              ...o,
              values: o.values.map((v) => (v.id === valueId ? { ...v, [field]: field === 'extraPrice' ? Math.max(0, Number(value || 0)) : value } : v)),
            }
          : o
      )
    );

  const goNext = () => {
    if (currentStep === 1) return setCurrentStep(type === 0 ? 2 : 3);
    if (currentStep === 2) return setCurrentStep(3);
  };

  const goPrev = () => {
    if (currentStep === 1) return router.push('/admin/product');
    if (currentStep === 2) return setCurrentStep(1);
    if (currentStep === 3) return setCurrentStep(type === 0 ? 2 : 1);
  };

  const handleUploadThumb = async (file: File | null) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, thumbnail: true }));
    try {
      setThumbnailUrl(await uploadProductImage(file, 'PRODUCT_THUMBNAIL'));
    } finally {
      setUploading((prev) => ({ ...prev, thumbnail: false }));
    }
  };

  const handleUploadDetail = async (files: FileList | null) => {
    if (!files?.length) return;
    const remains = Math.max(0, DETAIL_IMAGE_MAX - detailImageUrls.length);
    if (remains === 0) return;
    setUploading((prev) => ({ ...prev, detail: true }));
    try {
      const targets = Array.from(files).slice(0, remains);
      const uploaded = await Promise.all(targets.map((f) => uploadProductImage(f, 'PRODUCT_DETAIL')));
      setDetailImageUrls((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading((prev) => ({ ...prev, detail: false }));
    }
  };

  const handleUploadNotice = async (file: File | null) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, notice: true }));
    try {
      setNoticeImgUrl(await uploadProductImage(file, 'PRODUCT_NOTICE'));
    } finally {
      setUploading((prev) => ({ ...prev, notice: false }));
    }
  };

  const handleEditClick = () => {
    if (currentStep !== 3) return;
    setSubmitError(null);
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = async () => {
    if (!isStep1Complete || !isStep2Complete || !isStep3Complete) {
      setSubmitError('필수값을 확인해주세요.');
      setShowUpdateModal(false);
      return;
    }
    const salesStart = toIsoDate(salesStartDate);
    const salesEnd = toIsoDate(salesEndDate, true);
    if (!salesStart || !salesEnd || !updatedAt) {
      setSubmitError('날짜 형식을 확인해주세요.');
      setShowUpdateModal(false);
      return;
    }

    const body: Record<string, unknown> = {
      teamId,
      name: name.trim(),
      description: description.trim(),
      type,
      receiveMethod,
      salesStartDate: salesStart,
      salesEndDate: salesEnd,
      thumbnailUrl,
      detailImageUrls,
      noticeImgUrl,
      price,
      options: options.map((o) => ({
        name: o.optionName.trim(),
        values: o.values.map((v) => ({ value: v.value.trim(), additionalPrice: v.extraPrice })),
      })),
      updatedAt,
    };

    if (type === 0) {
      body.goalAmount = goalAmount;
      if (receiveMethod === 0) {
        body.productionStartDate = toIsoDate(productionStartDate);
        body.productionEndDate = toIsoDate(productionEndDate, true);
        body.deliveryStartDate = toIsoDate(deliveryStartDate);
        body.deliveryEndDate = toIsoDate(deliveryEndDate, true);
      } else if (receiveMethod === 1) {
        body.pickupStartDate = toIsoDate(pickupStartDate);
        body.pickupEndDate = toIsoDate(pickupEndDate, true);
        body.pickupLocation = pickupLocation.trim();
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/product/update/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || json?.status !== 'success') {
        if (res.status === 409 || json?.code === 'CONFLICT') {
          throw new Error('이미 다른 변경사항이 반영되었습니다. 새로고침 후 다시 시도해주세요.');
        }
        throw new Error(json?.message ?? '상품 수정에 실패했습니다.');
      }
      router.push('/admin/product?toast=updated');
    } catch (error: any) {
      setSubmitError(error?.message ?? '상품 수정에 실패했습니다.');
      setIsSubmitting(false);
      setShowUpdateModal(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-3" />;
  if (errorMessage) return <div className="min-h-screen bg-neutral-3">{errorMessage}</div>;

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="title-back-trash" title="상품 수정" onBack={() => router.push('/admin/product')} />
        <div className="flex items-center justify-center px-[148px] py-[14px]"><div className="flex items-center gap-[14px]"><StepProgress status={progress[0]} /><StepProgress status={progress[1]} /><StepProgress status={progress[2]} /></div></div>

        <main className="flex-1 overflow-y-auto px-4">
          {currentStep === 1 ? (
            <div className="flex flex-col gap-5">
              <TextField id="team" label="판매팀" showStar state="disabled" inputProps={{ value: teamName, readOnly: true }} />
              <TextField id="name" label="상품명" showStar state="filled" inputProps={{ value: name, onChange: (e) => setName(e.target.value) }} />
              <TextField id="desc" label="상품 설명" showStar state="filled" inputProps={{ value: description, onChange: (e) => setDescription(e.target.value) }} />
              <section className="space-y-2"><div className="flex items-center gap-1"><p className="typo-body-small-bold text-neutral-10">상품 유형</p><span className="typo-body-xsmall-bold text-danger">*</span></div><Radiocardgroup className="w-full" options={['Fund', 'Buy Now', 'Partner Up']} selectedIndex={type === 0 ? 0 : type === 1 ? 1 : 2} onSelect={onTypeSelect} /></section>
              <section className="space-y-2">{type === 0 ? <Radiocardgroup className="w-full" options={['택배 배송', '현장 수령']} selectedIndex={receiveMethod === 0 ? 0 : 1} onSelect={(i) => setReceiveMethod(i === 0 ? 0 : 1)} /> : <Radiocardgroup className="w-full" options={['택배 배송', '현장 수령']} selectedIndex={type === 1 ? 1 : null} optionStatuses={['disabled', 'disabled']} />}</section>
              <DatePair startLabel="판매 시작일" endLabel="판매 종료일" startValue={salesStartDate} endValue={salesEndDate} onChangeStart={setSalesStartDate} onChangeEnd={setSalesEndDate} />
              <div className="flex gap-[5px]">{thumbnailUrl ? <ProductImage property1="Default" src={thumbnailUrl} onRemove={() => setThumbnailUrl('')} /> : <ProductImage property1="empty" countText="0/1" onClick={() => thumbInputRef.current?.click()} />}</div>
              <div className="flex gap-[5px]">{detailImageUrls.map((src, i) => <ProductImage key={`${src}-${i}`} property1="Default" src={src} onRemove={() => setDetailImageUrls((prev) => prev.filter((_, idx) => idx !== i))} />)}{detailImageUrls.length < DETAIL_IMAGE_MAX ? <ProductImage property1={detailImageUrls.length ? 'add' : 'empty'} countText={`${detailImageUrls.length}/${DETAIL_IMAGE_MAX}`} onClick={() => detailInputRef.current?.click()} /> : null}</div>
              <div className="flex gap-[5px]">{noticeImgUrl ? <ProductImage property1="Default" src={noticeImgUrl} onRemove={() => setNoticeImgUrl('')} /> : <ProductImage property1="empty" countText="0/1" onClick={() => noticeInputRef.current?.click()} />}</div>
            </div>
          ) : null}

          {currentStep === 2 && type === 0 ? (
            <div className="flex flex-col gap-5">
              <PriceField value={goalAmount} onChange={setGoalAmount} />
              {receiveMethod === 0 ? (
                <>
                  <DatePair startLabel="제작 시작일" endLabel="제작 종료일" startValue={productionStartDate} endValue={productionEndDate} onChangeStart={setProductionStartDate} onChangeEnd={setProductionEndDate} />
                  <DatePair startLabel="배송 시작일" endLabel="배송 종료일" startValue={deliveryStartDate} endValue={deliveryEndDate} onChangeStart={setDeliveryStartDate} onChangeEnd={setDeliveryEndDate} />
                </>
              ) : (
                <>
                  <DatePair startLabel="수령 시작일" endLabel="수령 종료일" startValue={pickupStartDate} endValue={pickupEndDate} onChangeStart={setPickupStartDate} onChangeEnd={setPickupEndDate} />
                  <TextField id="pickupLocation" label="수령 장소" showStar state="filled" inputProps={{ value: pickupLocation, onChange: (e) => setPickupLocation(e.target.value) }} />
                </>
              )}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="flex flex-col gap-5">
              <PriceField value={price} onChange={setPrice} />
              {options.map((opt, idx) => (
                <div key={opt.id} className="w-full rounded-[8px] bg-neutral-1 px-[15px] py-[11px]">
                  <div className="flex items-center justify-between"><p className="typo-heading-xxsmall text-black">{`옵션 ${idx + 1}`}</p><button type="button" onClick={() => removeOption(opt.id)}><span className="text-neutral-7">×</span></button></div>
                  <input value={opt.optionName} onChange={(e) => updateOptionName(opt.id, e.target.value)} className="mt-2 h-10 w-full rounded-[8px] border border-neutral-6 bg-neutral-2 px-3 typo-body-xsmall text-neutral-12 outline-none" />
                  {opt.values.map((v) => (
                    <div key={v.id} className="mt-2 flex h-10 items-center rounded-[8px] border border-neutral-6 bg-neutral-2 pl-[10px] pr-[5px]">
                      <input value={v.value} onChange={(e) => updateOptionValue(opt.id, v.id, 'value', e.target.value)} className="w-[111px] bg-transparent typo-body-xsmall text-neutral-12 outline-none" />
                      <span className="h-5 w-px bg-neutral-5" />
                      <input value={String(v.extraPrice)} onChange={(e) => updateOptionValue(opt.id, v.id, 'extraPrice', e.target.value)} className="ml-2 w-[95px] bg-transparent text-right typo-body-xsmall text-neutral-12 outline-none" />
                      <span className="ml-1 w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
                      <button type="button" className="ml-auto" onClick={() => removeOptionValue(opt.id, v.id)}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOptionValue(opt.id)} className="mx-auto mt-2 inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-neutral-7 text-neutral-1">+</button>
                </div>
              ))}
              <button type="button" onClick={addOption} className="h-11 w-full rounded-[8px] bg-[#e9ded2] typo-body-small-bold text-neutral-10">옵션 추가</button>
              {optionError ? <p className="typo-body-xsmall text-danger">{optionError}</p> : null}
              {submitError ? <p className="typo-body-xsmall text-danger">{submitError}</p> : null}
            </div>
          ) : null}
        </main>

        <footer className="px-4 pb-8 pt-[17px]">
          <div className="flex items-start gap-[10px]">
            <ArrowButton direction="left" onClick={goPrev} />
            <button type="button" onClick={handleEditClick} disabled={currentStep !== 3 || isSubmitting || uploading.thumbnail || uploading.detail || uploading.notice} className="flex min-h-[55px] flex-1 items-center justify-center rounded-[8px] bg-orange-5 typo-body-small-bold text-neutral-2 disabled:cursor-not-allowed disabled:bg-orange-4">수정</button>
            <ArrowButton direction="right" onClick={goNext} disabled={currentStep === 3} />
          </div>
        </footer>
      </div>

      <input ref={thumbInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void handleUploadThumb(e.target.files?.[0] ?? null); e.currentTarget.value = ''; }} />
      <input ref={detailInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { void handleUploadDetail(e.target.files); e.currentTarget.value = ''; }} />
      <input ref={noticeInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void handleUploadNotice(e.target.files?.[0] ?? null); e.currentTarget.value = ''; }} />

      {showUpdateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-8">
          <Modal
            className="w-[311px] px-6 pt-8 pb-5"
            title="상품글을 수정하시겠습니까?"
            cancelText="취소"
            confirmText={isSubmitting ? '수정 중...' : '확인'}
            disabled={isSubmitting}
            onCancel={() => setShowUpdateModal(false)}
            onConfirm={() => void handleConfirmUpdate()}
          />
        </div>
      ) : null}
    </div>
  );
}
