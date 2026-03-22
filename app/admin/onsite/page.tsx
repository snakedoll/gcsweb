'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import TabBar from '@/components/ui/button/TabBar';
import SearchBar from '@/components/ui/common/SearchBar';
import Tag from '@/components/ui/common/Tag';
import { cn } from '@/lib/utils';

interface ReceiptItem {
  id: string;
  orderId: string;
  name: string;
  phoneLast4: string;
  fullPhone: string;
  orderTime: string;
  fullOrderTime: string;
  paymentStatus: string;
  paymentMethodStr: string;
  paymentAmount: number;
  receiptStatus: string;
  items: {
    id: string;
    name: string;
    options: string;
    price: number;
    quantity: number;
  }[];
}

interface ReceiptGroup {
  date: string;
  items: ReceiptItem[];
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  variantCount: number;
  price: number;
}

export default function AdminOnsitePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('receipt');
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<ReceiptGroup[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalItem, setCancelModalItem] = useState<ReceiptItem | null>(null);

  useEffect(() => {

    fetchGroups();
  }, [search]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/onsite/list?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setGroups(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch onsite orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/onsite/inventory?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setInventory(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex min-h-screen w-full flex-col font-pretendard", activeTab === 'receipt' ? "lg:bg-[#f6f6f5] bg-neutral-3" : "bg-neutral-3")}>
      
      {/* MOBILE VIEW (hidden on PC if Receipt tab, active if Inventory or on Mobile) */}
      <div className={cn("mx-auto flex h-full w-full max-w-[375px] flex-col bg-neutral-3", activeTab === 'receipt' && "lg:hidden")}>
        <NavBar 
          variant="title-back" 
          title="현장판매 관리" 
          onBack={() => router.push('/admin')}
          rightElement={
            <button 
              onClick={() => fetchGroups()}
              className="flex size-6 items-center justify-center"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="#3F3835"/>
              </svg>
            </button>
          }
        />
        
        <TabBar
          activeKey={activeTab}
          onChange={(key) => {
            if (key === 'inventory') {
              router.push('/admin/onsite/inventory');
              return;
            }
            setActiveTab(key);
            setSearch(''); 
          }}
          items={[
            { key: 'receipt', title: '수령 관리' },
            { key: 'inventory', title: '재고 관리' },
          ]}
        />

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="px-4 py-6">
            <SearchBar 
              placeholder="주문자명, 전화번호 뒷자리로 검색" 
              value={search} 
              onChange={(val) => setSearch(val)} 
              className="bg-[#fdfdfd] border-[#dddcdb] h-10"
            />
          </div>

          {activeTab === 'receipt' ? (
            <div className="flex flex-col gap-6 pb-20 px-2">
              {loading ? (
                <div className="py-20 text-center text-neutral-8 typo-body-medium">
                  불러오는 중...
                </div>
              ) : groups.length === 0 ? (
                <div className="py-20 text-center text-neutral-8 typo-body-medium">
                  현황이 없습니다.
                </div>
              ) : (
                groups.map((group, groupIdx) => (
                  <div key={groupIdx} className="flex flex-col gap-0">
                    <div className="flex items-center px-3 h-[26px]">
                      <h3 className="text-[17px] font-bold text-[#3f3835] font-pretendard leading-[1.5]">
                        {group.date}
                      </h3>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center justify-between border-b border-[#dddcdb] h-[55px]">
                        <div className="w-[66px] shrink-0 pl-3 pr-1 pt-4 pb-1 text-[13px] font-semibold text-black tracking-[-0.26px]">주문자명</div>
                        <div className="w-[70px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px] leading-[1.2]">전화번호<br/>뒷자리</div>
                        <div className="w-[68px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px]">주문 시각</div>
                        <div className="w-[77px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px]">결제여부</div>
                        <div className="w-[77px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px]">수령여부</div>
                      </div>

                      <div className="flex flex-col">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/admin/onsite/${item.id}`)}
                            className="flex items-center justify-between h-[44px] border-b border-[#dddcdb] last:border-b-0 cursor-pointer hover:bg-neutral-3 transition-colors"
                          >
                            <div className="w-[66px] shrink-0 px-3 text-[13px] text-black tracking-[-0.26px] truncate font-pretendard">{item.name}</div>
                            <div className="w-[70px] shrink-0 px-1 text-center text-[13px] text-black tracking-[-0.26px] font-pretendard">{item.phoneLast4}</div>
                            <div className="w-[68px] shrink-0 px-1 text-center text-[13px] text-black tracking-[-0.26px] font-pretendard">{item.orderTime}</div>
                            <div className="w-[77px] shrink-0 px-1 flex items-center justify-center">
                              <Tag
                                contents={item.paymentStatus}
                                color={item.paymentStatus === '결제완료' ? 'solid-orange' : 'white-gray'}
                                className="w-[61px] h-6 rounded-[4px] px-0"
                              />
                            </div>
                            <div className="w-[77px] shrink-0 px-1 flex items-center justify-center">
                              <Tag
                                contents={item.receiptStatus}
                                color={item.receiptStatus === '수령완료' ? 'solid-orange' : 'white-gray'}
                                className="w-[61px] h-6 rounded-[4px] px-0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-8 typo-body-medium">
              재고 관리 기능은 현재 준비 중입니다.
            </div>
          )}
        </div>
      </div>

      {/* PC VIEW */}
      {activeTab === 'receipt' && (
        <div className="hidden lg:flex w-full min-h-screen flex-col items-center pb-20">
          {/* Top Bar Navigation */}
          <div className="w-full flex justify-center bg-[#f6f6f5] px-6 py-[15px] shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)]">
            <div className="w-[1232px] flex items-center justify-between h-[28px]">
              <div className="flex items-center gap-[44px]">
                {/* Back button */}
                <button onClick={() => router.push('/admin')} className="size-[28px] flex items-center justify-center">
                   <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 13L1 7L7 1" stroke="#3F3835" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                </button>
                <h1 className="text-[17px] font-bold text-[#3f3835]">현장판매 관리</h1>
              </div>
              <button onClick={fetchGroups} className="size-[28px] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="#3F3835"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="w-[1280px] px-6 py-5 flex flex-col gap-6">
             <div className="flex gap-4">
               {/* PC tabs */}
               <div className="flex bg-[#e9ded2] px-4 py-2 rounded-lg items-center justify-center w-[115px] h-[36px]">
                  <span className="font-bold text-[#2f2824] text-[15px]">수령 관리</span>
               </div>
               <button onClick={() => router.push('/admin/onsite/inventory')} className="flex bg-[#fdfdfd] border border-[#dddcdb] px-4 py-2 rounded-lg items-center justify-center w-[115px] h-[36px]">
                  <span className="font-bold text-[#999694] text-[15px]">재고 관리</span>
               </button>
             </div>

             {/* PC search bar */}
             <div className="bg-[#fdfdfd] border border-[#dddcdb] h-[40px] px-4 rounded-lg flex items-center justify-between">
                <input 
                  type="text" 
                  className="bg-transparent border-none outline-none w-full text-[13px] text-[#999694] placeholder-[#999694] h-full" 
                  placeholder="주문번호, 주문자명으로 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 21L16.65 16.65" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </div>

             {/* PC Receipt lists */}
             <div className="flex flex-col gap-[24px]">
                {loading ? (
                  <div className="py-20 text-center text-neutral-8 typo-body-medium">
                    불러오는 중...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-20 text-center text-neutral-8 typo-body-medium">
                    현황이 없습니다.
                  </div>
                ) : (
                  groups.map((g, idx) => (
                    <div key={idx} className="flex flex-col gap-[12px]">
                      <h2 className="text-[17px] font-bold text-[#999694] leading-[1.5]">{g.date}</h2>

                      <div className="flex flex-col w-[1232px]">
                        {/* Table headers */}
                        <div className="flex h-[40px] items-center rounded-t-[8px] bg-white border border-[#dddcdb] border-b-0 w-full mb-[-1px]">
                           <div className="w-[72px] h-full flex items-center justify-center border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">No.</span>
                           </div>
                           <div className="w-[120px] h-full flex items-center px-[18px] border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">주문시각</span>
                           </div>
                           <div className="w-[160px] h-full flex items-center px-[18px] border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">주문 번호</span>
                           </div>
                           <div className="w-[285px] h-full flex items-center px-[16px] border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#f6874c] tracking-[-0.26px]">주문 상품</span>
                           </div>
                           <div className="w-[140px] h-full flex items-center px-[18px] border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">결제여부</span>
                           </div>
                           <div className="w-[200px] h-full flex items-center px-[18px] border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">결제 정보</span>
                           </div>
                           <div className="w-[110px] h-full flex items-center px-[18px] border-r border-[#dddcdb] border-dashed shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">수령여부</span>
                           </div>
                           <div className="w-[145px] h-full flex items-center px-[18px] shrink-0">
                              <span className="text-[13px] font-semibold text-[#3f3835] tracking-[-0.26px]">주문취소</span>
                           </div>
                        </div>

                        {/* Table items */}
                        {g.items.map((item, i) => {
                          const isCanceled = item.paymentStatus === '주문취소' || item.paymentStatus === '결제취소';
                          const isComplete = item.receiptStatus === '수령완료';

                          const rowBgColor = isCanceled ? "bg-[#dddcdb]" : (!isComplete ? "bg-[#fac0a1]" : "bg-white");
                          const borderColor = isCanceled ? "border-[#5a5451]" : (!isComplete ? "border-[#cf5d1f]" : "border-[#dddcdb]");

                          return (
                            <div key={item.id} className="flex min-h-[121px] items-stretch justify-between bg-white border border-[#dddcdb] w-full mt-[-1px] first:mt-[-1px] last:rounded-b-[8px] overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => router.push(`/admin/onsite/${item.id}`)}>
                               <div className="w-[72px] flex flex-col pt-[17px] items-center border-r border-[#dddcdb] border-dashed shrink-0 bg-white">
                                  <span className="text-[15px] font-bold text-[#3f3835]">{i + 1}</span>
                               </div>
                               <div className="w-[120px] flex flex-col py-[16px] px-[18px] border-r border-[#dddcdb] border-dashed shrink-0 bg-white">
                                  <span className="text-[13px] text-[#3f3835] tracking-[-0.26px] break-all">{item.fullOrderTime}</span>
                               </div>
                               <div className="w-[160px] flex flex-col py-[16px] px-[18px] border-r border-[#dddcdb] border-dashed shrink-0 bg-white">
                                  <span className="text-[15px] text-[#3f3835]">{item.orderId}</span>
                               </div>
                               <div className={cn("w-[285px] flex flex-col justify-start py-[16px] px-[16px] border-r border-dashed shrink-0 gap-[14px]", rowBgColor, borderColor)}>
                                  {isCanceled && (
                                    <div className="flex gap-[5px] items-center mb-[-6px]">
                                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" fill="#F46D25"/>
                                        <path d="M9 6V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M9 12H9.0075" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      <span className="text-[13px] font-semibold text-[#f46d25] tracking-[-0.26px]">주문 취소 {item.items.reduce((acc, curr) => acc + curr.quantity, 0)}건</span>
                                    </div>
                                  )}
                                  {item.items.map((prod, pIdx) => {
                                    const itemTextColor = isCanceled ? "text-[#f46d25]" : "text-[#3f3835]";
                                    
                                    return (
                                      <div key={pIdx} className="flex w-full items-start justify-between">
                                        <div className="flex flex-col max-w-[137px]">
                                          <span className={cn("text-[13px] leading-[1.5] tracking-[-0.26px]", itemTextColor)}>{prod.name}</span>
                                          <span className={cn("text-[13px] leading-[1.5] tracking-[-0.26px]", itemTextColor)}>{prod.options ? `${prod.options} / ${prod.quantity}개` : `${prod.quantity}개`}</span>
                                        </div>
                                        <span className={cn("text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-right", itemTextColor)}>
                                          {isCanceled ? `-${(prod.price * prod.quantity).toLocaleString()}원` : `${(prod.price * prod.quantity).toLocaleString()}원`}
                                        </span>
                                      </div>
                                    );
                                  })}
                               </div>
                               <div className="w-[140px] flex flex-col py-[16px] px-[18px] border-r border-[#dddcdb] border-dashed shrink-0 bg-white">
                                  <span className="text-[13px] text-[#3f3835] tracking-[-0.26px]">{item.paymentStatus}</span>
                               </div>
                               <div className="w-[200px] flex flex-col py-[16px] px-[18px] border-r border-[#dddcdb] border-dashed shrink-0 bg-white">
                                  <span className="text-[13px] text-[#3f3835] tracking-[-0.26px]">{item.paymentMethodStr}</span>
                                  <span className="text-[13px] text-[#3f3835] tracking-[-0.26px]">{item.paymentAmount.toLocaleString()}원</span>
                               </div>
                               <div className="w-[110px] flex flex-col items-center justify-center p-[18px] border-r border-[#dddcdb] border-dashed shrink-0 bg-white">
                                  <button className={cn("w-full h-[26px] rounded-[4px] flex items-center justify-center text-[13px] font-semibold text-[#fdfdfd] tracking-[-0.26px]", (isComplete || isCanceled) ? "bg-[#fac0a1]" : "bg-[#f46d25]")}>
                                    {item.receiptStatus}
                                  </button>
                               </div>
                               <div className="w-[145px] flex flex-col items-center justify-center p-[18px] shrink-0 bg-white">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancelModalItem(item);
                                    }}
                                    disabled={isCanceled}
                                    className={cn("w-full h-[26px] rounded-[4px] flex items-center justify-center text-[13px] font-semibold text-[#fdfdfd] tracking-[-0.26px]", isCanceled ? "bg-[#fac0a1] cursor-default" : "bg-[#f46d25]")}
                                  >
                                    {isCanceled ? '주문 취소 완료' : '주문취소'}
                                  </button>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white flex flex-col pt-[40px] pb-[23px] px-[28px] relative rounded-[12px] w-[343px] shadow-lg">
            <div className="flex flex-col gap-[30px] items-start w-full cursor-auto">
              <div className="flex flex-col items-center justify-center w-full">
                <p className="font-bold text-[#2f2824] text-[15px] leading-[1.5] text-center w-[265px] font-pretendard">
                  해당 주문을 취소하시겠습니까?
                </p>
              </div>
              <div className="flex gap-[14px] w-full">
                <button
                  onClick={() => setCancelModalItem(null)}
                  className="bg-[#fdfdfd] border border-[#dddcdb] flex-1 min-h-[48px] rounded-[8px] flex items-center justify-center text-[15px] font-bold text-[#3f3835] font-pretendard hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (!cancelModalItem) return;
                    try {
                      const res = await fetch(`/api/v1/admin/onsite/${cancelModalItem.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentStatus: 3 }),
                      });
                      if (res.ok) {
                        fetchGroups();
                      }
                    } catch (e) {
                      console.error('Failed to cancel order:', e);
                    }
                    setCancelModalItem(null);
                  }}
                  className="bg-[#f6874c] flex-1 min-h-[48px] rounded-[8px] flex items-center justify-center text-[15px] font-bold text-[#fdfdfd] font-pretendard hover:bg-[#e6753a] transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
