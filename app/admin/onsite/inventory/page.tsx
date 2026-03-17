'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Dropdown from '@/components/ui/button/Dropdown';
import TabBar from '@/components/ui/button/TabBar';
import SearchBar from '@/components/ui/common/SearchBar';
import { Matrix_Attribute_02, Matrix_Contents_02 } from '@/components/ui/admin/onsite';

type InventoryStatus = 'ACTIVE' | 'COMPLETED';
type StatusFilter = 'ALL' | InventoryStatus;
type SoldOutFilter = 'ALL' | 'IN_STOCK' | 'SOLD_OUT';

type InventoryItem = {
  no: number;
  productId: string;
  productName: string;
  variantId: string;
  optionSignature: string;
  optionText: string[];
  salesStartDate: string;
  salesEndDate: string;
  status: InventoryStatus;
  isSoldOut: boolean;
};

type InventoryListResponse = {
  status: 'success' | 'error';
  data?: {
    totalCount: number;
    items: InventoryItem[];
  };
  message?: string;
  code?: string;
};

const statusDropdownItems = [
  { label: '전체', value: 'ALL' },
  { label: '진행중', value: 'ACTIVE' },
  { label: '진행완료', value: 'COMPLETED' },
];

const soldOutDropdownItems = [
  { label: '전체', value: 'ALL' },
  { label: '판매중', value: 'IN_STOCK' },
  { label: '품절', value: 'SOLD_OUT' },
];

function statusLabel(value: StatusFilter) {
  return statusDropdownItems.find((item) => item.value === value)?.label;
}

function soldOutLabel(value: SoldOutFilter) {
  return soldOutDropdownItems.find((item) => item.value === value)?.label;
}

export default function AdminOnsiteInventoryPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [soldOutFilter, setSoldOutFilter] = useState<SoldOutFilter>('ALL');
  const [statusOpen, setStatusOpen] = useState(false);
  const [soldOutOpen, setSoldOutOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const statusRef = useRef<HTMLDivElement | null>(null);
  const soldOutRef = useRef<HTMLDivElement | null>(null);

  const statusValueText = useMemo(
    () => (statusFilter === 'ALL' ? undefined : statusLabel(statusFilter)),
    [statusFilter]
  );
  const soldOutValueText = useMemo(
    () => (soldOutFilter === 'ALL' ? undefined : soldOutLabel(soldOutFilter)),
    [soldOutFilter]
  );
  const statusMenuItems = useMemo(
    () =>
      statusDropdownItems.filter((item) =>
        statusFilter === 'ALL' ? item.value !== 'ALL' : item.value !== statusFilter
      ),
    [statusFilter]
  );
  const soldOutMenuItems = useMemo(
    () =>
      soldOutDropdownItems.filter((item) =>
        soldOutFilter === 'ALL' ? item.value !== 'ALL' : item.value !== soldOutFilter
      ),
    [soldOutFilter]
  );

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false);
      if (soldOutRef.current && !soldOutRef.current.contains(target)) setSoldOutOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);

        const query = new URLSearchParams();
        if (search.trim()) query.set('name', search.trim());
        if (statusFilter !== 'ALL') query.set('status', statusFilter);
        if (soldOutFilter === 'IN_STOCK') query.set('isSoldOut', 'false');
        if (soldOutFilter === 'SOLD_OUT') query.set('isSoldOut', 'true');

        const res = await fetch(`/api/v1/admin/onsite/inventory/list?${query.toString()}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as InventoryListResponse;

        if (json.status === 'success' && json.data) {
          setTotalCount(json.data.totalCount);
          setItems(json.data.items);
          return;
        }

        setTotalCount(0);
        setItems([]);
      } catch (error) {
        console.error('Failed to fetch inventory list:', error);
        setTotalCount(0);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [search, statusFilter, soldOutFilter]);

  const handleSoldOutChange = async (variantId: string, nextValue: boolean) => {
    const target = items.find((item) => item.variantId === variantId);
    if (!target || target.status !== 'ACTIVE') return;

    const previous = target.isSoldOut;
    setItems((prev) =>
      prev.map((item) => (item.variantId === variantId ? { ...item, isSoldOut: nextValue } : item))
    );

    try {
      const res = await fetch('/api/v1/admin/onsite/inventory/soldout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, isSoldOut: nextValue }),
      });
      const json = await res.json();

      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? 'Failed to update sold out.');
      }
    } catch (error) {
      console.error('Failed to update sold out:', error);
      setItems((prev) =>
        prev.map((item) => (item.variantId === variantId ? { ...item, isSoldOut: previous } : item))
      );
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <div className="mx-auto flex w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="title-back" title="현장판매 관리" onBack={() => router.push('/admin')} />

        <div className="flex flex-col gap-6">
          <TabBar
            activeKey="inventory"
            onChange={(key) => {
              if (key === 'receipt') {
                router.push('/admin/onsite');
              }
            }}
            items={[
              { key: 'receipt', title: '수령 관리' },
              { key: 'inventory', title: '재고 관리' },
            ]}
          />

          <div className="flex flex-col gap-[10px] px-4">
            <SearchBar
              placeholder="상품명으로 검색"
              value={search}
              onChange={setSearch}
              className="h-10 border-[#DDDCDB] bg-[#FDFDFD]"
            />

            <div className="flex items-start gap-4">
              <div ref={statusRef} className="z-30 w-[110px]">
                <Dropdown
                  label="진행상태"
                  size="m"
                  state={statusOpen ? 'open' : statusFilter === 'ALL' ? 'default' : 'selected'}
                  placeholder="선택"
                  value={statusValueText}
                  open={statusOpen}
                  onToggle={() => {
                    setStatusOpen((prev) => !prev);
                  }}
                  onSelect={(value) => {
                    const next = (value as StatusFilter) || 'ALL';
                    setStatusFilter(next);
                    setStatusOpen(false);
                  }}
                  items={statusMenuItems}
                  className="[&>div:last-child]:absolute [&>div:last-child]:left-0 [&>div:last-child]:top-[65px] [&>div:last-child]:z-30 [&>div:last-child]:w-[162px]"
                />
              </div>

              <div ref={soldOutRef} className="z-30 w-[110px]">
                <Dropdown
                  label="품절여부"
                  size="m"
                  state={soldOutOpen ? 'open' : soldOutFilter === 'ALL' ? 'default' : 'selected'}
                  placeholder="선택"
                  value={soldOutValueText}
                  open={soldOutOpen}
                  onToggle={() => {
                    setSoldOutOpen((prev) => !prev);
                  }}
                  onSelect={(value) => {
                    const next = (value as SoldOutFilter) || 'ALL';
                    setSoldOutFilter(next);
                    setSoldOutOpen(false);
                  }}
                  items={soldOutMenuItems}
                  className="[&>div:last-child]:absolute [&>div:last-child]:left-0 [&>div:last-child]:top-[65px] [&>div:last-child]:z-30 [&>div:last-child]:w-[162px]"
                />
              </div>
            </div>
          </div>

          <div className="px-2 pb-8">
            <div className="px-3">
              <p className="text-[17px] font-bold leading-[1.5] text-neutral-10">전체 {totalCount}건</p>
            </div>

            <div className="mt-0 flex w-full flex-col">
              <Matrix_Attribute_02 className="w-full" />

              {loading ? (
                <div className="py-10 text-center text-sm text-neutral-7">불러오는 중...</div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center text-sm text-neutral-7">조회된 항목이 없습니다.</div>
              ) : (
                items.map((item) => (
                  <Matrix_Contents_02
                    key={item.variantId}
                    className="w-full"
                    no={item.no}
                    productName={item.productName}
                    optionText={item.optionText}
                    status={item.status}
                    isSoldOut={item.isSoldOut}
                    onSoldOutChange={(next) => handleSoldOutChange(item.variantId, next)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
