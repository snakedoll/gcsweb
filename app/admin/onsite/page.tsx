'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Filter from '@/components/ui/admin/product/Filter';
import TabBar from '@/components/ui/button/TabBar';
import Modal from '@/components/ui/common/Modal';
import SearchBar from '@/components/ui/common/SearchBar';
import { Matrix_Attribute_06, Matrix_Contents_06, PcTableRow_Buynow } from '@/components/ui/admin/onsite';

type ReceiptItem = {
  id: string;
  productType: number;
  paymentStatusCode: number;
  fulfillmentStatusCode: number;
  orderId: string;
  orderTime: string;
  fullOrderTime: string;
  paymentStatus: string;
  paymentMethodStr: string;
  paymentAmount: number;
  receiptStatus: string;
  impUid: string;
  bagOption?: boolean;
  requiresBagPackaging?: boolean;
  bagNoticeMessage?: string | null;
  orderSource?: 'QRSHOP' | 'SHOP';
  items: {
    id: string;
    name: string;
    options: string;
    price: number;
    quantity: number;
  }[];
};

type ReceiptGroup = {
  date: string;
  items: ReceiptItem[];
};

type OnsiteListResponse = {
  status: 'success' | 'error';
  data?: ReceiptGroup[];
  message?: string;
};

export default function AdminOnsitePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'qrshop' | 'shop'>('qrshop');
  const [groups, setGroups] = useState<ReceiptGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingReceiptId, setUpdatingReceiptId] = useState<string | null>(null);
  const [updatingCancelId, setUpdatingCancelId] = useState<string | null>(null);
  const [pendingCancelItem, setPendingCancelItem] = useState<ReceiptItem | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (sourceFilter !== 'all') query.set('source', sourceFilter);

      const res = await fetch(`/api/v1/admin/onsite/list?${query.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as OnsiteListResponse;

      if (json.status === 'success' && Array.isArray(json.data)) {
        const buyNowOnlyGroups = json.data
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.productType === 1),
          }))
          .filter((group) => group.items.length > 0);
        setGroups(buyNowOnlyGroups);
        return;
      }
      setGroups([]);
    } catch (error) {
      console.error('Failed to fetch onsite orders:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const totalCount = useMemo(
    () => groups.reduce((count, group) => count + group.items.length, 0),
    [groups]
  );

  const handleToggleReceipt = async (item: ReceiptItem) => {
    if (updatingReceiptId === item.id || item.paymentStatusCode === 3) return;

    try {
      setUpdatingReceiptId(item.id);
      const nextFulfillmentStatus = item.fulfillmentStatusCode === 1 ? 0 : 1;
      const res = await fetch(`/api/v1/admin/onsite/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillmentStatus: nextFulfillmentStatus }),
      });

      const json = await res.json();
      if (!res.ok || json?.status !== 'success') {
        alert(json?.message || '수령 상태 변경에 실패했습니다.');
        return;
      }

      await fetchGroups();
    } catch (error) {
      console.error('Failed to update receipt status:', error);
      alert('수령 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingReceiptId(null);
    }
  };

  const handleCancelOrder = async (item: ReceiptItem) => {
    if (updatingCancelId === item.id || item.paymentStatusCode === 3) return false;

    try {
      setUpdatingCancelId(item.id);
      const res = await fetch(`/api/v1/admin/onsite/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 3 }),
      });

      const json = await res.json();
      if (!res.ok || json?.status !== 'success') {
        alert(json?.message || '주문 취소에 실패했습니다.');
        return false;
      }

      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('주문 취소 중 오류가 발생했습니다.');
      return false;
    } finally {
      setUpdatingCancelId(null);
    }
  };

  const openCancelModal = (item: ReceiptItem) => {
    if (updatingCancelId === item.id || item.paymentStatusCode === 3) return;
    setPendingCancelItem(item);
  };

  const closeCancelModal = () => {
    if (pendingCancelItem && updatingCancelId === pendingCancelItem.id) return;
    setPendingCancelItem(null);
  };

  const confirmCancelOrder = async () => {
    if (!pendingCancelItem) return;
    const success = await handleCancelOrder(pendingCancelItem);
    if (success) {
      setPendingCancelItem(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F6F6F5] font-pretendard">
      <div className="mx-auto flex w-full max-w-[375px] flex-col bg-neutral-3 lg:hidden">
        <NavBar
          variant="title-back"
          title="현장판매 관리"
          onBack={() => router.push('/admin')}
          rightElement={
            <button
              onClick={() => {
                void fetchGroups();
              }}
              className="flex size-6 items-center justify-center"
              aria-label="목록 새로고침"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.57 20 11.99 20C15.72 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
                  fill="#3F3835"
                />
              </svg>
            </button>
          }
        />

        <div className="flex flex-col gap-6">
          <TabBar
            activeKey="receipt"
            onChange={(key) => {
              if (key === 'inventory') {
                router.push('/admin/onsite/inventory');
              }
            }}
            items={[
              { key: 'receipt', title: '수령 관리' },
              { key: 'inventory', title: '재고 관리' },
            ]}
          />

          <div className="px-4">
            <div className="flex flex-col gap-3">
              <SearchBar
                placeholder="주문번호로 검색"
                value={search}
                onChange={setSearch}
                className="h-10 border-[#DDDCDB] bg-[#FDFDFD]"
              />
              <div className="flex gap-2">
                {[
                  { key: 'all', label: '전체' },
                  { key: 'qrshop', label: 'QRshop' },
                  { key: 'shop', label: 'Shop' },
                ].map((row) => (
                  <Filter
                    key={row.key}
                    label={row.label}
                    selected={sourceFilter === row.key}
                    onClick={() => setSourceFilter(row.key as 'all' | 'qrshop' | 'shop')}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 px-2 pb-8">
            {loading ? (
              <div className="py-20 text-center text-[15px] text-[#6C6764]">불러오는 중...</div>
            ) : groups.length === 0 ? (
              <div className="py-20 text-center text-[15px] text-[#6C6764]">조회된 주문이 없습니다.</div>
            ) : (
              groups.map((group) => (
                <section key={group.date} className="flex flex-col gap-0">
                  <div className="flex items-center px-3">
                    <h2 className="typo-heading-xsmall text-neutral-10">{group.date}</h2>
                  </div>

                  <Matrix_Attribute_06 className="mt-0 w-full" />

                  <div className="flex flex-col">
                    {group.items.map((item) => (
                      <Matrix_Contents_06
                        key={item.id}
                        className="w-full"
                        orderCode={item.orderId}
                        orderTime={item.orderTime}
                        paymentLabel={item.paymentStatus}
                        receiptLabel={item.receiptStatus}
                        paymentTone={item.paymentStatus.includes('결제완료') ? 'orange' : 'gray'}
                        receiptTone={item.receiptStatus.includes('수령완료') ? 'gray' : 'orange'}
                        onClick={() => router.push(`/admin/onsite/${item.id}`)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
  
      <div className="hidden w-full lg:flex lg:min-h-screen lg:flex-col lg:items-center lg:pb-20">
        <div className="w-full bg-[#F6F6F5] px-6 py-[15px] shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
          <div className="mx-auto flex h-[28px] w-[1232px] items-center justify-between">
            <div className="flex items-center gap-[44px]">
              <button onClick={() => router.push('/admin')} className="flex size-7 items-center justify-center" aria-label="뒤로가기">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 13L1 7L7 1" stroke="#3F3835" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h1 className="text-[17px] font-bold text-[#3F3835]">수령 관리</h1>
            </div>
            <button
              onClick={() => {
                void fetchGroups();
              }}
              className="flex size-7 items-center justify-center"
              aria-label="목록 새로고침"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.57 20 11.99 20C15.72 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
                  fill="#3F3835"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex w-[1280px] flex-col gap-6 px-6 py-5">
          <div className="flex gap-4">
            <div className="flex h-[36px] w-[115px] items-center justify-center rounded-lg bg-[#E9DED2] px-4 py-2">
              <span className="text-[15px] font-bold text-[#2F2824]">수령 관리</span>
            </div>
            <button
              onClick={() => router.push('/admin/onsite/inventory')}
              className="flex h-[36px] w-[115px] items-center justify-center rounded-lg border border-[#DDDCDB] bg-[#FDFDFD] px-4 py-2"
            >
              <span className="text-[15px] font-bold text-[#999694]">재고 관리</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <SearchBar
              placeholder="주문번호로 검색"
              value={search}
              onChange={setSearch}
              className="h-10 border-[#DDDCDB] bg-[#FDFDFD]"
            />
            <div className="flex gap-2">
              {[
                { key: 'all', label: '전체' },
                { key: 'qrshop', label: 'QRshop' },
                { key: 'shop', label: 'Shop' },
              ].map((row) => (
                <Filter
                  key={row.key}
                  label={row.label}
                  selected={sourceFilter === row.key}
                  onClick={() => setSourceFilter(row.key as 'all' | 'qrshop' | 'shop')}
                />
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-[15px] text-[#6C6764]">불러오는 중...</div>
          ) : groups.length === 0 ? (
            <div className="py-20 text-center text-[15px] text-[#6C6764]">조회된 주문이 없습니다.</div>
          ) : (
            groups.map((group) => (
              <section key={group.date} className="flex flex-col gap-3">
                <h2 className="text-[17px] font-bold leading-[1.5] text-[#999694]">{group.date}</h2>

                <div className="flex flex-col gap-4">
                  <PcTableRow_Buynow variant="Header" className="w-full" />

                  {group.items.map((item, index) => {
                    const isCanceled = item.paymentStatusCode === 3;
                    const isReceiptUpdating = updatingReceiptId === item.id;
                    const isCancelUpdating = updatingCancelId === item.id;
                    const hasBagNotice = Boolean(item.requiresBagPackaging || item.bagOption);

                    const variant =
                      isCanceled
                        ? '주문취소완료'
                        : hasBagNotice
                          ? '봉투'
                          : item.items.length >= 2
                            ? 'multiple'
                            : item.fulfillmentStatusCode === 1
                              ? '수령완료'
                              : '미수령';

                    const mappedProducts = item.items.map((product) => ({
                      id: product.id,
                      name: product.name,
                      option: product.options || `${product.quantity}개`,
                      priceText: `${product.price.toLocaleString()}원`,
                    }));

                    const products = hasBagNotice
                      ? [
                          {
                            id: `bag-${item.id}`,
                            name: item.bagNoticeMessage ?? '봉투에 담아주세요!',
                            option: '',
                            priceText: '100원',
                            isBagNotice: true,
                          },
                          ...mappedProducts,
                        ]
                      : mappedProducts;

                    return (
                      <PcTableRow_Buynow
                        key={item.id}
                        className="w-full"
                        variant={variant}
                        no={index + 1}
                        orderDateTime={item.fullOrderTime}
                        orderNumber={item.orderId}
                        transactionId={item.impUid}
                        paymentInfoTitle={item.paymentMethodStr}
                        paymentAmountText={`${item.paymentAmount.toLocaleString()}원`}
                        paymentStatusText={item.paymentStatus}
                        products={products}
                        onReceiptClick={() => {
                          void handleToggleReceipt(item);
                        }}
                        onCancelClick={() => {
                          openCancelModal(item);
                        }}
                        receiptDisabled={isCanceled || isReceiptUpdating}
                        cancelDisabled={isCanceled || isCancelUpdating}
                        receiptLabel={isReceiptUpdating ? '처리중' : item.receiptStatus}
                        cancelLabel={isCancelUpdating ? '처리중' : isCanceled ? '주문 취소 완료' : '주문 취소'}
                        hoverable
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}

          <div className="pt-2 text-right text-[13px] text-[#6C6764]">총 {totalCount}건</div>
        </div>
      </div>

      {pendingCancelItem ? (
        <div className="fixed inset-0 z-50 hidden items-center justify-center bg-[rgba(0,0,0,0.3)] px-4 lg:flex">
          <Modal
            title="해당 주문을 취소하시겠습니까?"
            variant="Default"
            cancelText="취소"
            confirmText={updatingCancelId === pendingCancelItem.id ? '처리중' : '확인'}
            onCancel={closeCancelModal}
            onConfirm={() => {
              void confirmCancelOrder();
            }}
            disabled={updatingCancelId === pendingCancelItem.id}
          />
        </div>
      ) : null}
    </div>
  );
}


