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
  name: string;
  phoneLast4: string;
  orderTime: string;
  paymentStatus: string;
  receiptStatus: string;
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
    <div className="flex min-h-screen w-full flex-col bg-neutral-3 font-pretendard">
      <div className="mx-auto flex h-full w-full max-w-[375px] flex-col bg-neutral-3">
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
        
        {/* Tab */}
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
          {/* Layout for Search Bar */}
          <div className="px-4 py-6">
            <SearchBar 
              placeholder="주문자명, 전화번호 뒷자리로 검색" 
              value={search} 
              onChange={(val) => setSearch(val)} 
              className="bg-[#fdfdfd] border-[#dddcdb] h-10"
            />
          </div>

          {activeTab === 'receipt' ? (
            /* Matrix Layout (px-2 to match node 39165) */
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
                    {/* Date Header (node 39166) */}
                    <div className="flex items-center px-3 h-[26px]">
                      <h3 className="text-[17px] font-bold text-[#3f3835] font-pretendard leading-[1.5]">
                        {group.date}
                      </h3>
                    </div>

                    {/* Matrix */}
                    <div className="flex flex-col">
                      {/* Matrix_Attribute_01 (Header) */}
                      <div className="flex items-center justify-between border-b border-[#dddcdb] h-[55px]">
                        <div className="w-[66px] shrink-0 pl-3 pr-1 pt-4 pb-1 text-[13px] font-semibold text-black tracking-[-0.26px]">
                          주문자명
                        </div>
                        <div className="w-[70px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px] leading-[1.2]">
                          전화번호<br/>뒷자리
                        </div>
                        <div className="w-[68px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px]">
                          주문 시각
                        </div>
                        <div className="w-[77px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px]">
                          결제여부
                        </div>
                        <div className="w-[77px] shrink-0 px-1 pt-4 pb-1 text-center text-[13px] font-semibold text-black tracking-[-0.26px]">
                          수령여부
                        </div>
                      </div>

                      {/* Contents */}
                      <div className="flex flex-col">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/admin/onsite/${item.id}`)}
                            className="flex items-center justify-between h-[44px] border-b border-[#dddcdb] last:border-b-0 cursor-pointer hover:bg-neutral-3 transition-colors"
                          >
                            <div className="w-[66px] shrink-0 px-3 text-[13px] text-black tracking-[-0.26px] truncate font-pretendard">
                              {item.name}
                            </div>
                            <div className="w-[70px] shrink-0 px-1 text-center text-[13px] text-black tracking-[-0.26px] font-pretendard">
                              {item.phoneLast4}
                            </div>
                            <div className="w-[68px] shrink-0 px-1 text-center text-[13px] text-black tracking-[-0.26px] font-pretendard">
                              {item.orderTime}
                            </div>
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
    </div>
  );
}
