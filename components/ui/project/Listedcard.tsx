import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import DDay from './DDay';
import Like from './Like';

type ListedcardVariant =
  | '내등록상품_펀딩카드_미달성'
  | '내등록상품_펀딩카드_달성'
  | '내등록상품_buynow/partnerup'
  | 'admin_fund'
  | 'shopcard_fund'
  | 'shopcard_buynow_partnerup'
  | 'admin_buynow/partnerup'
  | 'project_post'
  | '스크랩한 프로젝트'
  | '좋아요 누른 상품 목록/진행완료'
  | '좋아요 누른 상품 목록/진행중'
  | '좋아요 누른 상품 목록/진행예정';

interface ListedcardProps {
  className?: string;
  property1?: ListedcardVariant;
  imageSrc?: string;
  brand?: string;
  title?: string;
  description?: string;
  dateText?: string;
  amountText?: string;
  progressPercent?: number;
  likeCount?: number;
  views?: number;
  postedAt?: string;
  publicExpose?: boolean;
  publicStatusText?: string;
  projectTags?: string[];
}

function ProgressBar({ percent, accent = false }: { percent: number; accent?: boolean }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-[7px] w-full rounded-[3.5px] border border-neutral-5 bg-[#f8f6f4]">
      <div
        className={cn('h-full rounded-[3.5px]', accent ? 'bg-orange-5' : 'bg-[#efddc9]')}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function PercentBadge({ achieved, percent }: { achieved: boolean; percent: number }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex h-[17px] min-w-[39px] items-center justify-center rounded px-[5px] text-center text-[11px] leading-[1.5]',
          achieved ? 'bg-orange-1 text-orange-5' : 'bg-neutral-5 text-neutral-9'
        )}
      >
        {achieved ? '달성' : '미달성'}
      </span>
      <span className="typo-body-xsmall text-neutral-8">{percent}%</span>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'gray' | 'orange' | 'black' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-2 py-0.5 typo-body-xsmall',
        tone === 'orange' && 'bg-orange-3 text-orange-7',
        tone === 'gray' && 'bg-neutral-4 text-neutral-10',
        tone === 'black' && 'bg-neutral-10 text-neutral-2'
      )}
    >
      {label}
    </span>
  );
}

function ArrowRight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-neutral-6">
      <path d="M10 7L15 12L10 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductInfo({
  imageSrc,
  brand,
  title,
  description,
  rightBottom,
  footerChip,
}: {
  imageSrc: string;
  brand: string;
  title: string;
  description?: string;
  rightBottom?: ReactNode;
  footerChip?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="h-[125px] w-[125px] overflow-hidden rounded">
        <img src={imageSrc} alt="" className="size-full object-cover" />
      </div>
      <div className="w-[205px] pl-3">
        <div className="flex flex-col gap-[3px]">
          <p className="typo-body-xsmall text-neutral-11">{brand}</p>
          <div className="flex flex-col gap-px">
            <p className="text-[17px] font-bold leading-[1.5] text-neutral-12">{title}</p>
            {description ? <p className="typo-body-xsmall text-neutral-11">{description}</p> : null}
          </div>
        </div>
        <div className="my-[7px] h-px w-full bg-neutral-5" />
        {rightBottom}
        {footerChip}
      </div>
    </div>
  );
}

function BaseCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-[343px] rounded-lg border border-neutral-4 bg-neutral-2 px-[18px] py-4', className)}>
      {children}
    </div>
  );
}

