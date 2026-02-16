import Image from 'next/image';
import { cn } from '@/lib/utils';
import DashboardStatusName from './DashboardStatusName';

type DashboardStatusType = 'alarm' | 'inquiry' | 'log' | 'liked' | 'scrap';

interface DashboardStatusProps {
  type?: DashboardStatusType;
  count?: number;
  className?: string;
}

const statusMeta: Record<DashboardStatusType, { label: string; icon: string }> = {
  alarm: { label: '알림', icon: '/assets/icons/icon-bell.svg' },
  inquiry: { label: '문의', icon: '/assets/icons/icon-message-square.svg' },
  log: { label: '로그', icon: '/assets/icons/icon-folder.svg' },
  liked: { label: '찜한 상품', icon: '/assets/icons/icon-heart.svg' },
  scrap: { label: '스크랩', icon: '/assets/icons/icon-bookmark.svg' },
};

export default function DashboardStatus({
  type = 'alarm',
  count,
  className,
}: DashboardStatusProps) {
  const meta = statusMeta[type];
  const displayCount = type === 'log' ? undefined : count;

  return (
    <div
      className={cn(
        'flex h-20 w-[109px] items-center justify-center rounded-lg border border-neutral-5 bg-neutral-1 px-[34px] py-[14px]',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <Image src={meta.icon} alt="" width={24} height={24} />
        <DashboardStatusName label={meta.label} count={displayCount} />
      </div>
    </div>
  );
}
