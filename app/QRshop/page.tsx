'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listQrShopItemsForDisplay, type QrShopCatalogItem } from '@/lib/qrshop/catalog';

const GUEST_TOKEN_STORAGE_KEY = 'shop:guest-token';

function getOrCreateGuestToken(): string {
  const existing = localStorage.getItem(GUEST_TOKEN_STORAGE_KEY)?.trim();
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, token);
  return token;
}

function formatWon(n: number) {
  return `${n.toLocaleString('ko-KR')}원`;
}

export default function QRshopPage() {
  const router = useRouter();
  const items = useMemo(() => listQrShopItemsForDisplay(), []);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOne = useCallback((id: string) => {
    setCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setError(null);
  }, []);

  const setQty = useCallback((id: string, next: number) => {
    setCounts((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = Math.min(99, next);
      return copy;
    });
  }, []);

  const lines = useMemo(() => {
    const rows: { item: QrShopCatalogItem; qty: number }[] = [];
    for (const item of items) {
      const q = counts[item.id] ?? 0;
      if (q > 0) rows.push({ item, qty: q });
    }
    return rows;
  }, [counts, items]);

  const total = useMemo(
    () => lines.reduce((sum, row) => sum + row.item.price * row.qty, 0),
    [lines],
  );

  const handlePay = async () => {
    if (lines.length === 0 || !agreed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const guestToken =
        typeof window !== 'undefined' ? getOrCreateGuestToken() : '';
      const res = await fetch('/api/v1/qrshop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestToken ? { 'x-guest-token': guestToken } : {}),
        },
        body: JSON.stringify({
          lines: lines.map((row) => ({ itemId: row.item.id, quantity: row.qty })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'success') {
        setError(typeof json?.message === 'string' ? json.message : '주문을 만들 수 없습니다.');
        return;
      }
      const orderId = json?.data?.order?.id;
      if (!orderId) {
        setError('주문 번호를 받지 못했습니다.');
        return;
      }
      router.push(`/QRshop/pay?orderId=${encodeURIComponent(orderId)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-[calc(200px+env(safe-area-inset-bottom,0px))] pt-4">
      <header className="px-4 pb-2">
        <h1 className="text-[22px] font-bold tracking-tight text-neutral-12">주문하기</h1>
        <p className="mt-1 text-[14px] text-neutral-8">원하시는 메뉴를 눌러 담아주세요</p>
      </header>

      <div className="grid grid-cols-2 gap-3 px-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => addOne(item.id)}
            className="flex flex-col items-start rounded-[20px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition active:scale-[0.98] active:bg-neutral-3"
          >
            {item.emoji ? (
              <span className="mb-2 text-[28px] leading-none" aria-hidden>
                {item.emoji}
              </span>
            ) : null}
            <span className="text-[15px] font-semibold text-neutral-12">{item.name}</span>
            {item.option ? (
              <span className="mt-0.5 text-[13px] text-neutral-8">{item.option}</span>
            ) : null}
            <span className="mt-3 text-[16px] font-bold text-[#3182f6]">{formatWon(item.price)}</span>
          </button>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
        <div
          className="pointer-events-auto border-t border-black/[0.06] bg-white/95 px-4 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {lines.length > 0 ? (
            <ul className="mb-3 max-h-[120px] space-y-2 overflow-y-auto">
              {lines.map(({ item, qty }) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#f2f4f6] px-3 py-2 text-[14px]"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-neutral-11">
                    {item.option ? `${item.name} · ${item.option}` : item.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-medium text-neutral-10 shadow-sm"
                      onClick={() => setQty(item.id, qty - 1)}
                      aria-label="한 개 빼기"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{qty}</span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-medium text-neutral-10 shadow-sm"
                      onClick={() => setQty(item.id, qty + 1)}
                      aria-label="한 개 더하기"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-center text-[14px] text-neutral-8">메뉴를 선택해 주세요</p>
          )}

          <label className="mb-3 flex cursor-pointer items-start gap-2 text-[13px] text-neutral-9">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-5 accent-[#3182f6]"
            />
            <span>주문 내용을 확인했으며, 결제 진행 시 쇼핑몰 이용약관 및 결제에 동의합니다.</span>
          </label>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-neutral-10">결제 금액</span>
            <span className="text-[20px] font-bold text-neutral-12">{formatWon(total)}</span>
          </div>

          {error ? <p className="mb-2 text-center text-[13px] text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={lines.length === 0 || !agreed || submitting}
            onClick={() => void handlePay()}
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#3182f6] text-[16px] font-semibold text-white transition enabled:active:scale-[0.99] disabled:bg-neutral-5 disabled:text-neutral-8"
          >
            {submitting ? '처리 중…' : '결제하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