function ListRowCard({
  imageSrc,
  brand,
  title,
  tags,
  statusChip,
  className,
}: {
  imageSrc: string;
  brand: string;
  title: string;
  tags?: string[];
  statusChip?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex w-[375px] items-start gap-[15px]', className)}>
      <div className="h-[150px] w-[120px] overflow-hidden rounded-[5.333px]">
        <img src={imageSrc} alt="" className="size-full object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="typo-body-xsmall font-semibold text-[#1a1918]">{brand}</p>
            <p className="truncate text-[15px] leading-[1.5] text-[#1a1918]">{title}</p>
          </div>
          {statusChip ? (
            statusChip
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {(tags ?? ['2025', '공모전']).map((tag) => (
                <StatusChip key={tag} label={tag} tone="orange" />
              ))}
            </div>
          )}
        </div>
        <ArrowRight />
      </div>
    </div>
  );
}

export default function Listedcard({
  className,
  property1 = 'shopcard_fund',
  imageSrc = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
  brand = 'MUA',
  title = '염소 후드집업',
  description = '따뜻함 한 스푼을 더한 그래픽 후드집업',
  dateText = '2025.05.05 - 2025.06.05',
  amountText = '570,000원',
  progressPercent = 70,
  likeCount = 17,
  views = 393,
  postedAt = '2025.01.04 15:13',
  publicExpose = true,
  publicStatusText = '공개',
  projectTags = ['2025', '겨울 공모전'],
}: ListedcardProps) {
  const isAchieved =
    property1 === '내등록상품_펀딩카드_달성' || property1 === 'admin_fund' || progressPercent >= 100;
  const isFundingCard = [
    'shopcard_fund',
    '내등록상품_펀딩카드_미달성',
    '내등록상품_펀딩카드_달성',
    'admin_fund',
  ].includes(property1);
  const isProductSimple = ['shopcard_buynow_partnerup', '내등록상품_buynow/partnerup', 'admin_buynow/partnerup'].includes(property1);
  const isProjectPost = property1 === 'project_post';
  const isScrapProject = property1 === '스크랩한 프로젝트';
  const isLikedList = property1.startsWith('좋아요 누른 상품 목록/');

  if (isScrapProject) {
    return (
      <ListRowCard
        className={className}
        imageSrc={imageSrc}
        brand={brand === 'MUA' ? 'HUSH' : brand}
        title={title === '염소 후드집업' ? '조용하게 지구를 지키는 방법' : title}
        tags={projectTags}
      />
    );
  }

  if (isLikedList) {
    const tone =
      property1 === '좋아요 누른 상품 목록/진행중'
        ? 'orange'
        : property1 === '좋아요 누른 상품 목록/진행완료'
          ? 'black'
          : 'gray';
    const label =
      property1 === '좋아요 누른 상품 목록/진행중'
        ? '진행중'
        : property1 === '좋아요 누른 상품 목록/진행완료'
          ? '진행완료'
          : '진행예정';

    return (
      <ListRowCard
        className={className}
        imageSrc={imageSrc}
        brand={brand}
        title={title}
        statusChip={<StatusChip label={label} tone={tone} />}
      />
    );
  }

  if (isProjectPost) {
    return (
      <BaseCard className={cn('w-[343px]', className)}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-neutral-8">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 typo-body-xsmall text-neutral-10">
                <input type="checkbox" className="size-4 rounded border-neutral-10 accent-orange-5" defaultChecked={publicExpose} />
                홈에 노출
              </label>
            </div>
            <div className="inline-flex items-center gap-2 typo-body-xsmall">
              <span>{publicStatusText}</span>
              <button
                type="button"
                aria-pressed={publicExpose}
                className={cn(
                  'relative h-5 w-[35px] rounded-full',
                  publicExpose ? 'bg-orange-5' : 'bg-neutral-6'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-4 rounded-full bg-white transition-all',
                    publicExpose ? 'left-[17px]' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-dashed border-neutral-5 pt-3">
            <ProductInfo
              imageSrc={imageSrc}
              brand="팀명"
              title="프로젝트 제목"
              description={undefined}
              rightBottom={
                <div className="flex flex-wrap gap-2">
                  {projectTags.map((tag) => (
                    <StatusChip key={tag} label={tag} tone="orange" />
                  ))}
                </div>
              }
            />
          </div>

          <div className="flex items-center justify-between text-[11px] leading-[1.5] text-neutral-8">
            <span>게시 {postedAt}</span>
            <span>조회수 {views}</span>
            <span>좋아요 {likeCount}</span>
          </div>
        </div>
      </BaseCard>
    );
  }

  if (isProductSimple) {
    return (
      <BaseCard className={className}>
        <div className="flex flex-col gap-[15px]">
          <ProductInfo
            imageSrc={imageSrc}
            brand={brand}
            title={title}
            description={description}
            rightBottom={
              <div className="flex w-[154px] flex-col gap-0.5">
                <p className="text-[11px] leading-[1.5] text-neutral-8">판매 기간</p>
                <div className="inline-flex h-[22px] items-center justify-center rounded-[3px] border border-neutral-5 px-1.5">
                  <span className="typo-body-xsmall text-neutral-7">{dateText}</span>
                </div>
              </div>
            }
          />
          <div className="flex items-center justify-end">
            <span className="typo-body-xsmall text-neutral-8">좋아요 수 {likeCount}</span>
          </div>
        </div>
      </BaseCard>
    );
  }

  if (isFundingCard) {
    const isAdminFund = property1 === 'admin_fund';
    const isOwnFund = property1 === '내등록상품_펀딩카드_미달성' || property1 === '내등록상품_펀딩카드_달성';
    const achieved = isAchieved;
    const percent = achieved ? 100 : progressPercent;
    const currentAmount = achieved ? amountText : '370,000원';

    return (
      <BaseCard className={className}>
        <div className="flex flex-col gap-[10px]">
          <div className="flex flex-col gap-[15px]">
            <ProductInfo
              imageSrc={imageSrc}
              brand={brand}
              title={title}
              description={description}
              rightBottom={
                isOwnFund ? (
                  <div className="flex w-[154px] flex-col gap-0.5">
                    <p className="text-[11px] leading-[1.5] text-neutral-8">펀딩 기간</p>
                    <div className="inline-flex h-[22px] items-center justify-center rounded-[3px] border border-neutral-5 px-1.5">
                      <span className="typo-body-xsmall text-neutral-7">{dateText}</span>
                    </div>
                  </div>
                ) : (
                  <DDay property1={achieved ? 'Variant2' : 'Default'} />
                )
              }
            />

            {isAdminFund || isOwnFund ? (
              <div className="flex flex-col gap-[5px]">
                <p className="typo-body-xsmall text-neutral-8">
                  달성/목표 금액 : <span className="text-orange-5">{currentAmount}</span> / {amountText}
                </p>
                <ProgressBar percent={percent} accent={achieved} />
              </div>
            ) : (
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center justify-between">
                  <PercentBadge achieved={achieved} percent={percent} />
                  <span className="typo-body-xsmall text-neutral-8">{amountText}</span>
                </div>
                <ProgressBar percent={percent} accent={achieved} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <PercentBadge achieved={achieved} percent={percent} />
            {isAdminFund || isOwnFund ? (
              <span className="typo-body-xsmall text-neutral-8">좋아요 수 {likeCount}</span>
            ) : (
              <Like />
            )}
          </div>
        </div>
      </BaseCard>
    );
  }

  return null;
}
