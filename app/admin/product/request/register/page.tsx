'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import ProductTabBar from '@/components/ui/admin/product/TabBar';
import FundPercent from '@/components/ui/admin/product/FundPercent';
import FundingstatusSection from '@/components/ui/admin/product/FundingstatusSection';
import { cn } from '@/lib/utils';

type ProductType = 0 | 1 | 2;
type TabKey = 'all' | 'fund' | 'buyNow' | 'partnerUp';

type RegisterRequestItem = {
  requestId: string;
  productId: string | null;
  teamId: string;
  teamName: string;
  type: ProductType;
  name: string;
  description: string;
  thumbnailUrl: string;
  salesStartDate: string | null;
  salesEndDate: string | null;
  currentAmount: number | null;
  goalAmount: number | null;
  likeCount: number;
  requestedAt: string;
};

type RegisterRequestListResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    summary?: {
      totalRegisterRequestCount?: number;
    };
    requests?: RegisterRequestItem[];
  };
};

const TAB_OPTIONS: Array<{ key: TabKey; label: string; type: ProductType | null }> = [
  { key: 'all', label: '전체', type: null },
  { key: 'fund', label: 'Fund', type: 0 },
  { key: 'buyNow', label: 'Buy Now', type: 1 },
  { key: 'partnerUp', label: 'Partner Up', type: 2 },
];

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function formatDateRange(start: string | null, end: string | null) {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) return `${startText} - ${endText}`;
  if (startText) return `${startText} -`;
  if (endText) return `- ${endText}`;
  return '-';
}

function formatWon(value: number | null | undefined) {
  const safe = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safe.toLocaleString('ko-KR')}원`;
}

function calcProgressPercent(currentAmount: number | null, goalAmount: number | null) {
  const current = typeof currentAmount === 'number' ? currentAmount : 0;
  const goal = typeof goalAmount === 'number' ? goalAmount : 0;
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

function DashDivider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full border-t border-dashed border-neutral-5', className)} aria-hidden />;
}

function DateField({ value }: { value: string }) {
  return (
    <div className="inline-flex h-[22px] items-center justify-center rounded-[3px] border border-neutral-5 px-1.5 py-px">
      <span className="typo-body-xsmall text-neutral-7">{value}</span>
    </div>
  );
}

function LikeCountText({ count, align = 'right' }: { count: number; align?: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[3px] typo-body-xsmall text-neutral-8',
        align === 'right' ? 'justify-end' : 'justify-start'
      )}
    >
      <span>좋아요 수</span>
      <span>{count}</span>
    </div>
  );
}

function InfoBanner({ count }: { count: number }) {
  return (
    <div className="h-7 w-full rounded-lg border border-neutral-4 bg-neutral-1 px-[9px]">
      <div className="flex h-full items-center gap-[5px]">
        <Image src="/assets/icons/filled/Filled/Info circle.svg" alt="" width={15} height={15} />
        <p className="typo-body-xsmall text-neutral-7">
          <span className="text-orange-5">{count} </span>건의 등록 요청이 있습니다.
        </p>
      </div>
    </div>
  );
}

function RequestProductCard({
  item,
  onClick,
}: {
  item: RegisterRequestItem;
  onClick?: () => void;
}) {
  const isFund = item.type === 0;
  const periodLabel = isFund ? '펀딩 기간' : '판매 기간';
  const periodText = formatDateRange(item.salesStartDate, item.salesEndDate);
  const progressPercent = isFund ? calcProgressPercent(item.currentAmount, item.goalAmount) : 0;
  const currentAmount = formatWon(item.currentAmount);
  const goalAmount = formatWon(item.goalAmount);
  const fundAchieved = progressPercent >= 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-neutral-4 bg-neutral-2 px-[18px] py-4 text-left',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="flex flex-col gap-[10px]">
        <div className={cn('flex flex-col items-start', isFund ? 'gap-[15px]' : 'h-[125px] justify-between')}>
          <div className="flex w-full items-center justify-between">
            <div className="relative h-[125px] w-[125px] overflow-hidden rounded">
              <Image
                src={item.thumbnailUrl || '/assets/images/profile_image.png'}
                alt=""
                fill
                unoptimized
                sizes="125px"
                className="object-cover"
              />
            </div>

            <div className="w-[205px] pl-3">
              <div className="flex flex-col gap-[7px]">
                <div className="flex flex-col gap-[3px]">
                  <p className="typo-body-xsmall text-neutral-11">{item.teamName || '팀명'}</p>
                  <div className="flex flex-col gap-px">
                    <p className="truncate typo-heading-xsmall text-neutral-12">{item.name || '상품명'}</p>
                    <p className="line-clamp-1 typo-body-xsmall text-neutral-11">{item.description || ''}</p>
                  </div>
                </div>

                <DashDivider className={isFund ? 'w-[193px]' : 'w-[194px]'} />

                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] leading-[1.5] text-neutral-8">{periodLabel}</p>
                  <div className="w-[154px]">
                    <DateField value={periodText} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isFund ? (
            <FundingstatusSection
              className="w-full"
              variant="admin"
              currentAmount={currentAmount}
              targetAmount={goalAmount}
              progressPercent={progressPercent}
            />
          ) : null}
        </div>

        {isFund ? (
          <div className="flex w-full items-center justify-between">
            <FundPercent variant={fundAchieved ? '달성' : '미달성'} percentText={`${progressPercent}%`} />
            <LikeCountText count={Number(item.likeCount ?? 0)} />
          </div>
        ) : (
          <div className="flex w-full items-center">
            <LikeCountText count={Number(item.likeCount ?? 0)} align="left" />
          </div>
        )}
      </div>
    </button>
  );
}

export default function AdminProductRegisterRequestPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [requests, setRequests] = useState<RegisterRequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/admin/product/request/register/list', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as RegisterRequestListResponse;

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '등록 요청 목록을 불러오지 못했습니다.');
        }

        if (cancelled) return;
        setRequests((json.data?.requests ?? []) as RegisterRequestItem[]);
        setErrorMessage(null);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setRequests([]);
          setErrorMessage(error?.message ?? '등록 요청 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const selectedType = TAB_OPTIONS.find((tab) => tab.key === activeTab)?.type ?? null;
    return requests.filter((item) => (selectedType == null ? true : item.type === selectedType));
  }, [activeTab, requests]);

  const hasItems = filteredRequests.length > 0;

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar variant="title-back" title="등록 요청" />

        <main className="pb-8 pt-[19px]">
          {!listLoading && !errorMessage && hasItems ? (
            <div className="px-4">
              <InfoBanner count={filteredRequests.length} />
            </div>
          ) : null}

          <section className={cn('px-4', !listLoading && !errorMessage && hasItems ? 'mt-4' : 'mt-0')}>
            <div className="flex flex-wrap items-center gap-2">
              {TAB_OPTIONS.map((tab) => (
                <ProductTabBar
                  key={tab.key}
                  label={tab.label}
                  selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>

            {listLoading ? (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 text-center">
                <p className="typo-body-small text-neutral-8">등록 요청 목록 로딩 중...</p>
              </div>
            ) : errorMessage ? (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 text-center">
                <p className="typo-body-small text-red-5">{errorMessage}</p>
              </div>
            ) : !hasItems ? (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 text-center">
                <p className="typo-heading-small text-neutral-12">등록 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-5">
                {filteredRequests.map((item) => (
                  <RequestProductCard
                    key={item.requestId}
                    item={item}
                    onClick={() => router.push(`/admin/product/request/register/${item.requestId}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
