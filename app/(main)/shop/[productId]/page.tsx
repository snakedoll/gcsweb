'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Modal from '@/components/ui/common/Modal';
import ProductDDay, { type ProductDDayColor } from '@/components/ui/admin/product/ProductDDay';
import BottomSheet, { type BottomSheetOption } from '@/components/ui/shop/BottomSheet';
import ShopCard from '@/components/ui/shop/ShopCard';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import { getSaleStatusByDate, type SaleStatus } from '@/lib/sale-date';

type ProductType = 0 | 1 | 2;
type ReceiveMethod = 0 | 1;
type SheetMode = 'none' | 'cart' | 'order';
type SheetSubmitMode = 'cart' | 'order';
type ConflictGuardMode = 'fund' | 'type';
const GUEST_ORDER_STORAGE_KEY = 'shop:buynow-guest-order-items';

interface PendingSheetAction {
  mode: SheetSubmitMode;
  quantity: number;
  optionData: Array<{ name: string; value: string; additionalPrice: number }>;
  skipAchievedCheck?: boolean;
  skipFundConflictCheck?: boolean;
  skipTypeConflictCheck?: boolean;
}

interface ProductOptionValue {
  value: string;
  additionalPrice: number | null;
}

interface ProductOption {
  name: string;
  values: ProductOptionValue[];
}

interface ShopProductDetail {
  id: string;
  teamId: string;
  teamName: string;
  type: ProductType;
  name: string;
  description: string;
  thumbnailUrl: string;
  detailImageUrls: string[];
  salesStartDate: string;
  salesEndDate: string;
  receiveMethod: ReceiveMethod;
  productionStartDate: string | null;
  productionEndDate: string | null;
  deliveryStartDate: string | null;
  deliveryEndDate: string | null;
  pickupStartDate: string | null;
  pickupEndDate: string | null;
  pickupLocation: string | null;
  goalAmount: number | null;
  currentAmount: number | null;
  isLiked: boolean;
  isInCart: boolean;
  price: number;
  options: ProductOption[];
}

type ProductDetailResponse = {
  status: 'success' | 'error';
  message?: string;
  code?: string;
  data?: {
    product?: ShopProductDetail;
  };
};

function formatWon(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

function calcProgressPercent(currentAmount: number | null, goalAmount: number | null) {
  if (typeof currentAmount !== 'number' || typeof goalAmount !== 'number' || goalAmount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((currentAmount / goalAmount) * 100)));
}

function getDdayPresentation(status: SaleStatus): { color: ProductDDayColor; text: string } {
  if (status === 'active') {
    return { color: 'Orange', text: 'D-day' };
  }
  if (status === 'scheduled') {
    return { color: 'Gray', text: '진행예정' };
  }
  return { color: 'Gray', text: '진행완료' };
}

function toTypeGroup(type: ProductType | number | null | undefined): 0 | 1 | null {
  if (typeof type !== 'number') return null;
  return type === 0 ? 0 : 1;
}

function NeutralHeartIcon({ liked }: { liked: boolean }) {
  if (liked) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20.2L10.55 18.88C5.4 14.2 2 11.12 2 7.35C2 4.27 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.27 22 7.35C22 11.12 18.6 14.2 13.45 18.88L12 20.2Z"
          fill="var(--color-orange-5)"
        />
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.2L10.55 18.88C5.4 14.2 2 11.12 2 7.35C2 4.27 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.27 22 7.35C22 11.12 18.6 14.2 13.45 18.88L12 20.2Z"
        stroke="var(--color-neutral-6)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NeutralCartIcon({ active = false }: { active?: boolean }) {
  const stroke = active ? 'var(--color-neutral-8)' : 'var(--color-neutral-6)';
  const fill = active ? 'var(--color-neutral-8)' : 'var(--color-neutral-6)';

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 3L3.04936 3.20987C3.91136 3.38227 4.55973 4.09732 4.6472 4.97203L4.8 6.5M4.8 6.5L5.7886 14.7383C5.90922 15.7435 6.76195 16.5 7.77435 16.5H16.7673C18.3733 16.5 19.7733 15.407 20.1628 13.8489L21.2855 9.35783C21.6485 7.90619 20.5505 6.5 19.0542 6.5H4.8Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M13 13.5H9" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="20" r="1.5" fill={fill} />
      <circle cx="17.5" cy="20" r="1.5" fill={fill} />
    </svg>
  );
}

