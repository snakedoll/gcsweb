'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const GUEST_TOKEN_STORAGE_KEY = 'shop:guest-token';

/** 카탈로그 API가 stock 등을 줄 수 있으나, 화면에는 표시·클라이언트 제한에 쓰지 않는다. */
type FairShopCatalogItemRow = {
  id: string;
  name: string;
  option?: string;
  price: number;
  emoji?: string;
};

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

type OutOfStockIssue = {
  kind: string;
  displayLabel: string;
  available: number;
  requested: number;
};

function isOutOfStockIssue(value: unknown): value is OutOfStockIssue {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.kind === 'string' &&
    typeof o.displayLabel === 'string' &&
    typeof o.available === 'number' &&
    typeof o.requested === 'number'
  );
}

function formatOutOfStockAlert(issues: OutOfStockIssue[]): string {
  const insufficient = issues.filter((i) => i.kind === 'insufficient');
  const zeroLike = issues.filter((i) => i.kind === 'zero' || i.kind === 'missing');
  const parts: string[] = [];
  for (const i of insufficient) {
    parts.push(
      `현재 아래 상품의 재고는 ${i.available}개입니다. ${i.available}개 이하로 구매해 주세요.\n${i.displayLabel}`,
    );
  }
  if (zeroLike.length > 0) {
    parts.push(
      `아래 상품은 재고가 없습니다. 해당 상품을 제외한 뒤 다시 결제해 주세요.\n\n${zeroLike
        .map((i) => i.displayLabel)
        .join('\n')}`,
    );
  }
  return parts.join('\n\n');
}

export default function QRshopPage() {
  const router = useRouter();
  const [items, setItems] = useState<FairShopCatalogItemRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      const res = await fetch('/api/v1/qrshop/catalog', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok && json?.status === 'success' && Array.isArray(json?.data?.items)) {
        setItems(json.data.items as FairShopCatalogItemRow[]);
      } else {
        setCatalogError('메뉴를 불러오지 못했습니다.');
      }
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const MAX_QTY_PER_LINE = 99;

  const addOne = useCallback((id: string) => {
    setCounts((prev) => {
      const current = prev[id] ?? 0;
      if (current >= MAX_QTY_PER_LINE) return prev;
      return { ...prev, [id]: current + 1 };
    });
    setError(null);
  }, []);

  const setQty = useCallback((id: string, next: number) => {
    setCounts((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = Math.min(MAX_QTY_PER_LINE, next);
      return copy;
    });
  }, []);

  const lines = useMemo(() => {
    const rows: { item: FairShopCatalogItemRow; qty: number }[] = [];
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

  const submitOrder = async (paymentMethod: 0 | 3) => {
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
          paymentMethod,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'success') {
        if (res.status === 409 && json?.code === 'OUT_OF_STOCK' && Array.isArray(json?.issues)) {
          const issues = (json.issues as unknown[]).filter(isOutOfStockIssue);
          if (issues.length > 0) {
            alert(formatOutOfStockAlert(issues));
            return;
          }
        }
        setError(typeof json?.message === 'string' ? json.message : '주문을 만들 수 없습니다.');
        return;
      }
      const orderId = json?.data?.order?.id;
      if (!orderId) {
        setError('주문 번호를 받지 못했습니다.');
        return;
      }
      if (paymentMethod === 3) {
        router.push(`/QRshop/result?orderId=${encodeURIComponent(orderId)}&counterPay=1`);
      } else {
        router.push(`/QRshop/pay?orderId=${encodeURIComponent(orderId)}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (catalogLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-[15px] text-neutral-8">메뉴를 불러오는 중입니다…</p>
      </div>
    );
  }

  if (catalogError || items.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-[15px] text-neutral-9">{catalogError ?? '표시할 메뉴가 없습니다.'}</p>
        <button
          type="button"
          className="rounded-[14px] bg-[#3182f6] px-4 py-2 text-[14px] font-semibold text-white"
          onClick={() => window.location.reload()}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="pb-[calc(200px+env(safe-area-inset-bottom,0px))] pt-4">
      <header className="px-4 pb-2">
        <h1 className="text-[22px] font-bold tracking-tight text-neutral-12">주문하기</h1>
        <p className="mt-1 text-[14px] text-neutral-8">원하시는 상품을 눌러 담아주세요</p>
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
            <span className="mt-2 text-[16px] font-bold text-[#3182f6]">{formatWon(item.price)}</span>
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
                      disabled={qty >= MAX_QTY_PER_LINE}
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

          <div className="flex w-full gap-2">
            <button
              type="button"
              disabled={lines.length === 0 || !agreed || submitting}
              onClick={() => void submitOrder(0)}
              className="flex h-[52px] w-1/2 min-w-0 shrink-0 items-center justify-center rounded-[14px] bg-[#3182f6] text-[15px] font-semibold text-white transition enabled:active:scale-[0.99] disabled:bg-neutral-5 disabled:text-neutral-8"
            >
              {submitting ? '처리 중…' : '결제하기'}
            </button>
            <button
              type="button"
              disabled={lines.length === 0 || !agreed || submitting}
              onClick={() => void submitOrder(3)}
              className="flex h-[52px] w-1/2 min-w-0 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#3182f6] bg-white text-[15px] font-semibold text-[#3182f6] transition enabled:active:scale-[0.99] disabled:border-neutral-5 disabled:bg-neutral-3 disabled:text-neutral-8"
            >
              {submitting ? '처리 중…' : '현장결제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
