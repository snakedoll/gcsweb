'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';

interface OrderDetail {
  id: string;
  orderDate: string;
  items: {
    id: string;
    name: string;
    option: any;
    price: number;
    quantity: number;
    imgUrl: string | null;
  }[];
  customer: {
    name: string;
    phone: string;
  };
  payment: {
    method: string;
    amount: string;
  };
  fulfillmentStatus: '미수령' | '수령완료';
}

export default function AdminOnsiteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/onsite/${params.id}`);
      const json = await res.json();
      if (json.status === 'success') {
        setDetail(json.data);
      } else {
        alert(json.message || '불러오기에 실패했습니다.');
        router.back();
      }
    } catch (error) {
      console.error('Failed to fetch onsite order detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: 0 | 1) => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/admin/onsite/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillmentStatus: newStatus }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setDetail((prev) =>
          prev ? { ...prev, fulfillmentStatus: newStatus === 1 ? '수령완료' : '미수령' } : null
        );
        if (newStatus === 1) {
          router.push('/admin/onsite');
        }
      } else {
        alert(json.message || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f6f6f5]">
        <p className="text-[15px] text-[#6c6764]">불러오는 중...</p>
      </div>
    );
  }

  if (!detail) return null;

  return (
    /* 전체 배경: #F6F6F5 (피그마 Neutral-3) */
    <div className="flex min-h-screen w-full flex-col bg-[#f6f6f5] font-pretendard">
      <div className="relative mx-auto flex h-full w-full max-w-[375px] flex-col bg-[#f6f6f5]">

        {/* NavBar - 피그마: bg-[#f6f6f5], shadow, border-b #f1f1f1 */}
        <NavBar variant="title-back" title="주문 상세" onBack={() => router.back()} />

        {/* 스크롤 가능한 컨텐츠 영역 - pb-[101px] for bottom button */}
        <main className="flex flex-1 flex-col overflow-y-auto px-4 pt-6 pb-[120px]">
          <div className="flex flex-col gap-6">

            {/* ── 주문 요약 박스 (node 7473:37702) ─────────────────────── */}
            {/* bg-[#f1f1f1], border border-[#f1f1f1], rounded-lg, p-4 */}
            <div className="rounded-lg border border-[#f1f1f1] bg-[#f1f1f1] p-4">
              <div className="flex flex-col gap-1">
                {/* 주문 번호 */}
                <div className="flex h-[19.49px] items-center gap-4">
                  <span className="w-16 shrink-0 text-[13px] font-semibold tracking-[-0.26px] text-[#5a5451]">
                    주문 번호
                  </span>
                  <span className="text-[13px] font-semibold tracking-[-0.26px] text-[#2f2824]">
                    {detail.id}
                  </span>
                </div>
                {/* 주문 일시 */}
                <div className="flex h-[19.49px] items-center gap-4">
                  <span className="w-16 shrink-0 text-[13px] font-semibold tracking-[-0.26px] text-[#5a5451]">
                    주문 일시
                  </span>
                  <span className="text-[13px] font-semibold tracking-[-0.26px] text-[#2f2824]">
                    {detail.orderDate}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 주문 목록 (node 7473:37712) ───────────────────────────── */}
            <div className="flex flex-col gap-4">
              {/* 헤더: 주문 목록 / 총 N건 */}
              <div className="flex w-full items-center justify-between">
                <h2 className="text-[17px] font-bold leading-[1.5] text-[#3f3835]">주문 목록</h2>
                <span className="text-[15px] font-normal leading-[1.5] text-[#3f3835]">
                  총 {detail.items.length}건
                </span>
              </div>

              {/* 상품 카드 목록 (node 7473:37716 / 7473:37717) */}
              {detail.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex w-full flex-col gap-3 rounded-lg border border-[#f1f1f1] bg-[#fdfdfd] px-4 py-3"
                >
                  {/* 상품명 */}
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#3f3835]">
                      상품명
                    </span>
                    <span className="text-[13px] font-semibold tracking-[-0.26px] text-[#3f3835]">
                      {item.name}
                    </span>
                  </div>
                  {/* 옵션 / 수량 */}
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#6c6764]">
                      옵션 / 수량
                    </span>
                    <span className="text-[13px] font-normal tracking-[-0.26px] text-[#6c6764]">
                      {item.option
                        ? (typeof item.option === 'string' ? item.option : JSON.stringify(item.option))
                        : '단일 옵션'}{' '}
                      / {item.quantity}개
                    </span>
                  </div>
                  {/* 가격 */}
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#6c6764]">
                      가격
                    </span>
                    <span className="text-[13px] font-normal tracking-[-0.26px] text-[#6c6764]">
                      {item.price.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 구분선 (node 7473:37718) ─────────────────────────────── */}
            <div className="h-px w-full bg-[#f1f1f1]" />

            {/* ── 주문자/결제 정보 (node 7473:37719) ───────────────────── */}
            <div className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold leading-[1.5] text-[#3f3835]">주문자/결제 정보</h2>

              {/* 주문자 정보 박스 (node 7473:37722) */}
              <div className="flex w-full flex-col gap-2 rounded-lg border border-[#f1f1f1] bg-[#fdfdfd] p-4">
                <h3 className="text-[15px] font-bold leading-[1.5] text-[#3f3835]">주문자 정보</h3>
                {/* 내부 구분선 */}
                <div className="h-px w-full bg-[#f1f1f1]" />
                <div className="flex flex-col gap-2">
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      이름
                    </span>
                    <span className="text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      {detail.customer.name}
                    </span>
                  </div>
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      전화번호
                    </span>
                    <span className="text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      {formatPhone(detail.customer.phone)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 결제 정보 박스 (node 7473:37735) */}
              <div className="flex w-full flex-col gap-2 rounded-lg border border-[#f1f1f1] bg-[#fdfdfd] p-4">
                <h3 className="text-[15px] font-bold leading-[1.5] text-[#3f3835]">결제 정보</h3>
                {/* 내부 구분선 */}
                <div className="h-px w-full bg-[#f1f1f1]" />
                <div className="flex flex-col gap-2">
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      결제 수단
                    </span>
                    <span className="text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      {detail.payment.method}
                    </span>
                  </div>
                  <div className="flex h-[19.49px] items-center gap-4">
                    <span className="w-16 shrink-0 text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      결제 금액
                    </span>
                    <span className="text-[13px] font-normal tracking-[-0.26px] text-[#85817e]">
                      {detail.payment.amount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* ── 하단 버튼 영역 (node 7509:39608) ─────────────────────────── */}
        {/* h-[101px], rounded-tl/tr-[12px], bg-[#f6f6f5] fixed */}
        <div className="fixed bottom-0 left-1/2 z-10 h-[101px] w-full max-w-[375px] -translate-x-1/2 overflow-hidden rounded-tl-[12px] rounded-tr-[12px] bg-[#f6f6f5] px-4 pt-[11px] pb-8">
          {detail.fulfillmentStatus === '미수령' ? (
            /* 수령 완료 버튼 (node 7509:39609): bg-[#3f3835], h-55px, rounded-[8px], full width */
            <button
              disabled={submitting}
              onClick={() => updateStatus(1)}
              className="flex h-[55px] w-full items-center justify-center rounded-[8px] bg-[#3f3835] text-[15px] font-bold leading-[1.5] text-[#fdfdfd] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '처리 중...' : '수령 완료'}
            </button>
          ) : (
            <div className="flex w-full items-center gap-4">
              <div className="flex h-[55px] flex-1 items-center justify-center rounded-[8px] bg-[#C7C7C7] text-[15px] font-bold leading-[1.5] text-white">
                수령 완료
              </div>
              <button
                disabled={submitting}
                onClick={() => updateStatus(0)}
                className="flex h-6 w-6 shrink-0 items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18C8.69 18 6 15.31 6 12H3C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 4 12 4Z" fill="#3F3835"/>
                </svg>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
