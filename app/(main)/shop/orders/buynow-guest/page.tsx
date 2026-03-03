'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import TextField from '@/components/ui/common/TextField';
import Button from '@/components/ui/button/Button';
import CheckboxButton from '@/components/ui/button/CheckboxButton';
import Dropdown from '@/components/ui/button/Dropdown';

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

const TAG_BASE_CLASS =
  'inline-flex items-center justify-center rounded-[8px] bg-orange-3 px-2 py-[2px] typo-body-xsmall text-orange-7';
const CARD_COMPANY_ITEMS = [
  { label: '비씨', value: '0' },
  { label: '우리', value: '1' },
];
const BANK_CODE_ITEMS = [
  { label: '기업', value: '0' },
  { label: '신한', value: '1' },
];

const GUEST_ORDER_STORAGE_KEY = 'shop:buynow-guest-order-items';

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
  const [paymentMethod, setPaymentMethod] = useState<0 | 1 | 2>(2);
  const [cardCompany, setCardCompany] = useState<0 | 1 | null>(null);
  const [bankCode, setBankCode] = useState<0 | 1 | null>(null);
  const [easyPayProvider, setEasyPayProvider] = useState<0 | 1 | 2 | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);

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
    ((paymentMethod === 0 && cardCompany !== null) ||
      (paymentMethod === 1 && bankCode !== null) ||
      (paymentMethod === 2 && easyPayProvider !== null)) &&
    isAgreed;

  const handleSubmit = async () => {
    if (!isPayEnabled || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        productType: 1 as const,
        receiveMethod: 1 as const,
        ordererName: ordererName.trim(),
        ordererPhone: ordererPhone.trim(),
        paymentMethod,
        cardCompany: paymentMethod === 0 ? cardCompany : null,
        bankCode: paymentMethod === 1 ? bankCode : null,
        easyPayProvider: paymentMethod === 2 ? easyPayProvider : null,
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
      window.alert('주문이 생성되었습니다.');
      router.push('/shop');
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
          쇼핑으로 이동
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <Button
                size="s"
                color={paymentMethod === 2 && easyPayProvider === 1 ? 'orange' : 'white'}
                status="default"
                className="w-auto min-w-[87px]"
                onClick={() => {
                  setPaymentMethod(2);
                  setEasyPayProvider(1);
                  setCardCompany(null);
                  setBankCode(null);
                }}
              >
                네이버페이
              </Button>
              <Button
                size="s"
                color={paymentMethod === 2 && easyPayProvider === 0 ? 'orange' : 'white'}
                status="default"
                className="w-auto min-w-[87px]"
                onClick={() => {
                  setPaymentMethod(2);
                  setEasyPayProvider(0);
                  setCardCompany(null);
                  setBankCode(null);
                }}
              >
                카카오페이
              </Button>
              <Button
                size="s"
                color={paymentMethod === 2 && easyPayProvider === 2 ? 'orange' : 'white'}
                status="default"
                className="w-auto min-w-[87px]"
                onClick={() => {
                  setPaymentMethod(2);
                  setEasyPayProvider(2);
                  setCardCompany(null);
                  setBankCode(null);
                }}
              >
                토스페이
              </Button>
            </div>
            <div className="flex gap-3">
              <Button
                size="s"
                color={paymentMethod === 0 ? 'orange' : 'white'}
                status="default"
                className="w-auto min-w-[79px]"
                onClick={() => {
                  setPaymentMethod(0);
                  setBankCode(null);
                  setEasyPayProvider(null);
                }}
              >
                신용카드
              </Button>
              <Button
                size="s"
                color={paymentMethod === 1 ? 'orange' : 'white'}
                status="default"
                className="w-auto min-w-[79px]"
                onClick={() => {
                  setPaymentMethod(1);
                  setCardCompany(null);
                  setEasyPayProvider(null);
                }}
              >
                가상계좌
              </Button>
            </div>
          </div>
          {paymentMethod === 0 ? (
            <Dropdown
              label=""
              size="m"
              state={cardCompany === null ? 'default' : 'selected'}
              placeholder="카드 선택"
              value={cardCompany === null ? undefined : CARD_COMPANY_ITEMS.find((x) => x.value === String(cardCompany))?.label}
              items={CARD_COMPANY_ITEMS}
              onSelect={(value) => setCardCompany(Number(value) as 0 | 1)}
            />
          ) : null}
          {paymentMethod === 1 ? (
            <Dropdown
              label=""
              size="m"
              state={bankCode === null ? 'default' : 'selected'}
              placeholder="은행 선택"
              value={bankCode === null ? undefined : BANK_CODE_ITEMS.find((x) => x.value === String(bankCode))?.label}
              items={BANK_CODE_ITEMS}
              onSelect={(value) => setBankCode(Number(value) as 0 | 1)}
            />
          ) : null}
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
    </div>
  );
}