function DateBlock({
  label,
  value,
  dday,
}: {
  label: string;
  value: string;
  dday?: { color: ProductDDayColor; text: string };
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className={cn('flex w-full items-center', dday ? 'gap-2' : '')}>
        <p className="typo-heading-xxsmall text-neutral-12">{label}</p>
        {dday ? <ProductDDay color={dday.color} text={dday.text} /> : null}
      </div>
      <div className="flex h-[31px] w-full items-start rounded-[8px] bg-neutral-1 px-[11px] pt-[4px]">
        <p className="typo-body-xsmall text-neutral-9">{value}</p>
      </div>
    </div>
  );
}

export default function ShopDetailPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isUserLoading } = useUser();
  const params = useParams<{ productId: string }>();
  const productId = useMemo(() => {
    const raw = params?.productId;
    if (typeof raw !== 'string') return '';
    return raw.trim();
  }, [params]);

  const [product, setProduct] = useState<ShopProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingCart, setAddingCart] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('none');
  const [showCartAddedModal, setShowCartAddedModal] = useState(false);
  const [showLoginOrderModal, setShowLoginOrderModal] = useState(false);
  const [showFundAchievedModal, setShowFundAchievedModal] = useState(false);
  const [showFundConflictModal, setShowFundConflictModal] = useState(false);
  const [conflictGuardMode, setConflictGuardMode] = useState<ConflictGuardMode>('fund');
  const [pendingSheetAction, setPendingSheetAction] = useState<PendingSheetAction | null>(null);
  const [openOptionIndex, setOpenOptionIndex] = useState<number | null>(null);
  const [selectedOptionValues, setSelectedOptionValues] = useState<Array<string | null>>([]);
  const [sheetQuantity, setSheetQuantity] = useState(1);
  const [togglingLike, setTogglingLike] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!productId) {
        setLoading(false);
        setErrorMessage('유효하지 않은 상품 ID입니다.');
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/v1/shop/products/${productId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as ProductDetailResponse;

        if (!res.ok || json.status !== 'success' || !json.data?.product) {
          throw new Error(json.message ?? '상품 정보를 불러오지 못했습니다.');
        }

        if (cancelled) return;
        setProduct(json.data.product);
      } catch (error) {
        if (cancelled) return;
        setProduct(null);
        setErrorMessage(error instanceof Error ? error.message : '상품 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const saleStatus = useMemo<SaleStatus>(() => {
    if (!product) return 'completed';
    return getSaleStatusByDate(product.salesStartDate, product.salesEndDate);
  }, [product]);

  const dday = useMemo(() => {
    if (!product) return getDdayPresentation('completed');
    return getDdayPresentation(saleStatus);
  }, [product, saleStatus]);
  const nonFundDday = useMemo<{ color: ProductDDayColor; text: string }>(
    () => ({ color: 'Gray', text: dday.text }),
    [dday.text]
  );

  const progressPercent = useMemo(() => {
    if (!product || product.type !== 0) return 0;
    return calcProgressPercent(product.currentAmount, product.goalAmount);
  }, [product]);

  const isAchieved = product?.type === 0 && progressPercent >= 100;
  const orderDisabled = saleStatus !== 'active';
  const isPartnerUp = product?.type === 2;
  const canUseCartSheet = Boolean(product && (product.type === 0 || product.type === 1));
  const isSheetOpen = sheetMode !== 'none';
  const isCartSheetOpen = sheetMode === 'cart';

  const sheetOptions = useMemo<BottomSheetOption[]>(() => {
    const isGraduationArtbookFunding =
      (product?.name ?? '').trim().toLowerCase() === 'graduation artbook funding';

    if (isGraduationArtbookFunding) {
      return [
        {
          name: 'color',
          values: [{ value: 'black' }, { value: 'white' }, { value: 'pink' }],
        },
        {
          name: 'size',
          values: [{ value: 's' }, { value: 'm' }, { value: 'l' }],
        },
      ];
    }

    return (product?.options ?? []).map((option) => ({
      name: option.name || '옵션',
      values: (option.values ?? []).map((value) => ({
        value: value.value,
        additionalPrice: value.additionalPrice ?? 0,
      })),
    }));
  }, [product]);

  const requiredOptionIndexes = useMemo(() => {
    return sheetOptions
      .map((option, index) => (option.values.length > 0 ? index : -1))
      .filter((index) => index >= 0);
  }, [sheetOptions]);

  const isAllOptionsSelected = useMemo(() => {
    if (requiredOptionIndexes.length === 0) return true;
    return requiredOptionIndexes.every((index) => {
      const selected = selectedOptionValues[index];
      return typeof selected === 'string' && selected.length > 0;
    });
  }, [requiredOptionIndexes, selectedOptionValues]);

  const selectedAdditionalAmount = useMemo(() => {
    return selectedOptionValues.reduce((sum, selectedValue, optionIndex) => {
      if (!selectedValue) return sum;
      const found = sheetOptions[optionIndex]?.values.find((value) => value.value === selectedValue);
      return sum + Number(found?.additionalPrice ?? 0);
    }, 0);
  }, [selectedOptionValues, sheetOptions]);

  const cartTotalPrice = useMemo(() => {
    if (!product) return 0;
    return Math.max(0, (product.price + selectedAdditionalAmount) * sheetQuantity);
  }, [product, selectedAdditionalAmount, sheetQuantity]);

  const cartSheetVariant = useMemo(() => {
    if (saleStatus !== 'active') return '주문 불가';
    if (isAllOptionsSelected) return '선택';
    if (openOptionIndex !== null) return '선택중';
    return '미선택';
  }, [isAllOptionsSelected, openOptionIndex, saleStatus]);

  useEffect(() => {
    if (!product?.id) return;
    setOpenOptionIndex(null);
    setSelectedOptionValues(new Array(sheetOptions.length).fill(null));
    setSheetQuantity(1);
    setSheetMode('none');
    setShowCartAddedModal(false);
    setShowLoginOrderModal(false);
    setShowFundAchievedModal(false);
    setShowFundConflictModal(false);
    setConflictGuardMode('fund');
    setPendingSheetAction(null);
  }, [product?.id, sheetOptions.length]);

  const buildOptionData = () => {
    return requiredOptionIndexes.map((index) => {
      const option = sheetOptions[index];
      const selectedValue = selectedOptionValues[index];
      const selectedMeta = option?.values.find((value) => value.value === selectedValue);

      return {
        name: option?.name ?? `옵션 ${index + 1}`,
        value: selectedValue ?? '',
        additionalPrice: Number(selectedMeta?.additionalPrice ?? 0),
      };
    });
  };

  const fetchCartItemsForGuard = async () => {
    const res = await fetch('/api/v1/mypage/cart/list?page=1&size=100', { cache: 'no-store' });
    if (res.status === 401) {
      return {
        unauthorized: true as const,
        items: [] as Array<{ cartItemId: string; productId: string | null; type: ProductType | null }>,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      data?: { cartItems?: Array<{ cartItemId?: string; productId?: string | null; type?: number | null }> };
    };
    const items = (json?.data?.cartItems ?? [])
      .filter((item) => typeof item.cartItemId === 'string' && item.cartItemId.trim().length > 0)
      .map((item) => ({
        cartItemId: item.cartItemId as string,
        productId: item.productId ?? null,
        type: typeof item.type === 'number' ? (item.type as ProductType) : null,
      }));
    return { unauthorized: false as const, items };
  };

  const clearCartItemsForFundGuard = async (cartItemIds: string[]) => {
    if (cartItemIds.length === 0) return true;
    const res = await fetch('/api/v1/mypage/cart/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItemIds }),
    });
    return res.ok;
  };

  const resolveOrderPagePath = (target: ShopProductDetail, cartItemId?: string | number | null) => {
    const query =
      cartItemId !== undefined && cartItemId !== null
        ? `?cartItemIds=${encodeURIComponent(String(cartItemId))}`
        : '';

    if (target.type === 0) {
      return target.receiveMethod === 0 ? `/shop/orders${query}` : `/shop/orders/pickup${query}`;
    }
    if (target.type === 1 || target.type === 2) {
      return `/shop/orders/buynow${query}`;
    }
    return '/shop/orders/buynow';
  };

  const buildGuestOrderItems = (action: PendingSheetAction) => {
    if (!product) return [];
    const additionalPrice = action.optionData.reduce((sum, option) => {
      const value = Number(option.additionalPrice ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const unitPrice = Math.max(0, product.price + additionalPrice);
    const totalPrice = unitPrice * action.quantity;
    const optionText = action.optionData.length
      ? `${action.optionData.map((opt) => opt.value).join(' / ')} / ${action.quantity}개`
      : `${action.quantity}개`;

    return [
      {
        id: `guest-${product.id}`,
        productId: product.id,
        quantity: action.quantity,
        unitPrice,
        optionData: action.optionData,
        brand: product.teamName || '팀명',
        title: product.name || '상품',
        optionText,
        priceText: `${totalPrice.toLocaleString('ko-KR')}원`,
        imageUrl: product.thumbnailUrl || '',
      },
    ];
  };

  const executeAddToCart = async (action: PendingSheetAction) => {
    if (!product) return;
    setAddingCart(true);
    try {
      const res = await fetch('/api/v1/mypage/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: action.quantity,
          optionData: action.optionData,
        }),
      });

      if (res.status === 401) {
        setShowLoginOrderModal(true);
        return;
      }

      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        data?: { cartItemId?: string | number };
      };
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message ?? (action.mode === 'cart' ? '장바구니 담기 중 오류가 발생했습니다.' : '주문 처리 중 오류가 발생했습니다.'));
      }

      setProduct((prev) => (prev ? { ...prev, isInCart: true } : prev));
      setSheetMode('none');
      setOpenOptionIndex(null);
      setPendingSheetAction(null);

      if (action.mode === 'cart') {
        setShowCartAddedModal(true);
      } else {
        router.push(resolveOrderPagePath(product, json?.data?.cartItemId ?? null));
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setAddingCart(false);
    }
  };

  const submitWithGuards = async (action: PendingSheetAction) => {
    if (!product || addingCart || saleStatus !== 'active') return;

    if (!isAuthenticated) {
      if (product.type === 1) {
        const guestItems = buildGuestOrderItems(action);
        try {
          sessionStorage.setItem(GUEST_ORDER_STORAGE_KEY, JSON.stringify(guestItems));
        } catch (_) {
          window.alert('주문 정보를 저장하지 못했습니다. 다시 시도해주세요.');
          return;
        }
        setSheetMode('none');
        setOpenOptionIndex(null);
        setPendingSheetAction(null);
        router.push('/shop/orders/buynow-guest');
        return;
      }
      setPendingSheetAction(action);
      setShowLoginOrderModal(true);
      return;
    }

    if (!action.skipAchievedCheck && product.type === 0 && isAchieved) {
      setPendingSheetAction(action);
      setShowFundAchievedModal(true);
      return;
    }

    let cartSnapshot: Awaited<ReturnType<typeof fetchCartItemsForGuard>> | null = null;
    if (!action.skipTypeConflictCheck || (!action.skipFundConflictCheck && product.type === 0)) {
      cartSnapshot = await fetchCartItemsForGuard();
    }

    if (cartSnapshot && cartSnapshot.unauthorized) {
      setPendingSheetAction(action);
      setShowLoginOrderModal(true);
      return;
    }

    if (!action.skipTypeConflictCheck && cartSnapshot) {
      const targetTypeGroup = toTypeGroup(product.type);
      const hasDifferentType = cartSnapshot.items.some((item) => {
        const itemTypeGroup = toTypeGroup(item.type);
        return itemTypeGroup !== null && targetTypeGroup !== null && itemTypeGroup !== targetTypeGroup;
      });
      if (hasDifferentType) {
        setPendingSheetAction(action);
        setConflictGuardMode('type');
        setShowFundConflictModal(true);
        return;
      }
    }

    if (!action.skipFundConflictCheck && product.type === 0 && cartSnapshot) {
      const hasOtherProduct = cartSnapshot.items.some((item) => item.productId && item.productId !== product.id);
      if (hasOtherProduct) {
        setPendingSheetAction(action);
        setConflictGuardMode('fund');
        setShowFundConflictModal(true);
        return;
      }
    }

    await executeAddToCart(action);
  };

  const handleToggleLike = async () => {
    if (!product || togglingLike) return;
    if (!isAuthenticated) {
      setShowLoginOrderModal(true);
      return;
    }

    // 1. 낙관적 업데이트 (Optimistic Update)
    const originalIsLiked = product.isLiked;
    setProduct((prev) => prev ? { ...prev, isLiked: !originalIsLiked } : prev);
    
    setTogglingLike(true);
    try {
      const res = await fetch(`/api/v1/shop/products/${product.id}/like`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message ?? '좋아요 상태를 변경하지 못했습니다.');
      }

      // 2. 서버 데이터와 동기화 (필요한 경우)
      const serverIsLiked = json.data?.isLiked;
      if (serverIsLiked !== undefined && serverIsLiked !== !originalIsLiked) {
        setProduct((prev) => prev ? { ...prev, isLiked: serverIsLiked } : prev);
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
      // 3. 에러 발생 시 롤백
      setProduct((prev) => prev ? { ...prev, isLiked: originalIsLiked } : prev);
      window.alert(err instanceof Error ? err.message : '요청 처리에 실패했습니다.');
    } finally {
      setTogglingLike(false);
    }
  };

  const handleOrder = async () => {
    if (!product || orderDisabled || addingCart) return;
    if (product.isInCart) {
      router.push(resolveOrderPagePath(product));
      return;
    }
    await executeAddToCart({ mode: 'order', quantity: 1, optionData: [] });
  };

  const handleOpenCartSheet = () => {
    if (!canUseCartSheet) return;

    if (sheetMode === 'cart') {
      setSheetMode('none');
      setOpenOptionIndex(null);
      return;
    }

    setSelectedOptionValues(new Array(sheetOptions.length).fill(null));
    setSheetQuantity(1);
    setOpenOptionIndex(null);
    setSheetMode('cart');
  };

  const handleOpenOrderSheet = () => {
    if (product?.type === 0 && !isAuthenticated && !isUserLoading) {
      setShowLoginOrderModal(true);
      return;
    }

    if (!canUseCartSheet) {
      void handleOrder();
      return;
    }

    if (sheetMode === 'order') {
      return;
    }

    setSelectedOptionValues(new Array(sheetOptions.length).fill(null));
    setSheetQuantity(1);
    setOpenOptionIndex(null);
    setSheetMode('order');
  };

  const handleOptionToggle = (index: number) => {
    if (!sheetOptions[index] || sheetOptions[index].values.length === 0) return;
    setOpenOptionIndex((prev) => (prev === index ? null : index));
  };

  const handleOptionSelect = (optionIndex: number, value: string) => {
    setSelectedOptionValues((prev) => {
      const next = [...prev];
      next[optionIndex] = value;
      return next;
    });

    setOpenOptionIndex(null);
  };

  const handleAddToCart = async () => {
    if (!product || addingCart || !isAllOptionsSelected || saleStatus !== 'active') return;
    await submitWithGuards({
      mode: 'cart',
      quantity: sheetQuantity,
      optionData: buildOptionData(),
    });
  };

  const handleOrderFromSheet = async () => {
    if (!product || addingCart || !isAllOptionsSelected || saleStatus !== 'active') return;
    await submitWithGuards({
      mode: 'order',
      quantity: sheetQuantity,
      optionData: buildOptionData(),
    });
  };

  const handleConfirmFundAchievedModal = () => {
    if (!pendingSheetAction) {
      setShowFundAchievedModal(false);
      return;
    }
    setShowFundAchievedModal(false);
    void submitWithGuards({
      ...pendingSheetAction,
      skipAchievedCheck: true,
    });
  };

  const handleConfirmFundConflictModal = async () => {
    if (!pendingSheetAction || !product) {
      setShowFundConflictModal(false);
      return;
    }

    const cartSnapshot = await fetchCartItemsForGuard();
    if (cartSnapshot.unauthorized) {
      setShowFundConflictModal(false);
      setShowLoginOrderModal(true);
      return;
    }

    const deleteTargets = cartSnapshot.items
      .filter((item) => {
        if (conflictGuardMode === 'fund') {
          return item.productId && item.productId !== product.id;
        }
        const itemTypeGroup = toTypeGroup(item.type);
        const targetTypeGroup = toTypeGroup(product.type);
        return itemTypeGroup !== null && targetTypeGroup !== null && itemTypeGroup !== targetTypeGroup;
      })
      .map((item) => item.cartItemId);

    const deleted = await clearCartItemsForFundGuard(deleteTargets);
    if (!deleted) {
      window.alert('기존 장바구니 상품을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setShowFundConflictModal(false);
    await submitWithGuards({
      ...pendingSheetAction,
      skipFundConflictCheck: true,
      skipTypeConflictCheck: true,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="logo-back" />

        <main className="flex-1">
          {loading ? (
            <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <p className="typo-body-small text-neutral-8">상품 정보를 불러오는 중입니다...</p>
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="typo-body-small text-neutral-9">{errorMessage}</p>
              <button
                type="button"
                onClick={() => router.push('/shop')}
                className="rounded-lg bg-orange-5 px-4 py-2 typo-body-small-bold text-neutral-2"
              >
                쇼핑 목록으로 이동
              </button>
            </div>
          ) : null}

          {!loading && !errorMessage && product ? (
            <>
              <ShopCard
                className="w-full"
                variant={product.type === 0 ? 'fund' : 'buynow_partnerup'}
                brand={product.teamName || '팀명'}
                title={product.name || '상품명'}
                description={product.description || ''}
                imageSrc={product.thumbnailUrl || undefined}
                statusLabel={isAchieved ? '달성' : '미달성'}
                percentText={`${progressPercent}%`}
                targetAmountText={`목표 금액 : ${formatWon(product.goalAmount)}`}
                progressPercent={progressPercent}
              />

              <section className="mt-[40px] flex flex-col gap-[26px] px-4 py-0">
                {product.type === 0 ? (
                  <>
                    <DateBlock label="펀딩 기간" value={formatDateRange(product.salesStartDate, product.salesEndDate)} dday={dday} />
                    {product.receiveMethod === 0 ? (
                      <>
                        <DateBlock label="예상 제작 기간" value={formatDateRange(product.productionStartDate, product.productionEndDate)} />
                        <DateBlock label="예상 배송 기간" value={formatDateRange(product.deliveryStartDate, product.deliveryEndDate)} />
                      </>
                    ) : (
                      <>
                        <DateBlock label="수령 기간" value={formatDateRange(product.pickupStartDate, product.pickupEndDate)} />
                        <DateBlock label="수령 장소" value={product.pickupLocation || '-'} />
                      </>
                    )}
                  </>
                ) : (
                  <DateBlock
                    label="판매 기간"
                    value={formatDateRange(product.salesStartDate, product.salesEndDate)}
                    dday={nonFundDday}
                  />
                )}
              </section>

              <section className="mt-[60px] flex flex-col">
                {product.detailImageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className={cn('relative w-full', product.type === 0 ? '' : 'h-[529px] overflow-hidden')}
                  >
                    <Image
                      src={url}
                      alt={`상품 상세 이미지 ${index + 1}`}
                      width={375}
                      height={529}
                      className={cn('w-full object-cover', product.type === 0 ? 'h-auto' : 'h-[529px]')}
                    />
                  </div>
                ))}
              </section>
            </>
          ) : null}
        </main>

        {!loading && !errorMessage && product && isSheetOpen && canUseCartSheet ? (
          <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[375px] -translate-x-1/2 overflow-hidden rounded-t-[30px] bg-neutral-3">
            <BottomSheet
              className="w-full pb-0"
              variant={cartSheetVariant}
              options={sheetOptions}
              selectedValues={selectedOptionValues}
              openOptionIndex={openOptionIndex}
              quantity={sheetQuantity}
              totalPriceText={formatWon(cartTotalPrice)}
              onOptionToggle={handleOptionToggle}
              onOptionSelect={handleOptionSelect}
              onQuantityChange={(next) => setSheetQuantity(Math.max(1, next))}
            />
            <div className="border-t border-neutral-4 px-5 py-[13px]">
              <div className={cn('flex w-full items-center', isPartnerUp ? 'gap-[23px]' : 'gap-5')}>
                <button type="button" className="inline-flex h-6 w-6 items-center justify-center" aria-label="찜" onClick={handleToggleLike} disabled={togglingLike}>
                  <NeutralHeartIcon liked={product.isLiked} />
                </button>
                {!isPartnerUp ? (
                  <button type="button" className="inline-flex h-6 w-6 items-center justify-center" aria-label="장바구니" onClick={handleOpenCartSheet}>
                    <NeutralCartIcon active={isCartSheetOpen} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={isSheetOpen ? (sheetMode === 'cart' ? handleAddToCart : handleOrderFromSheet) : handleOpenOrderSheet}
                  disabled={isSheetOpen ? !isAllOptionsSelected || addingCart || orderDisabled : orderDisabled || addingCart}
                  className={cn(
                    'h-[48px] min-w-0 flex-1 rounded-lg px-4 typo-body-small-bold text-neutral-2',
                    isSheetOpen ? (!isAllOptionsSelected || addingCart || orderDisabled ? 'cursor-not-allowed bg-orange-3' : 'cursor-pointer bg-orange-5') : orderDisabled || addingCart ? 'cursor-not-allowed bg-orange-3' : 'cursor-pointer bg-orange-5'
                  )}
                >
                  {isSheetOpen ? (sheetMode === 'cart' ? '장바구니에 담기' : '주문하기') : '주문하기'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !errorMessage && product && !(isSheetOpen && canUseCartSheet) ? (
          <div className="sticky bottom-0 z-20 border-t border-neutral-4 bg-neutral-3 px-5 py-[13px]">
            <div className={cn('mx-auto flex w-full max-w-[375px] items-center', isPartnerUp ? 'gap-[23px]' : 'gap-5')}>
              <button type="button" className="inline-flex h-6 w-6 items-center justify-center" aria-label="찜" onClick={handleToggleLike} disabled={togglingLike}>
                <NeutralHeartIcon liked={product.isLiked} />
              </button>
              {!isPartnerUp ? (
                <button type="button" className="inline-flex h-6 w-6 items-center justify-center" aria-label="장바구니" onClick={handleOpenCartSheet}>
                  <NeutralCartIcon active={isCartSheetOpen} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={isSheetOpen ? (sheetMode === 'cart' ? handleAddToCart : handleOrderFromSheet) : handleOpenOrderSheet}
                disabled={isSheetOpen ? !isAllOptionsSelected || addingCart || orderDisabled : orderDisabled || addingCart}
                className={cn(
                  'h-[48px] min-w-0 flex-1 rounded-lg px-4 typo-body-small-bold text-neutral-2',
                  isSheetOpen ? (!isAllOptionsSelected || addingCart || orderDisabled ? 'cursor-not-allowed bg-orange-3' : 'cursor-pointer bg-orange-5') : orderDisabled || addingCart ? 'cursor-not-allowed bg-orange-3' : 'cursor-pointer bg-orange-5'
                )}
              >
                {isSheetOpen ? (sheetMode === 'cart' ? '장바구니에 담기' : '주문하기') : '주문하기'}
              </button>
            </div>
          </div>
        ) : null}

        {showCartAddedModal ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.23)] px-4">
            <Modal
              variant="Default"
              className="shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]"
              title="장바구니로 이동하시겠습니까?"
              cancelText="계속 쇼핑"
              confirmText="장바구니로 이동"
              onCancel={() => setShowCartAddedModal(false)}
              onConfirm={() => router.push('/cart')}
            />
          </div>
        ) : null}

        {showFundConflictModal ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.23)] px-4">
            <Modal
              variant="Large"
              className="shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]"
              title={
                conflictGuardMode === 'fund'
                  ? 'Fund 상품은 동일 상품만 담을 수 있습니다.'
                  : '상품 유형이 다른 상품은 동시에 담을 수 없습니다.'
              }
              description="선택하신 상품을 장바구니에 담으면 이전에 담은 상품은 삭제됩니다."
              cancelText="취소"
              confirmText="담기"
              onCancel={() => {
                setShowFundConflictModal(false);
                setConflictGuardMode('fund');
                setPendingSheetAction(null);
              }}
              onConfirm={() => {
                void handleConfirmFundConflictModal();
              }}
            />
          </div>
        ) : null}

        {showFundAchievedModal ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.23)] px-4">
            <Modal
              variant="one button"
              className="shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]"
              title={'펀딩 대기자로, 펀딩 마감일 기준 달성률에 따라\n결제에 실패할 수도 있습니다'}
              confirmText="확인"
              onConfirm={handleConfirmFundAchievedModal}
            />
          </div>
        ) : null}

        {showLoginOrderModal ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.23)] px-4">
            <Modal
              variant="one button"
              className="shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]"
              title="로그인 사용자만 주문 가능합니다."
              confirmText="로그인 하러가기"
              onConfirm={() => router.push('/login')}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
