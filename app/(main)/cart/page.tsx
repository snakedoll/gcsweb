'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import Modal from '@/components/ui/common/Modal';

const GUEST_CART_STORAGE_KEY = 'shop:guest-cart-items';
const GUEST_ORDER_STORAGE_KEY = 'shop:buynow-guest-order-items';

function MinusIcon({ disabled = false }: { disabled?: boolean }) {
  const lineColor = disabled ? '#DDDCDB' : '#6C6764';
  const bgColor = disabled ? '#F1F1F1' : '#FDFDFD';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill={bgColor} stroke="#DDDCDB" />
      <path d="M9 12H15" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ disabled = false }: { disabled?: boolean }) {
  const lineColor = disabled ? '#DDDCDB' : '#6C6764';
  const bgColor = disabled ? '#F1F1F1' : '#FDFDFD';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill={bgColor} stroke="#DDDCDB" />
      <path d="M9 12H15" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9V15" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// (좋아요 UI 제거) HeartIcon removed from this file

function BackIcon() {
  return <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />;
}

function CheckIcon({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  const rectStroke = disabled ? '#DDDCDB' : '#C7C5C4';
  const svgClass = disabled ? 'opacity-50' : '';
  if (checked) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={svgClass}>
        <path d="M17 1.25C20.1756 1.25 22.75 3.82436 22.75 7V17C22.75 20.1756 20.1756 22.75 17 22.75H7C3.82436 22.75 1.25 20.1756 1.25 17V7C1.25 3.82436 3.82436 1.25 7 1.25H17ZM16.0303 8.96973C15.7375 8.67692 15.2626 8.6771 14.9697 8.96973L11.5 12.4395L10.0303 10.9697C9.73736 10.677 9.26255 10.6769 8.96973 10.9697C8.6769 11.2625 8.67705 11.7374 8.96973 12.0303L10.9697 14.0303C11.2626 14.3232 11.7374 14.3232 12.0303 14.0303L16.0303 10.0303C16.3229 9.73736 16.3231 9.26253 16.0303 8.96973Z" fill="#F6874C" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={svgClass}>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke={rectStroke} strokeWidth="1.5" />
    </svg>
  );
}

function ChevronDownIcon({ size = 16 }: { size?: number }) {
  return <Image src="/assets/icons/additional/Additional/Down-filled.svg" alt="" width={size} height={size} />;
}

function CloseIcon() {
  return <Image src="/assets/icons/additional/Close.svg" alt="" width={20} height={20} />;
}

/* ── 타입 ─────────────────────────────────────────────────── */
interface CartItem {
  id: string;
  productId?: string | null;
  optionData?: unknown;
  optionPairs?: OptionPair[];
  teamName: string;
  productName: string;
  options: string[];
  quantity: number;
  price: number;
  imageUrl: string;
  status: 'AVAILABLE' | 'SOLD_OUT' | 'SALES_ENDED';
  type?: number;
  receiveMethod?: number;
}

type CartOptionVariant = 'none' | 'single' | 'double';
type OptionPair = { name: string; value: string };
type OptionChoice = { name: string; values: string[] };

function resolveOptionVariant(options: string[]): CartOptionVariant {
  if (options.length <= 0) return 'none';
  if (options.length === 1) return 'single';
  return 'double';
}

function resolveOptionVariantByCount(count: number): CartOptionVariant {
  if (count <= 0) return 'none';
  if (count === 1) return 'single';
  return 'double';
}

function parseOptionPairs(optionData: unknown): OptionPair[] {
  if (!Array.isArray(optionData)) return [];

  return optionData
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const obj = raw as Record<string, unknown>;
      const name =
        (typeof obj.optionName === 'string' && obj.optionName.trim()) ||
        (typeof obj.name === 'string' && obj.name.trim()) ||
        `옵션 ${index + 1}`;
      const value =
        (typeof obj.optionValue === 'string' && obj.optionValue.trim()) ||
        (typeof obj.value === 'string' && obj.value.trim()) ||
        '';
      if (!value) return null;
      return { name, value };
    })
    .filter((pair): pair is OptionPair => Boolean(pair));
}

