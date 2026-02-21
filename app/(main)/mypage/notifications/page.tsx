'use client';

import { Footer, NavBar } from '@/components/layout';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/* ───────────────────────────── 타입 ───────────────────────────── */
interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  linkUrl: string | null;
}

interface NotificationGroup {
  label: string;
  items: Notification[];
}

/* ─────────────────────────── 시간 포맷 ──────────────────────────── */
function formatRelativeTime(createdAt: string): string {
  const now = new Date();
  const date = new Date(createdAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;
  if (diffMonth < 12) return `${diffMonth}달 전`;
  return `${Math.floor(diffMonth / 12)}년 전`;
}

/* ─────────────────────── 알림 기간별 그룹핑 ──────────────────────── */
function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const groups: { label: string; filter: (d: Date) => boolean }[] = [
    { label: '오늘', filter: (d) => d >= todayStart },
    {
      label: '최근 7일',
      filter: (d) => {
        const ms = now.getTime() - d.getTime();
        return d < todayStart && ms < 7 * 86400000;
      },
    },
    {
      label: '최근 30일',
      filter: (d) => {
        const ms = now.getTime() - d.getTime();
        return ms >= 7 * 86400000 && ms < 30 * 86400000;
      },
    },
    {
      label: '최근 1년',
      filter: (d) => {
        const ms = now.getTime() - d.getTime();
        return ms >= 30 * 86400000 && ms < 365 * 86400000;
      },
    },
    {
      label: '이전',
      filter: (d) => {
        const ms = now.getTime() - d.getTime();
        return ms >= 365 * 86400000;
      },
    },
  ];

  return groups
    .map(({ label, filter }) => ({
      label,
      items: notifications.filter((n) => filter(new Date(n.createdAt))),
    }))
    .filter((g) => g.items.length > 0);
}

/* ────────────────────────── 알림 카드 ───────────────────────────── */
function NoticeCard({ notification }: { notification: Notification }) {
  const timeLabel = formatRelativeTime(notification.createdAt);

  return (
    <div className="flex flex-col gap-2 w-full pr-5">
      <div className="flex flex-col gap-1 w-full">
        {/* 제목 + 미읽음 dot */}
        <div className="flex items-start gap-1">
          <span className="font-bold text-[15px] leading-[1.5] text-[#5a5451]">
            {notification.title || 'Board 댓글 알림'}
          </span>
          {!notification.isRead && (
            <span className="mt-[6px] h-[8px] w-[8px] shrink-0 rounded-full bg-[#f46d25]" />
          )}
        </div>
        {/* 내용 */}
        <p className="text-[13px] leading-[1.5] tracking-[-0.26px] text-[#6c6764] font-semibold whitespace-pre-wrap w-full">
          {notification.content || '알림 내용이 없습니다.'}
        </p>
      </div>
      {/* 시간 */}
      <p className="text-[13px] leading-[1.5] tracking-[-0.26px] text-[#6c6764]">
        {timeLabel}
      </p>
    </div>
  );
}

/* ─────────────────────────── 메인 페이지 ────────────────────────── */
const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = async (currentPage: number, append = false) => {
    try {
      const res = await fetch(`/api/v1/mypage/notifications?page=${currentPage}&size=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      const data: Notification[] = json?.data?.notifications ?? [];
      const next: boolean = json?.data?.hasNext ?? false;

      setNotifications((prev) => (append ? [...prev, ...data] : data));
      setHasNext(next);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    setPage(nextPage);
    await fetchNotifications(nextPage, true);
  };

  const groups = groupNotifications(notifications);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f6f6f5]">
      <NavBar variant="title-back" title="알림" />

      <main className="mx-auto w-full max-w-[375px] flex-1 px-5 pb-5 pt-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-[#999694]">로딩 중...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-[15px] font-bold text-[#2f2824]">알림이 없습니다</p>
            <p className="text-[13px] text-[#999694]">새로운 알림이 오면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-11">
            {groups.map((group) => (
              <section key={group.label} className="flex flex-col gap-2">
                {/* 기간 레이블 */}
                <h2 className="text-[19px] font-bold leading-[1.5] text-[#2f2824]">
                  {group.label}
                </h2>

                {/* 알림 카드 목록 */}
                <div className="flex flex-col gap-3">
                  {group.items.map((item, idx) => (
                    <div key={item.id} className="flex flex-col gap-3">
                      <NoticeCard notification={item} />
                      {idx < group.items.length - 1 && (
                        <div className="h-px w-full bg-[#f1f1f1]" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* 더보기 버튼 */}
            {hasNext && (
              <div className="flex flex-col items-center gap-6">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#e9ded2] px-4 py-3"
                >
                  <span className="text-[15px] font-bold leading-[1.5] text-[#3f3835]">
                    {loadingMore ? '로딩 중...' : '더보기'}
                  </span>
                  {!loadingMore && (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-[#3f3835]"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
