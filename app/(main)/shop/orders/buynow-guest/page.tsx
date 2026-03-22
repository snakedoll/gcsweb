'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import TextField from '@/components/ui/common/TextField';
import Button from '@/components/ui/button/Button';
import CheckboxButton from '@/components/ui/button/CheckboxButton';

type GuestOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  optionData?: unknown;
  brand: string;
  title: string;
  optionText: string;
  priceText: string;
  imageUrl: string;
};

type ProductVariantState = {
  optionSignature: string;
  isSoldOut: boolean;
};

type ProductDetailForSoldOutCheck = {
  variants?: ProductVariantState[];
};

const TAG_BASE_CLASS =
  'inline-flex items-center justify-center rounded-[8px] bg-orange-3 px-2 py-[2px] typo-body-xsmall text-orange-7';

const GUEST_ORDER_STORAGE_KEY = 'shop:buynow-guest-order-items';

function parseOptions(value: unknown): Array<{ optionName?: string; optionValue?: string; value?: string }> {
  if (!value || typeof value !== 'object') return [];
  return Array.isArray(value) ? value : [value];
}

function parseVariantSignature(signature: string): Record<string, string> {
  if (!signature || signature === '__default__' || signature === 'default') return {};
  return signature.split('|').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, rawValue] = part.split('=');
    if (!rawKey || rawValue == null) return acc;
    try {
      acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
      return acc;
    } catch {
      acc[rawKey] = rawValue;
      return acc;
    }
  }, {});
}

function toSelectedOptionMap(optionData: unknown): Record<string, string> {
  const options = parseOptions(optionData);
  return options.reduce<Record<string, string>>((acc, option) => {
    const key = (option.optionName ?? '').trim();
    const value = (option.optionValue ?? option.value ?? '').trim();
    if (key && value) acc[key] = value;
    return acc;
  }, {});
}

function findMatchedVariant(
  variants: ProductVariantState[],
  selectedMap: Record<string, string>
): ProductVariantState | null {
  if (Object.keys(selectedMap).length === 0) {
    return (
      variants.find((variant) => variant.optionSignature === '__default__' || variant.optionSignature === 'default') ??
      null
    );
  }

  return (
    variants.find((variant) => {
      const parsed = parseVariantSignature(variant.optionSignature);
      const parsedKeys = Object.keys(parsed);
      const selectedKeys = Object.keys(selectedMap);
      if (parsedKeys.length !== selectedKeys.length) return false;
      return selectedKeys.every((key) => parsed[key] === selectedMap[key]);
    }) ?? null
  );
}

function OrderLineCard({ item }: { item: GuestOrderItem }) {
  return (
    <article className="w-full">
      <div className="flex w-full gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.title} className="h-[100px] w-20 rounded-[4px] object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <p className="typo-body-small text-neutral-8">{item.brand}</p>
            <p className="typo-body-small-bold text-neutral-12">{item.title}</p>
            <p className="typo-body-xsmall text-neutral-11">{item.optionText}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className={TAG_BASE_CLASS}>BuyNow</span>
            <span className={TAG_BASE_CLASS}>현장수령</span>
          </div>
          <div className="h-px w-full border-t border-dashed border-neutral-5" />
          <p className="typo-body-xsmall-bold text-neutral-11">{item.priceText}</p>
        </div>
      </div>
    </article>
  );
}

export default function ShopOrdersBuyNowGuestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [items, setItems] = useState<GuestOrderItem[]>([]);
  const [ordererName, setOrdererName] = useState('');
  const [ordererPhone, setOrdererPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<0 | 3>(0);
  const [isAgreed, setIsAgreed] = useState(false);
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);

  useEffect(() => {
    const loadItems = () => {
      setLoading(true);
      try {
        const raw = sessionStorage.getItem(GUEST_ORDER_STORAGE_KEY);
        if (!raw) {
          setItems([]);
          return;
        }
        const parsed = JSON.parse(raw) as GuestOrderItem[];
        if (!Array.isArray(parsed)) {
          setItems([]);
          return;
        }
        setItems(parsed);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  const totalPriceText = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return `${total.toLocaleString('ko-KR')}원`;
  }, [items]);

  const isPayEnabled =
    items.length > 0 &&
    ordererName.trim().length > 0 &&
    ordererPhone.trim().length > 0 &&
    (paymentMethod === 0 || paymentMethod === 3) &&
    isAgreed;

  const handleSubmit = async () => {
    if (!isPayEnabled || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const productIds = Array.from(new Set(items.map((item) => item.productId).filter(Boolean)));
      const productEntries = await Promise.all(
        productIds.map(async (id) => {
          const res = await fetch(`/api/v1/shop/products/${id}`, { cache: 'no-store' });
          const json = await res.json().catch(() => ({}));
          const product = json?.data?.product as ProductDetailForSoldOutCheck | undefined;
          return [id, product ?? null] as const;
        })
      );
      const productMap = new Map<string, ProductDetailForSoldOutCheck | null>(productEntries);

      const hasSoldOut = items.some((item) => {
        const product = productMap.get(item.productId);
        if (!product?.variants || product.variants.length === 0) return false;
        const selectedMap = toSelectedOptionMap(item.optionData);
        const matched = findMatchedVariant(product.variants, selectedMap);
        return Boolean(matched?.isSoldOut);
      });

      if (hasSoldOut) {
        setShowSoldOutModal(true);
        return;
      }

      const payload = {
        productType: 1 as const,
        receiveMethod: 1 as const,
        ordererName: ordererName.trim(),
        ordererPhone: ordererPhone.trim(),
        paymentMethod,
        cardCompany: null,
        bankCode: null,
        easyPayProvider: null,
        isPolicyAgreed: true,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          optionData: item.optionData,
        })),
      };

      const res = await fetch('/api/v1/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.status !== 'success') {
        setSubmitError(json?.message ?? '주문 생성에 실패했습니다.');
        return;
      }

      sessionStorage.removeItem(GUEST_ORDER_STORAGE_KEY);
      const orderId = json?.data?.order?.id;
      if (orderId) {
        if (paymentMethod === 3) {
          router.push(`/shop/orders/buynow/result?orderId=${orderId}&counterPay=1`);
        } else {
          router.push(`/shop/orders/buynow/pay?orderId=${orderId}`);
        }
      } else {
        window.alert('주문이 생성되었습니다.');
        router.push('/shop');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-3 text-neutral-9">주문 정보를 불러오는 중입니다.</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-3 px-5 text-center">
        <p className="typo-body-small text-neutral-9">비회원 주문 항목이 없습니다.</p>
        <button
          type="button"
          className="rounded-lg bg-orange-5 px-4 py-2 typo-body-small-bold text-neutral-2"
          onClick={() => router.push('/shop')}
        >
          샵홈으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-3">
      <NavBar variant="title-back" title="주문하기" />

      <div className="mx-auto flex w-full max-w-[375px] flex-col gap-8 px-4 pb-[34px] pt-[25px]">
        <section className="flex flex-col gap-8">
          {items.map((item) => (
            <OrderLineCard key={item.id} item={item} />
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="typo-body-medium-bold text-neutral-10">수령인 정보</h2>
          <TextField
            id="buynow-guest-orderer-name"
            label="이름"
            state="filled"
            inputProps={{ value: ordererName, onChange: (e) => setOrdererName(e.target.value) }}
          />
          <TextField
            id="buynow-guest-orderer-phone"
            label="전화번호"
            state="filled"
            inputProps={{ value: ordererPhone, onChange: (e) => setOrdererPhone(e.target.value) }}
          />
        </section>

                <section className="space-y-3">
          <h2 className="typo-body-medium-bold text-neutral-10">결제수단</h2>
          <div className="flex gap-3">
            <Button
              size="s"
              color={paymentMethod === 0 ? 'orange' : 'white'}
              status="default"
              className="w-auto min-w-[96px]"
              onClick={() => setPaymentMethod(0)}
            >
              온라인결제
            </Button>
            <Button
              size="s"
              color={paymentMethod === 3 ? 'orange' : 'white'}
              status="default"
              className="w-auto min-w-[96px]"
              onClick={() => setPaymentMethod(3)}
            >
              현장결제
            </Button>
          </div>
        </section>

        <section className="rounded-2xl bg-neutral-2 p-4">
          <div className="space-y-2">
            <p className="typo-body-xsmall text-black">
              현장에서 판매하는 상품으로,
              <br />
              현장에 계신 고객만 수령 가능합니다.
            </p>
            <CheckboxButton checked={isAgreed} onChange={setIsAgreed} label="확인하였습니다." className="mt-1" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="typo-body-medium-bold text-neutral-10">총 결제금액</p>
            <p className="typo-body-medium-bold text-neutral-10">{totalPriceText}</p>
          </div>
          <Button color="orange" status={isPayEnabled && !isSubmitting ? 'default' : 'disabled'} onClick={handleSubmit}>
            결제하기
          </Button>
          {submitError ? <p className="typo-body-xsmall text-red-600">{submitError}</p> : null}
        </section>
      </div>

      {showSoldOutModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.3)] px-4">
          <div className="w-[343px] rounded-[12px] bg-white px-7 pb-[23px] pt-10">
            <div className="flex flex-col gap-[30px]">
              <div className="flex w-full flex-col items-center gap-1 text-center">
                <p className="w-[265px] typo-heading-xxsmall text-neutral-12">품절된 상품입니다.</p>
                <p className="w-[265px] whitespace-pre-line typo-body-xsmall text-neutral-12">
                  {'상품이 품절되어 주문이 불가능합니다.\n현장 직원에게 문의해 주세요.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSoldOutModal(false)}
                className="h-[47px] w-full rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