function normalizeOptionChoices(rawOptions: unknown): OptionChoice[] {
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const option = raw as Record<string, unknown>;
      const name = typeof option.name === 'string' && option.name.trim() ? option.name.trim() : '';
      const valuesRaw = Array.isArray(option.values) ? option.values : [];
      const values = valuesRaw
        .map((valueRaw) => {
          if (!valueRaw || typeof valueRaw !== 'object') return '';
          const valueObj = valueRaw as Record<string, unknown>;
          return typeof valueObj.value === 'string' ? valueObj.value.trim() : '';
        })
        .filter(Boolean);

      if (!name || values.length === 0) return null;
      return { name, values };
    })
    .filter((choice): choice is OptionChoice => Boolean(choice));
}


/* ── 상품 카드 컴포넌트 ───────────────────────────────────── */
function CartItemCard({
  item,
  optionVariant,
  optionChoices = [],
  checked,
  onCheck,
  onQtyChange,
  onChangeOptions,
  onRemove,
  disabled = false,
}: {
  item: CartItem;
  optionVariant?: CartOptionVariant;
  optionChoices?: OptionChoice[];
  checked: boolean;
  onCheck: () => void;
  onQtyChange: (qty: number) => void;
  onChangeOptions?: (optionIndex: number, nextValue: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const [openOptionIndex, setOpenOptionIndex] = useState<number | null>(null);
  const isSoldOut = item.status === 'SOLD_OUT';
  const isSalesEnded = item.status === 'SALES_ENDED';
  const isDisabled = isSoldOut || isSalesEnded || disabled;
  
  /* Figma: 품절 시 드롭다운/수량필드 bg #f1f1f1, 수량 텍스트 #c7c5c4 */
  const fieldBg = isDisabled ? '#f1f1f1' : '#fdfdfd';
  const qtyTextColor = isDisabled ? '#c7c5c4' : '#3f3835';
  const effectiveOptionVariant = optionVariant ?? resolveOptionVariant(item.options);
  const optionRows =
    effectiveOptionVariant === 'none'
      ? []
      : effectiveOptionVariant === 'single'
        ? [item.options[0] ?? '옵션 1']
        : [item.options[0] ?? '옵션 1', item.options[1] ?? '옵션 2'];

  return (
    <div className="flex gap-3 items-start w-full">
      {/* 체크박스 – 품절 opacity 밖 */}
      <button
        onClick={onCheck}
        disabled={isDisabled}
        className={`flex-shrink-0 h-7 flex items-center ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <CheckIcon checked={checked} disabled={isDisabled} />
      </button>

      <div className="flex flex-col flex-1 gap-4 min-w-0">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2.5 items-start w-full">
            {/* Card/liked – Figma: 품절 시 opacity-40 */}
              <div className={`flex flex-1 gap-4 items-start ${isDisabled ? 'opacity-40' : ''}`}>
              <div className="flex-shrink-0 w-[80px] h-[100px] rounded-[4px] bg-[#f1f1f1] flex items-center justify-center relative">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover rounded-[4px]"
                  />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#c7c5c4" strokeWidth="1.5" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="#c7c5c4" />
                    <path d="M3 15L8 10L12 14L15 11L21 17" stroke="#c7c5c4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {/* 좋아요 버튼 제거 */}
              </div>

              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-[#6c6764] text-[15px] leading-[1.5]">{item.teamName}</span>
                <span className="text-[#2f2824] text-[15px] leading-[1.5] break-words">{item.productName}</span>
                
                {/* 태그 (타입, 수령방법) */}
                <div className="flex gap-2 mt-2">
                  {item.type !== undefined && (
                    <div className="px-3 py-1 bg-[#fbcbab] rounded-[8px] flex justify-center items-center">
                      <span className="text-[#e2691f] text-[14px] font-medium leading-[20px] tracking-[-0.28px]">
                        {item.type === 0 ? 'Fund' : item.type === 1 ? 'BuyNow' : 'Partner'}
                      </span>
                    </div>
                  )}
                  {item.receiveMethod !== undefined && (
                    <div className="px-3 py-1 bg-[#fbcbab] rounded-[8px] flex justify-center items-center">
                      <span className="text-[#e2691f] text-[14px] font-medium leading-[20px] tracking-[-0.28px]">
                        {item.receiveMethod === 0 ? '택배배송' : '현장수령'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Close – 품절 opacity 밖 */}
            <button
              onClick={onRemove}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
              aria-label="삭제"
            >
              <CloseIcon />
            </button>
          </div>

          {effectiveOptionVariant !== 'none' ? (
            <div className="flex flex-col gap-[5px]">
              {optionRows.map((optionValue, index) => (
                <div key={`${item.id}-option-${index}`} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDisabled) return;
                      setOpenOptionIndex((prev) => (prev === index ? null : index));
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-[4px] text-[13px] tracking-[-0.26px] ${
                      optionValue ? 'border-[#c7c5c4] text-[#3f3835]' : 'border-[#dddcdb] text-[#999694]'
                    } ${isDisabled ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                    style={{ backgroundColor: fieldBg }}
                  >
                    <span>{optionValue || `옵션 ${index + 1}`}</span>
                    <ChevronDownIcon />
                  </button>
                  {!isDisabled && openOptionIndex === index && (optionChoices[index]?.values?.length ?? 0) > 0 ? (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dddcdb] rounded-[4px] z-50 max-h-[180px] overflow-y-auto">
                      {optionChoices[index].values.map((choice) => (
                        <button
                          type="button"
                          key={`${item.id}-option-${index}-${choice}`}
                          onClick={() => {
                            onChangeOptions?.(index, choice);
                            setOpenOptionIndex(null);
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] tracking-[-0.26px] text-[#2f2824] hover:bg-[#f1f1f1]"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isDisabled && onQtyChange(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1 || isDisabled}
              className={`flex-shrink-0 flex items-center justify-center w-6 h-6 ${item.quantity <= 1 || isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <MinusIcon disabled={item.quantity <= 1 || isDisabled} />
            </button>
            <div
              className="flex items-center justify-center border border-[#dddcdb] rounded-lg px-2 py-1 min-w-[32px] text-[13px] tracking-[-0.26px]"
              style={{ backgroundColor: fieldBg, color: qtyTextColor }}
            >
              {item.quantity}
            </div>
            <button
              onClick={() => !isDisabled && onQtyChange(item.quantity + 1)}
              disabled={isDisabled}
              className={`flex-shrink-0 flex items-center justify-center w-6 h-6 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <PlusIcon disabled={isDisabled} />
            </button>
          </div>

          {/* 가격 – Figma: 품절 시 opacity-40 */}
          <span className={`text-[17px] font-bold text-[#3f3835] ${isDisabled ? 'opacity-40' : ''}`}>
            {(item.price * item.quantity).toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── 푸터 ─────────────────────────────────────────────────── */
// use shared Footer component from components/layout/Footer

/* ── 메인 페이지 ──────────────────────────────────────────── */
export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useUser();
  const [items, setItems] = useState<CartItem[]>([]);
  const [optionCatalogByProductId, setOptionCatalogByProductId] = useState<Record<string, OptionChoice[]>>({});
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [orderWarningMessage, setOrderWarningMessage] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showSoldOut, setShowSoldOut] = useState(true);
  const [showSalesEnded, setShowSalesEnded] = useState(true);

  // API: 장바구니 목록 조회
  useEffect(() => {
    if (isLoading) return;

    const fetchCart = async () => {
      if (!isAuthenticated) {
        try {
          const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          const guestItems = Array.isArray(parsed)
            ? (parsed as Array<any>).map((item, index) => ({
                id: String(item?.id ?? `guest-${index}`),
                productId: typeof item?.productId === 'string' ? item.productId : null,
                optionData: item?.optionData ?? null,
                optionPairs: parseOptionPairs(item?.optionData ?? null),
                teamName: item?.teamName ?? '팀명 없음',
                productName: item?.productName ?? '상품명 없음',
                options: Array.isArray(item?.options) ? item.options.filter((v: unknown) => typeof v === 'string') : [],
                quantity: Math.max(1, Number(item?.quantity ?? 1)),
                price: Math.max(0, Number(item?.price ?? 0)),
                imageUrl: item?.imageUrl ?? '',
                status: (item?.status as CartItem['status']) ?? 'AVAILABLE',
                type: typeof item?.type === 'number' ? item.type : 1,
                receiveMethod: typeof item?.receiveMethod === 'number' ? item.receiveMethod : 1,
              }))
            : [];
          setItems(guestItems);
        } catch (err) {
          console.error('Guest cart load error:', err);
          setItems([]);
        } finally {
          setPageLoading(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/v1/mypage/cart/list?page=1&size=100');
        if (!res.ok) {
          console.error('Failed to fetch cart:', res.statusText);
          setItems([]);
          return;
        }

        const data = await res.json();
        const cartItems: CartItem[] = (data?.data?.cartItems ?? []).map((item: any) => ({
          id: String(item.cartItemId),
          productId: item.productId ?? null,
          optionData: item.options ?? null,
          optionPairs: parseOptionPairs(item.options ?? null),
          teamName: item.teamName ?? '팀명 없음',
          productName: item.productName ?? '상품명 없음',
          options: Array.isArray(item.options)
            ? item.options
                .map((opt: any) => opt?.value ?? opt?.optionValue ?? opt?.name ?? opt?.optionName ?? '')
                .filter((opt: string) => Boolean(opt && String(opt).trim().length > 0))
            : [],
          quantity: item.quantity ?? 1,
          price: item.price ?? 0,
          imageUrl: item.thumbnailUrl ?? '',
          status: item.status ?? 'AVAILABLE',
          type: item.type,
          receiveMethod: item.receiveMethod,
        }));

        setItems(cartItems);
      } catch (err) {
        console.error('Cart fetch error:', err);
        setItems([]);
      } finally {
        setPageLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    const productIds = Array.from(
      new Set(
        items
          .map((item) => item.productId)
          .filter((productId): productId is string => typeof productId === 'string' && productId.length > 0)
      )
    );
    const missingIds = productIds.filter((productId) => !(productId in optionCatalogByProductId));
    if (missingIds.length === 0) return;

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        missingIds.map(async (productId) => {
          try {
            const res = await fetch(`/api/v1/shop/products/${productId}`, { cache: 'no-store' });
            if (!res.ok) return [productId, [] as OptionChoice[]] as const;
            const json = await res.json().catch(() => ({} as any));
            const rawOptions = json?.data?.product?.options;
            const normalized = normalizeOptionChoices(rawOptions);
            return [productId, normalized] as const;
          } catch (_) {
            return [productId, [] as OptionChoice[]] as const;
          }
        })
      );

      if (cancelled) return;

      setOptionCatalogByProductId((prev) => {
        const next = { ...prev };
        for (const [productId, choices] of entries) {
          if (!(productId in next)) {
            next[productId] = choices;
          }
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [items, optionCatalogByProductId]);

  // API: 수량 변경
  const persistGuestCart = (nextItems: CartItem[]) => {
    if (isAuthenticated) return;
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextItems));
  };

  const updateCartQty = async (cartId: string, newQty: number) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/v1/mypage/cart/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId: cartId, quantity: newQty }),
      });
      if (!res.ok) {
        console.error('Failed to update quantity:', res.statusText);
      }
    } catch (err) {
      console.error('Update quantity error:', err);
    }
  };

  const updateCartOptions = async (cartId: string, pairs: OptionPair[]) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/v1/mypage/cart/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItemId: cartId,
          options: pairs.map((pair) => ({ optionName: pair.name, optionValue: pair.value })),
        }),
      });
      if (!res.ok) {
        console.error('Failed to update options:', res.statusText);
      }
    } catch (err) {
      console.error('Update options error:', err);
    }
  };

  // API: 항목 삭제
  const deleteCartItem = async (cartId: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/v1/mypage/cart/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemIds: [cartId] }),
      });
      if (!res.ok) {
        console.error('Failed to delete item:', res.statusText);
      }
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  // API: 선택한 항목 삭제
  const deleteSelectedItems = async () => {
    const itemsToDelete = items.filter((i) => checkedIds.has(i.id));
    const cartItemIds = itemsToDelete.map((i) => i.id);
    
    if (cartItemIds.length === 0) return;

    if (isAuthenticated) {
      try {
        const res = await fetch('/api/v1/mypage/cart/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItemIds }),
        });
        if (!res.ok) {
          console.error('Failed to delete items:', res.statusText);
        }
      } catch (err) {
        console.error('Delete items error:', err);
      }
    }

    // UI 업데이트
    setItems((prev) => {
      const next = prev.filter((i) => !checkedIds.has(i.id));
      persistGuestCart(next);
      return next;
    });
    setCheckedIds(new Set());
  };

  const activeItems = items.filter((i) => i.status === 'AVAILABLE');
  const soldOutItems = items.filter((i) => i.status === 'SOLD_OUT');
  const salesEndedItems = items.filter((i) => i.status === 'SALES_ENDED');
  const allActiveChecked = activeItems.length > 0 && activeItems.every((i) => checkedIds.has(i.id));
  const selectedActiveItems = activeItems.filter((i) => checkedIds.has(i.id));
  const totalPrice = selectedActiveItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = selectedActiveItems.reduce((sum, i) => sum + i.quantity, 0);
  const hasSelected = selectedActiveItems.length > 0;

  function toggleAll() {
    if (allActiveChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(activeItems.map((i) => i.id)));
    }
  }

  function toggleItem(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i));
      persistGuestCart(next);
      return next;
    });
    // API 호출
    updateCartQty(id, qty);
  }

  function changeOptions(id: string, optionIndex: number, nextValue: string) {
    let pairsToSync: OptionPair[] | null = null;

    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;

        const currentOptions = [...(item.options ?? [])];
        currentOptions[optionIndex] = nextValue;

        const optionChoices = item.productId ? optionCatalogByProductId[item.productId] ?? [] : [];
        const pairCount = Math.max(currentOptions.length, optionChoices.length, item.optionPairs?.length ?? 0);
        const nextPairs: OptionPair[] = [];

        for (let index = 0; index < pairCount; index += 1) {
          const name = optionChoices[index]?.name ?? item.optionPairs?.[index]?.name ?? `옵션 ${index + 1}`;
          const value = currentOptions[index] ?? item.optionPairs?.[index]?.value ?? '';
          if (!value) continue;
          nextPairs.push({ name, value });
        }

        pairsToSync = nextPairs;

        return {
          ...item,
          options: currentOptions,
          optionPairs: nextPairs,
          optionData: nextPairs.map((pair) => ({ optionName: pair.name, optionValue: pair.value })),
        };
      });

      persistGuestCart(next);
      return next;
    });

    if (pairsToSync && pairsToSync.length > 0) {
      void updateCartOptions(id, pairsToSync);
    }
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      persistGuestCart(next);
      return next;
    });
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // API 호출
    deleteCartItem(id);
  }

  function deleteSelected() {
    deleteSelectedItems();
  }

  async function handleOrderSelected() {
    if (!hasSelected) return;

    if (isAuthenticated) {
      try {
        const res = await fetch('/api/v1/mypage/cart/list?page=1&size=100', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const latestItems = (json?.data?.cartItems ?? []) as Array<{ cartItemId?: string; status?: string }>;
          const selectedIdSet = new Set(selectedActiveItems.map((item) => String(item.id)));
          const hasUnavailable = latestItems.some(
            (item) => item?.cartItemId && selectedIdSet.has(String(item.cartItemId)) && item?.status !== 'AVAILABLE'
          );
          if (hasUnavailable) {
            setOrderWarningMessage('품절 또는 판매종료 상품이 포함되어 주문할 수 없습니다.');
            return;
          }
        }
      } catch (_) {
        // no-op: keep previous flow when verification call fails
      }
    }

    const first = selectedActiveItems[0];
    if (!first) return;

    const isSameGroup = selectedActiveItems.every(
      (item) => item.type === first.type && item.receiveMethod === first.receiveMethod
    );
    if (!isSameGroup) {
      setOrderWarningMessage('서로 다른 주문 유형의 상품은 동시에 주문할 수 없습니다.');
      return;
    }

    const cartItemIds = selectedActiveItems.map((item) => item.id).join(',');
    const query = `?cartItemIds=${encodeURIComponent(cartItemIds)}`;

    if (first.type === 0) {
      const route = first.receiveMethod === 1 ? '/shop/orders/pickup' : '/shop/orders';
      router.push(`${route}${query}`);
      return;
    }

    if (first.type === 1) {
      if (!isAuthenticated) {
        const guestOrderItems = selectedActiveItems.map((item) => ({
          id: item.id,
          productId: item.productId ?? '',
          quantity: item.quantity,
          unitPrice: item.price,
          optionData: item.optionData ?? null,
          productType: item.type ?? 1,
          receiveMethod: item.receiveMethod ?? 1,
          brand: item.teamName,
          title: item.productName,
          optionText: `${(item.options ?? []).join(' / ')} / ${item.quantity}개`,
          priceText: `${Number(item.price * item.quantity).toLocaleString('ko-KR')}원`,
          imageUrl: item.imageUrl,
        }));
        sessionStorage.setItem(GUEST_ORDER_STORAGE_KEY, JSON.stringify(guestOrderItems));
        router.push('/shop/orders/buynow');
        return;
      }

      router.push(`/shop/orders/buynow${query}`);
      return;
    }

    setOrderWarningMessage('해당 상품 유형은 주문을 지원하지 않습니다.');
  }

  

  if (isLoading || pageLoading) {
    return (
      <div className="bg-[#f6f6f5] min-h-screen w-full flex items-center justify-center">
        <p className="text-[#999694]">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f6f5] min-h-screen w-full flex justify-center pb-[80px]">
      <div className="w-full max-w-[375px] flex flex-col">
        {/* ── 네비게이션 바 ─────────────── */}
        <div className="bg-[#f6f6f5] flex flex-col sticky top-0 z-30">
          <div className="h-[34px]" />
          <div className="flex h-11 items-center justify-between px-4 py-[10px]">
            <button onClick={() => router.back()} className="w-3 h-6 flex items-center cursor-pointer" aria-label="뒤로가기">
              <BackIcon />
            </button>
            <span className="text-[15px] font-bold leading-[1.5] text-black">장바구니</span>
            <div className="w-3 h-6 opacity-0" />
          </div>

          {/* ── 전체선택 + 선택삭제 탭 ────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e6e6e6]">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 h-7 cursor-pointer"
              aria-label={allActiveChecked ? '전체 해제' : '전체 선택'}
            >
              <CheckIcon checked={allActiveChecked} />
              <span className={`text-[13px] leading-[1.5] tracking-[-0.26px] ${allActiveChecked ? 'text-[#3f3835]' : 'text-[#999694]'}`}>
                전체선택
              </span>
            </button>

            {hasSelected && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 text-[15px] font-bold leading-[1.5] text-[#3f3835] cursor-pointer"
                aria-label="선택삭제"
              >
                <Image src="/assets/icons/additional/Iconex/Trash can.svg" alt="선택삭제" width={20} height={20} />
              </button>
            )}
          </div>
        </div>

        {/* ── 콘텐츠 영역 ───────────────── */}
        <div className="flex flex-col gap-11 px-4 py-8">
          {/* 담긴 상품 */}
          {activeItems.length > 0 && (
            <div className="flex flex-col gap-6">
              <p className="text-[19px] font-bold leading-[1.5] text-black">담긴 상품</p>
              <div className="flex flex-col gap-5">
                {activeItems.map((item, idx) => (
                  <div key={item.id}>
                    <CartItemCard
                      item={item}
                      optionVariant={resolveOptionVariantByCount((item.productId ? optionCatalogByProductId[item.productId]?.length : 0) || item.options.length)}
                      optionChoices={item.productId ? optionCatalogByProductId[item.productId] ?? [] : []}
                      checked={checkedIds.has(item.id)}
                      onCheck={() => toggleItem(item.id)}
                      onQtyChange={(qty) => setQty(item.id, qty)}
                      onChangeOptions={(optionIndex, nextValue) => changeOptions(item.id, optionIndex, nextValue)}
                      onRemove={() => removeItem(item.id)}
                      disabled={false}
                    />
                    {idx < activeItems.length - 1 && (
                      <div className="h-px bg-[#f1f1f1] mt-5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 섹션 구분선 */}
          {activeItems.length > 0 && soldOutItems.length > 0 && (
            <div className="h-px bg-[#f1f1f1]" />
          )}

          {/* 품절된 상품 */}
          {soldOutItems.length > 0 && (
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setShowSoldOut(!showSoldOut)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-70"
                aria-expanded={showSoldOut}
                aria-controls="soldout-list"
              >
                <p className="text-[19px] font-bold leading-[1.5] text-black">품절된 상품</p>
                <div className={`transform transition-transform duration-300 ${showSoldOut ? 'rotate-0' : '-rotate-90'}`}>
                  <ChevronDownIcon size={20} />
                </div>
              </button>
              {showSoldOut && (
                <div id="soldout-list" className="flex flex-col gap-5">
                  {soldOutItems.map((item, idx) => (
                    <div key={item.id}>
                      <CartItemCard
                        item={item}
                        optionVariant={resolveOptionVariantByCount((item.productId ? optionCatalogByProductId[item.productId]?.length : 0) || item.options.length)}
                        optionChoices={item.productId ? optionCatalogByProductId[item.productId] ?? [] : []}
                        checked={false}
                        onCheck={() => {}}
                        onQtyChange={() => {}}
                        onChangeOptions={() => {}}
                        onRemove={() => removeItem(item.id)}
                        disabled={true}
                      />
                      {idx < soldOutItems.length - 1 && (
                        <div className="h-px bg-[#f1f1f1] mt-5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 섹션 구분선: 판매 종료된 상품 위 */}
          {(activeItems.length > 0 || soldOutItems.length > 0) && salesEndedItems.length > 0 && (
            <div className="h-px bg-[#f1f1f1]" />
          )}

          {/* 판매 종료된 상품 */}
          {salesEndedItems.length > 0 && (
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setShowSalesEnded(!showSalesEnded)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-70"
                aria-expanded={showSalesEnded}
                aria-controls="salesended-list"
              >
                <p className="text-[19px] font-bold leading-[1.5] text-black">판매 종료된 상품</p>
                <div className={`transform transition-transform duration-300 ${showSalesEnded ? 'rotate-0' : '-rotate-90'}`}>
                  <ChevronDownIcon size={20} />
                </div>
              </button>
              {showSalesEnded && (
                <div id="salesended-list" className="flex flex-col gap-5">
                  {salesEndedItems.map((item, idx) => (
                    <div key={item.id}>
                      <CartItemCard
                        item={item}
                        optionVariant={resolveOptionVariantByCount((item.productId ? optionCatalogByProductId[item.productId]?.length : 0) || item.options.length)}
                        optionChoices={item.productId ? optionCatalogByProductId[item.productId] ?? [] : []}
                        checked={false}
                        onCheck={() => {}}
                        onQtyChange={() => {}}
                        onChangeOptions={() => {}}
                        onRemove={() => removeItem(item.id)}
                        disabled={true}
                      />
                      {idx < salesEndedItems.length - 1 && (
                        <div className="h-px bg-[#f1f1f1] mt-5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 빈 카트 메시지 */}
          {items.length === 0 && (
            <div className="flex flex-col flex-1 items-center justify-center py-20">
              <p className="text-[15px] text-[#999694] leading-[1.5]">장바구니가 비어 있습니다</p>
            </div>
          )}

        </div>

      </div>

      {/* ── 선택 시 하단 바 ───────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          hasSelected ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center">
          <div className="w-full max-w-[375px] bg-[#fdfdfd] border-t border-[#f1f1f1] flex flex-col gap-2 pt-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between px-5 leading-[1.5] text-[15px] text-black">
                <span>총 금액</span>
                <span className="font-bold">
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
              <div className="px-5">
                <button
                  className={`w-full text-[15px] font-bold leading-[1.5] p-4 rounded-lg flex items-center justify-center gap-1 ${hasSelected ? 'bg-[#3f3835] text-[#fdfdfd] cursor-pointer' : 'bg-[#DDDCDB] text-[#999694] cursor-not-allowed'}`}
                  disabled={!hasSelected}
                  onClick={handleOrderSelected}
                >
                  {totalCount}개 주문하기
                </button>
              </div>
            </div>
            <div className="h-[34px] flex items-end justify-center pb-2">
              <div className="w-[134px] h-[5px] bg-black rounded-[100px]" />
            </div>
          </div>
        </div>
      </div>

      {orderWarningMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.23)] px-4">
          <Modal
            variant="one button"
            className="shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]"
            title={orderWarningMessage}
            confirmText="확인"
            onConfirm={() => setOrderWarningMessage(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
