'use client';

import { useMemo, useState } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
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

function ArrowButton({
  direction = 'left',
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

function PriceField({ value, onChange }: { value: number; onChange: (next: number) => void }) {
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

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [teamName, setTeamName] = useState('염사모');
  const [name, setName] = useState('염소 후드 집업');
  const [description, setDescription] = useState('따뜻함 한 스푼을 더한 그래픽 후드집업');
  const [type, setType] = useState<ProductType>(0);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>(0);
  const [salesStartDate, setSalesStartDate] = useState('2025-02-25');
  const [salesEndDate, setSalesEndDate] = useState('2025-02-25');

  const [thumbnailImages, setThumbnailImages] = useState<string[]>(['/assets/images/profile_image.png']);
  const [detailImages, setDetailImages] = useState<string[]>([
    '/assets/images/profile_image.png',
    '/assets/images/profile_image.png',
    '/assets/images/profile_image.png',
  ]);
  const [noticeImages, setNoticeImages] = useState<string[]>(['/assets/images/profile_image.png']);

  const [goalAmount, setGoalAmount] = useState(0);
  const [productionStartDate, setProductionStartDate] = useState('');
  const [productionEndDate, setProductionEndDate] = useState('');
  const [deliveryStartDate, setDeliveryStartDate] = useState('');
  const [deliveryEndDate, setDeliveryEndDate] = useState('');
  const [pickupStartDate, setPickupStartDate] = useState('2025-02-25');
  const [pickupEndDate, setPickupEndDate] = useState('2025-02-25');
  const [pickupLocation, setPickupLocation] = useState('동국대학교 학술관K127');

  const [price, setPrice] = useState(39000);
  const [options, setOptions] = useState<OptionItem[]>([
    {
      id: 'opt-1',
      optionName: '사이즈',
      values: [
        { id: 'v-1', value: 'M', extraPrice: 0 },
        { id: 'v-2', value: 'L', extraPrice: 2000 },
      ],
    },
  ]);

  const addOptionValue = (optionId: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: [
                ...opt.values,
                { id: `${optionId}-v-${Date.now()}`, value: 'BLACK', extraPrice: 19800 },
              ],
            }
          : opt
      )
    );
  };

  const removeOptionValue = (optionId: string, valueId: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId
          ? { ...opt, values: opt.values.filter((v) => v.id !== valueId) }
          : opt
      )
    );
  };

  const updateOptionName = (optionId: string, next: string) => {
    setOptions((prev) => prev.map((opt) => (opt.id === optionId ? { ...opt, optionName: next } : opt)));
  };

  const updateOptionValue = (optionId: string, valueId: string, field: 'value' | 'extraPrice', next: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: opt.values.map((v) =>
                v.id === valueId
                  ? {
                      ...v,
                      [field]: field === 'extraPrice' ? Math.max(0, Number(next || 0)) : next,
                    }
                  : v
              ),
            }
          : opt
      )
    );
  };

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}`,
        optionName: '',
        values: [{ id: `opt-${Date.now()}-v-1`, value: 'BLACK', extraPrice: 0 }],
      },
    ]);
  };

  const isStep1Complete = useMemo(() => {
    const hasCommon =
      teamName.trim().length > 0 &&
      name.trim().length > 0 &&
      description.trim().length > 0 &&
      salesStartDate.trim().length > 0 &&
      salesEndDate.trim().length > 0 &&
      thumbnailImages.length > 0 &&
      detailImages.length > 0 &&
      noticeImages.length > 0;

    if (!hasCommon) return false;
    if (type === 0) return receiveMethod === 0 || receiveMethod === 1;
    if (type === 1) return receiveMethod === 1;
    return receiveMethod === null;
  }, [
    teamName,
    name,
    description,
    salesStartDate,
    salesEndDate,
    thumbnailImages.length,
    detailImages.length,
    noticeImages.length,
    type,
    receiveMethod,
  ]);

  const isStep2Complete = useMemo(() => {
    if (type !== 0) return true;
    if (!(goalAmount >= 0)) return false;
    if (receiveMethod === 0) {
      return (
        productionStartDate.trim().length > 0 &&
        productionEndDate.trim().length > 0 &&
        deliveryStartDate.trim().length > 0 &&
        deliveryEndDate.trim().length > 0
      );
    }
    if (receiveMethod === 1) {
      return pickupStartDate.trim().length > 0 && pickupEndDate.trim().length > 0 && pickupLocation.trim().length > 0;
    }
    return false;
  }, [
    type,
    receiveMethod,
    goalAmount,
    productionStartDate,
    productionEndDate,
    deliveryStartDate,
    deliveryEndDate,
    pickupStartDate,
    pickupEndDate,
    pickupLocation,
  ]);

  const isStep3Complete = useMemo(() => price >= 0, [price]);

  const progress: [StepProgressStatus, StepProgressStatus, StepProgressStatus] = useMemo(() => {
    if (currentStep === 1) return ['current', 'upcoming', 'upcoming'];
    if (currentStep === 2) return [isStep1Complete ? 'complete' : 'current', 'current', 'upcoming'];

    const second: StepProgressStatus = type === 0 ? (isStep2Complete ? 'complete' : 'current') : 'skipped';
    return [isStep1Complete ? 'complete' : 'current', second, 'current'];
  }, [currentStep, isStep1Complete, isStep2Complete, type]);

  const onTypeSelect = (index: number) => {
    const nextType: ProductType = index === 0 ? 0 : index === 1 ? 1 : 2;
    setType(nextType);
    if (nextType === 1) setReceiveMethod(1);
    if (nextType === 2) setReceiveMethod(null);
    if (nextType === 0 && receiveMethod === null) setReceiveMethod(0);
  };

  const goNext = () => {
    if (currentStep === 1) {
      if (type === 0) setCurrentStep(2);
      else setCurrentStep(3);
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
  };

  const goPrev = () => {
    if (currentStep === 1) {
      router.push('/admin/product');
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 3) {
      if (type === 0) setCurrentStep(2);
      else setCurrentStep(1);
    }
  };

  const handleEditClick = () => {
    if (currentStep !== 3) return;
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = () => {
    setIsSubmitting(true);
    setShowUpdateModal(false);
    router.push('/admin/product?toast=updated');
  };

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="title-back-trash" title="상품 수정" onBack={() => router.push('/admin/product')} />

        <div className="flex items-center justify-center px-[148px] py-[14px]">
          <div className="flex items-center gap-[14px]">
            <StepProgress status={progress[0]} />
            <StepProgress status={progress[1]} />
            <StepProgress status={progress[2]} />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4">
          {currentStep === 1 ? (
            <div className="flex flex-col gap-5">
              <TextField id="team" label="판매팀" showStar state="filled" inputProps={{ value: teamName, onChange: (e) => setTeamName(e.target.value) }} />
              <TextField id="name" label="상품명" showStar state="filled" inputProps={{ value: name, onChange: (e) => setName(e.target.value) }} />
              <TextField id="desc" label="상품 설명" showStar state="filled" inputProps={{ value: description, onChange: (e) => setDescription(e.target.value) }} />

              <section className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-10">상품 유형</p>
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </div>
                <Radiocardgroup className="w-full" options={['Fund', 'Buy Now', 'Partner Up']} selectedIndex={type === 0 ? 0 : type === 1 ? 1 : 2} onSelect={onTypeSelect} />
              </section>

              <section className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">수령 방식</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  {type === 1 ? <p className="text-[11px] leading-[1.5] text-neutral-8">Buy Now는 현장 수령만 가능합니다.</p> : null}
                </div>
                {type === 0 ? (
                  <Radiocardgroup className="w-full" options={['택배 배송', '현장 수령']} selectedIndex={receiveMethod === 0 ? 0 : 1} onSelect={(i) => setReceiveMethod(i === 0 ? 0 : 1)} />
                ) : (
                  <Radiocardgroup className="w-full" options={['택배 배송', '현장 수령']} selectedIndex={type === 1 ? 1 : null} optionStatuses={type === 1 ? ['disabled', 'default'] : ['disabled', 'disabled']} />
                )}
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-10">예상 판매 기간</p>
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </div>
                <DatePair
                  startLabel="판매 시작일"
                  endLabel="판매 종료일"
                  startValue={salesStartDate}
                  endValue={salesEndDate}
                  onChangeStart={setSalesStartDate}
                  onChangeEnd={setSalesEndDate}
                />
              </section>

              <section className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">썸네일 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">썸네일 이미지는 1장만 업로드합니다.</p>
                </div>
                <div className="flex gap-[5px]">
                  {thumbnailImages.map((src, idx) => (
                    <ProductImage key={idx} property1="Default" src={src} onRemove={() => setThumbnailImages([])} />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">상세페이지 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">여러 장인 경우, 화면에 노출될 순서대로 업로드해 주세요.</p>
                </div>
                <div className="flex gap-[5px]">
                  {detailImages.map((src, idx) => (
                    <ProductImage key={idx} property1="Default" src={src} onRemove={() => setDetailImages((prev) => prev.filter((_, i) => i !== idx))} />
                  ))}
                  {detailImages.length < 4 ? <ProductImage property1="add" onClick={() => setDetailImages((prev) => [...prev, '/assets/images/profile_image.png'])} /> : null}
                </div>
              </section>

              <section className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-10">상품 정보 고시 이미지</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">상품 정보 고시 이미지는 1장만 업로드합니다.</p>
                </div>
                <div className="flex gap-[5px]">
                  {noticeImages.map((src, idx) => (
                    <ProductImage key={idx} property1="Default" src={src} onRemove={() => setNoticeImages([])} />
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {currentStep === 2 && type === 0 ? (
            <div className="flex flex-col gap-5">
              <section className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="typo-body-small-bold text-neutral-12">목표 금액</p>
                    <span className="typo-body-xsmall-bold text-danger">*</span>
                  </div>
                  <p className="text-[11px] leading-[1.5] text-neutral-8">목표 금액이 없다면 0원으로 입력해주세요.</p>
                </div>
                <PriceField value={goalAmount} onChange={setGoalAmount} />
              </section>

              {receiveMethod === 0 ? (
                <>
                  <section className="space-y-2">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-12">예상 제작 기간</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <DatePair
                      startLabel="제작 시작일"
                      endLabel="제작 종료일"
                      startValue={productionStartDate}
                      endValue={productionEndDate}
                      onChangeStart={setProductionStartDate}
                      onChangeEnd={setProductionEndDate}
                    />
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-12">예상 배송 기간</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <DatePair
                      startLabel="배송 시작일"
                      endLabel="배송 종료일"
                      startValue={deliveryStartDate}
                      endValue={deliveryEndDate}
                      onChangeStart={setDeliveryStartDate}
                      onChangeEnd={setDeliveryEndDate}
                    />
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-2">
                    <div className="flex items-center gap-1">
                      <p className="typo-body-small-bold text-neutral-12">예상 수령 기간</p>
                      <span className="typo-body-xsmall-bold text-danger">*</span>
                    </div>
                    <DatePair
                      startLabel="수령 시작일"
                      endLabel="수령 종료일"
                      startValue={pickupStartDate}
                      endValue={pickupEndDate}
                      onChangeStart={setPickupStartDate}
                      onChangeEnd={setPickupEndDate}
                    />
                  </section>

                  <TextField
                    id="pickupLocation"
                    label="수령 장소"
                    showStar
                    subtext="미정인 경우, “추후 안내”로 입력해 주세요."
                    state="filled"
                    inputProps={{ value: pickupLocation, onChange: (e) => setPickupLocation(e.target.value) }}
                  />
                </>
              )}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="flex flex-col gap-5">
              <section className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-12">가격</p>
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </div>
                <PriceField value={price} onChange={setPrice} />
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="typo-body-small-bold text-neutral-12">옵션</p>
                </div>
                <p className="text-[11px] leading-[1.5] text-neutral-8">옵션 추가는 선택 사항입니다.</p>
                {options.map((opt, idx) => (
                  <div key={opt.id} className="w-full rounded-[8px] bg-neutral-1 px-[15px] py-[11px]">
                    <div className="flex flex-col gap-[14px]">
                      <div className="flex items-center justify-between">
                        <p className="typo-heading-xxsmall text-black">{`옵션 ${idx + 1}`}</p>
                        <button
                          type="button"
                          onClick={() => setOptions((prev) => prev.filter((item) => item.id !== opt.id))}
                          className="inline-flex h-5 w-5 items-center justify-center"
                          aria-label="옵션 삭제"
                        >
                          <span className="text-neutral-7">×</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                          <p className="typo-body-xsmall text-neutral-9">옵션명</p>
                          <input
                            value={opt.optionName}
                            onChange={(e) => updateOptionName(opt.id, e.target.value)}
                            className="h-10 w-full rounded-[8px] border border-neutral-6 bg-neutral-2 px-3 typo-body-xsmall text-neutral-12 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between pr-6">
                            <p className="typo-body-xsmall text-neutral-9">옵션값</p>
                            <p className="typo-body-xsmall text-neutral-9">추가 금액</p>
                          </div>
                          {opt.values.map((value) => (
                            <div key={value.id} className="flex h-10 items-center rounded-[8px] border border-neutral-6 bg-neutral-2 pl-[10px] pr-[5px]">
                              <input
                                value={value.value}
                                onChange={(e) => updateOptionValue(opt.id, value.id, 'value', e.target.value)}
                                className="w-[111px] bg-transparent typo-body-xsmall text-neutral-12 outline-none"
                              />
                              <span className="h-5 w-px bg-neutral-5" />
                              <input
                                value={String(value.extraPrice)}
                                onChange={(e) => updateOptionValue(opt.id, value.id, 'extraPrice', e.target.value)}
                                className="ml-2 w-[95px] bg-transparent text-right typo-body-xsmall text-neutral-12 outline-none"
                              />
                              <span className="ml-1 w-[10px] text-right typo-body-xsmall text-neutral-7">원</span>
                              <button
                                type="button"
                                onClick={() => removeOptionValue(opt.id, value.id)}
                                className="ml-auto inline-flex h-4 w-4 items-center justify-center text-neutral-6"
                                aria-label="옵션값 삭제"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addOptionValue(opt.id)}
                        className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-neutral-7 text-neutral-1"
                        aria-label="옵션값 추가"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="h-11 w-full rounded-[8px] bg-[#e9ded2] typo-body-small-bold text-neutral-10"
                >
                  옵션 추가
                </button>
              </section>

              {!isStep3Complete ? <p className="typo-body-xsmall text-danger">가격은 필수 입력값입니다.</p> : null}
            </div>
          ) : null}
        </main>

        <footer className="px-4 pb-8 pt-[17px]">
          <div className="flex items-start gap-[10px]">
            <ArrowButton direction="left" onClick={goPrev} />
            <button
              type="button"
              onClick={handleEditClick}
              disabled={currentStep !== 3}
              className="flex min-h-[55px] flex-1 items-center justify-center rounded-[8px] bg-orange-5 typo-body-small-bold text-neutral-2 disabled:cursor-not-allowed disabled:bg-orange-4"
            >
              수정
            </button>
            <ArrowButton direction="right" onClick={goNext} disabled={currentStep === 3} />
          </div>
        </footer>
      </div>

      {showUpdateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-8">
          <Modal
            className="w-[311px] px-6 pt-8 pb-5"
            title="상품글을 수정하시겠습니까?"
            cancelText="취소"
            confirmText="확인"
            disabled={isSubmitting}
            onCancel={() => setShowUpdateModal(false)}
            onConfirm={handleConfirmUpdate}
          />
        </div>
      ) : null}
    </div>
  );
}
