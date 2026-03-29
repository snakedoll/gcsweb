'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Filter from '@/components/ui/admin/product/Filter';
import FundPercent from '@/components/ui/admin/product/FundPercent';
import FundingstatusSection from '@/components/ui/admin/product/FundingstatusSection';
import { cn } from '@/lib/utils';

type ProductType = 0 | 1 | 2;
type TabKey = 'all' | 'fund' | 'buyNow' | 'partnerUp';

type UpdateRequestItem = {
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

type UpdateRequestListResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    summary?: {
      totalUpdateRequestCount?: number;
    };
    requests?: UpdateRequestItem[];
  };
};

type ToastKind = 'approve' | 'reject';

const TAB_OPTIONS: Array<{ key: TabKey; label: string; type: ProductType | null }> = [
  { key: 'all', label: '전체', type: null },
  { key: 'fund', label: 'Fund', type: 0 },
  { key: 'buyNow', label: 'Buy Now', type: 1 },
  { key: 'partnerUp', label: 'Partner Up', type: 2 },
];

function formatDate(value: string | null) {
  if (!value) return null;
  const ymd = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[1]}.${ymd[2]}.${ymd[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const yyyy = parts.find((part) => part.type === 'year')?.value;
  const mm = parts.find((part) => part.type === 'month')?.value;
  const dd = parts.find((part) => part.type === 'day')?.value;
  if (!yyyy || !mm || !dd) return null;
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
    <div className="inline-flex h-[22px] items-center justify-center rounded-[3px] border border-neutral-5 px-[6px] py-px">
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
          <span className="text-orange-5">{count} </span>건의 수정 요청이 있습니다.
        </p>
      </div>
    </div>
  );
}

function ToastInfoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#FDFDFD" />
      <path d="M12 10.5V16.2" stroke="#F6874C" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1.05" fill="#F6874C" />
    </svg>
  );
}

function getToastMessage(kind: ToastKind) {
  if (kind === 'approve') return '상품글 수정 요청을 승인했습니다.';
  return '상품글 수정 요청을 거부했습니다.';
}

function TopToast({ kind, visible }: { kind: ToastKind; visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute left-4 right-4 top-[34px] z-30">
      <div className="flex h-12 items-center gap-3 rounded-lg bg-orange-5 px-3">
        <ToastInfoIcon />
        <p className="typo-body-small text-neutral-2">{getToastMessage(kind)}</p>
      </div>
    </div>
  );
}

function RequestProductCard({
  item,
  onClick,
}: {
  item: UpdateRequestItem;
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
                  <div className="w-fit">
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

export default function AdminProductUpdateRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [requests, setRequests] = useState<UpdateRequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<ToastKind | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const toast = searchParams.get('toast');
    const nextKind =
      toast === 'approve' || toast === 'reject'
        ? (toast as ToastKind)
        : null;

    if (!nextKind) {
      setToastKind(null);
      setToastVisible(false);
      return;
    }

    setToastKind(nextKind);
    setToastVisible(true);

    const hideTimer = window.setTimeout(() => setToastVisible(false), 1800);
    const clearQueryTimer = window.setTimeout(() => {
      router.replace('/admin/product/request/update');
    }, 1900);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearQueryTimer);
    };
  }, [router, searchParams]);

  const fetchRequests = async (signal?: AbortSignal) => {
    try {
      setListLoading(true);
      const res = await fetch('/api/v1/admin/product/request/update/list', { cache: 'no-store', signal });
      const json = (await res.json().catch(() => ({}))) as UpdateRequestListResponse;

      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message ?? '수정 요청 목록을 불러오지 못했습니다.');
      }

      if (signal?.aborted) return;
      setRequests((json.data?.requests ?? []) as UpdateRequestItem[]);
      setErrorMessage(null);
    } catch (error: any) {
      if (signal?.aborted) return;
      console.error(error);
      setRequests([]);
      setErrorMessage(error?.message ?? '수정 요청 목록을 불러오지 못했습니다.');
    } finally {
      if (!signal?.aborted) setListLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchRequests(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filteredRequests = useMemo(() => {
    const selectedType = TAB_OPTIONS.find((tab) => tab.key === activeTab)?.type ?? null;
    return requests.filter((item) => (selectedType == null ? true : item.type === selectedType));
  }, [activeTab, requests]);

  const hasItems = filteredRequests.length > 0;

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="relative mx-auto w-full max-w-[375px] bg-neutral-3">
        {toastKind ? <TopToast kind={toastKind} visible={toastVisible} /> : null}
        <NavBar variant="title-back" title="수정 요청" />

        <main className="pb-8 pt-[19px]">
          {!listLoading && !errorMessage && hasItems ? (
            <div className="px-4">
              <InfoBanner count={filteredRequests.length} />
            </div>
          ) : null}

          <section className={cn('px-4', !listLoading && !errorMessage && hasItems ? 'mt-4' : 'mt-0')}>
            <div className="flex flex-wrap items-center gap-2">
              {TAB_OPTIONS.map((tab) => (
                <Filter
                  key={tab.key}
                  label={tab.label}
                  selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>

            {listLoading ? (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 text-center">
                <p className="typo-body-small text-neutral-8">수정 요청 목록 로딩 중...</p>
              </div>
            ) : errorMessage ? (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 text-center">
                <p className="typo-body-small text-red-5">{errorMessage}</p>
              </div>
            ) : !hasItems ? (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 text-center">
                <p className="typo-heading-small text-neutral-12">수정 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-5">
                {filteredRequests.map((item) => (
                  <RequestProductCard
                    key={item.requestId}
                    item={item}
                    onClick={() => router.push(`/admin/product/request/update/${item.requestId}`)}
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
