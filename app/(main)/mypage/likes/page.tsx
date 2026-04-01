'use client';

import { NavBar } from '@/components/layout';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/* ─────────────────────────────── 타입 ──────────────────────────────── */
type ProductType = 0 | 1 | 2; // 0=Fund, 1=BuyNow, 2=PartnerUp
type ActiveTab = ProductType | null; // null = 전체
type FundingStatus = '진행예정' | '진행중' | '진행완료';

interface LikedProduct {
  id: string;
  teamName: string | null;
  name: string;
  thumbnailUrl: string | null;
  status: 'AVAILABLE' | 'SOLD_OUT';
  type: ProductType;
  fundingStatus?: FundingStatus;
}

/* ────────────────────────── 탭 정의 ─────────────────────────────────── */
const TABS: { label: string; type: ActiveTab }[] = [
  { label: '전체',      type: null },
  { label: 'Fund',      type: 0 },
  { label: 'Buy Now',   type: 1 },
  { label: 'Partner Up', type: 2 },
];

/* ────────────────────────── 상태 태그 매핑 ──────────────────────────── */
function getFundingStatus(product: LikedProduct): FundingStatus {
  if (product.fundingStatus) return product.fundingStatus;
  return product.status === 'AVAILABLE' ? '진행중' : '진행완료';
}

const STATUS_STYLE: Record<FundingStatus, { bg: string; text: string }> = {
  '진행예정': { bg: 'bg-[#f1f1f1]',  text: 'text-[#3f3835]' },
  '진행중':   { bg: 'bg-[#fac0a1]',  text: 'text-[#cf5d1f]' },
  '진행완료': { bg: 'bg-[#3f3835]',  text: 'text-[#fdfdfd]' },
};

/* ─────────────────────────── 상품 카드 ──────────────────────────────── */
function ProductCard({ product }: { product: LikedProduct }) {
  const statusLabel = getFundingStatus(product);
  const { bg, text } = STATUS_STYLE[statusLabel];

  return (
    <Link href={`/shop/${product.id}`} className="flex items-start gap-[15px] w-full">
      {/* 썸네일: 고정 너비 + 4:5 비율 (Figma: 120×150 scale) */}
      <div
        className="relative shrink-0 rounded-[5.333px] overflow-hidden bg-[#dddcdb]"
        style={{ width: 64, height: 80 }}
      >
        {product.thumbnailUrl ? (
          <Image src={product.thumbnailUrl} alt={product.name} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#999694" strokeWidth="1.2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="#999694" />
              <path d="M3 15L8 10L12 14L15 11L21 17" stroke="#999694" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* 텍스트 + 화살표 */}
      <div className="flex flex-1 items-center min-w-0 gap-3">
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-[#1a1918] truncate">
              {product.teamName ?? ''}
            </p>
            <p className="text-[15px] leading-[1.5] text-[#1a1918] truncate">
              {product.name}
            </p>
          </div>
          <span className={`inline-flex self-start items-center justify-center px-[8px] py-[2px] rounded-[8px] text-[13px] leading-[1.5] tracking-[-0.26px] ${bg} ${text}`}>
            {statusLabel}
          </span>
        </div>
        <svg className="shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18L15 12L9 6" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}

/* ─────────────────────────── 메인 페이지 ────────────────────────────── */
export default function MypageLikesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>(null); // 기본: 전체
  const [products, setProducts] = useState<LikedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikes = async () => {
      setLoading(true);
      try {
        const url =
          activeTab === null
            ? `/api/v1/mypage/likes/shop?page=1&size=50`
            : `/api/v1/mypage/likes/shop?type=${activeTab}&page=1&size=50`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        const data: LikedProduct[] = json?.data?.products ?? [];
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLikes();
  }, [activeTab]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8f6f4]">
      <NavBar variant="title-back" title="찜한 상품" />

      <main className="mx-auto w-full max-w-[375px] flex-1 flex flex-col">
        {/* 탭 바 */}
        <div className="flex items-center gap-2 px-4 pt-5">
          {TABS.map((tab) => {
            const isActive = tab.type === activeTab;
            return (
              <button
                key={String(tab.type)}
                type="button"
                onClick={() => setActiveTab(tab.type)}
                className={[
                  'flex items-center justify-center px-[11px] rounded-[4px] text-[13px] leading-[1.5] tracking-[-0.26px] transition-colors',
                  isActive
                    ? 'h-[22px] bg-[#f6874c] text-white'
                    : 'h-[22px] bg-[#f1f1f1] border border-[#dddcdb] text-[#999694]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 상품 목록 / 빈 상태 */}
        <div className="flex flex-1 flex-col px-4 py-6">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-[13px] text-[#999694]">로딩 중...</p>
            </div>
          ) : products.length === 0 ? (
            /* ── 빈 상태 ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-20">
              <div className="flex flex-col items-center gap-1">
                <p className="text-[19px] font-bold leading-[1.5] text-[#2f2824] text-center">
                  찜한 상품이 없습니다.
                </p>
                <p className="text-[15px] leading-[1.5] text-[#6c6764] text-center">
                  GCS의 상품들이 궁금하다면?
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shop')}
                className="flex items-center justify-center w-[182px] h-11 bg-[#f6874c] rounded-lg text-[15px] font-bold leading-[1.5] text-[#fdfdfd]"
              >
                상품 보러 가기
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
