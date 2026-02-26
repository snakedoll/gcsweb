import CheckboxButton from '@/components/ui/button/CheckboxButton';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import Tag from '@/components/ui/common/Tag';
import { cn } from '@/lib/utils';
import FundPercent from './FundPercent';
import FundingstatusSection from './FundingstatusSection';
import ProductDDay from './ProductDDay';
import ProductLike from './ProductLike';

export type ProductListedCardVariant =
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

interface ProductListedCardProps {
  className?: string;
  property1?: ProductListedCardVariant;
  imageSrc?: string;
  brand?: string;
  title?: string;
  description?: string;
  periodLabel?: string;
  periodText?: string;
  amountText?: string;
  targetAmountText?: string;
  progressPercent?: number;
  likeCount?: number;
  homeExpose?: boolean;
  publicChecked?: boolean;
  onHomeExposeChange?: (checked: boolean) => void;
  onPublicChange?: (checked: boolean) => void;
  onClick?: () => void;
  tags?: string[];
  postedAt?: string;
  views?: number;
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

function LikeStat({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-[3px] typo-body-xsmall text-neutral-8">
      <span>좋아요 수</span>
      <span>{count}</span>
    </div>
  );
}

function RightChevron() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 7L15 12L10 17" stroke="var(--color-neutral-7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductInfoBlock({
  imageSrc,
  brand,
  title,
  description,
  periodLabel,
  periodText,
  showPeriodField,
  periodFieldWidthClass,
  showDDay,
  showLikeIcon,
  onClick,
}: {
  imageSrc: string;
  brand: string;
  title: string;
  description: string;
  periodLabel?: string;
  periodText?: string;
  showPeriodField?: boolean;
  periodFieldWidthClass?: string;
  showDDay?: boolean;
  showLikeIcon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-full items-center justify-between text-left', onClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <div className="h-[125px] w-[102px] overflow-hidden rounded">
        <img src={imageSrc} alt="" className="size-full object-cover" />
      </div>

      <div className="w-[205px] pl-3">
        <div className="flex flex-col gap-[7px]">
          <div className="flex flex-col gap-[3px]">
            <p className="typo-body-xsmall text-neutral-11">{brand}</p>
            <div className="flex flex-col gap-px">
              <p className="truncate typo-heading-xsmall text-neutral-12">{title}</p>
              <p className="line-clamp-1 typo-body-xsmall text-neutral-11">{description}</p>
            </div>
          </div>

          {(showPeriodField || showDDay || showLikeIcon) && <DashDivider className={cn(showPeriodField ? 'w-[194px]' : 'w-[193px]')} />}

          {showPeriodField ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] leading-[1.5] text-neutral-8">{periodLabel}</p>
              <div className={cn('w-[154px]', periodFieldWidthClass)}>
                <DateField value={periodText ?? '2025.05.05 - 2025.06.05'} />
              </div>
            </div>
          ) : null}

          {showDDay || showLikeIcon ? (
            <div className="flex items-center justify-between">
              {showDDay ? <ProductDDay /> : <span />}
              {showLikeIcon ? <ProductLike /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ProjectPostInfo({
  imageSrc,
  brand,
  title,
  tags,
  onClick,
}: {
  imageSrc: string;
  brand: string;
  title: string;
  tags: string[];
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-full items-center gap-4 text-left', onClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <div className="h-[125px] w-[102px] overflow-hidden rounded">
        <img src={imageSrc} alt="" className="size-full object-cover" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <div className="flex flex-col gap-[3px]">
          <p className="typo-body-xsmall text-neutral-11">{brand}</p>
          <p className="truncate typo-heading-xsmall text-neutral-12">{title}</p>
        </div>
        <DashDivider className="w-[193px]" />
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Tag key={tag} color="orange" contents={tag} />
          ))}
        </div>
      </div>
    </button>
  );
}

function CompactListRow({
  variant,
  imageSrc,
  brand,
  title,
  tags,
  onClick,
}: {
  variant: ProductListedCardVariant;
  imageSrc: string;
  brand: string;
  title: string;
  tags: string[];
  onClick?: () => void;
}) {
  const isScrap = variant === '스크랩한 프로젝트';
  const statusLabel =
    variant === '좋아요 누른 상품 목록/진행완료'
      ? '진행완료'
      : variant === '좋아요 누른 상품 목록/진행중'
        ? '진행중'
        : '진행예정';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-[375px] items-start gap-[15px] text-left', onClick ? 'cursor-pointer' : 'cursor-default')}
    >
      <div className="h-[150px] w-[120px] overflow-hidden rounded-[5px]">
        <img src={imageSrc} alt="" className="size-full object-cover" />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="typo-body-xsmall-bold text-neutral-12">{brand}</p>
            <p className="truncate typo-body-small text-neutral-12">{title}</p>
          </div>
          {isScrap ? (
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Tag key={tag} color="orange" contents={tag} />
              ))}
            </div>
          ) : (
            <Tag
              color={statusLabel === '진행완료' ? 'white-gray' : 'orange'}
              contents={statusLabel}
              className={cn(statusLabel === '진행완료' && 'bg-neutral-10 text-neutral-2')}
            />
          )}
        </div>
        <RightChevron />
      </div>
    </button>
  );
}

export default function ProductListedCard({
  className,
  property1 = 'shopcard_fund',
  imageSrc = '/assets/images/profile_image.png',
  brand = 'MUA',
  title = '염소 후드집업',
  description = '따뜻함 한 스푼을 더한 그래픽 후드집업',
  periodLabel,
  periodText = '2025.05.05 - 2025.06.05',
  amountText,
  targetAmountText = '570,000원',
  progressPercent,
  likeCount = 17,
  homeExpose = true,
  publicChecked = false,
  onHomeExposeChange,
  onPublicChange,
  onClick,
  tags = ['2025', '겨울 공모전'],
  postedAt = '2025.01.04 15:13',
  views = 393,
}: ProductListedCardProps) {
  const isProjectPost = property1 === 'project_post';
  const isCompact =
    property1 === '스크랩한 프로젝트' ||
    property1 === '좋아요 누른 상품 목록/진행완료' ||
    property1 === '좋아요 누른 상품 목록/진행중' ||
    property1 === '좋아요 누른 상품 목록/진행예정';
  const isShopFund = property1 === 'shopcard_fund';
  const isShopBuy = property1 === 'shopcard_buynow_partnerup';
  const isAdminFund = property1 === 'admin_fund';
  const isAdminBuy = property1 === 'admin_buynow/partnerup';
  const isMyFund = property1 === '내등록상품_펀딩카드_미달성' || property1 === '내등록상품_펀딩카드_달성';
  const isMyFundAchieved = property1 === '내등록상품_펀딩카드_달성';
  const isMyBuy = property1 === '내등록상품_buynow/partnerup';
  const isFundFamily = isShopFund || isAdminFund || isMyFund;
  const isBuyFamily = isShopBuy || isAdminBuy || isMyBuy;
  const adminMode = isAdminFund || isAdminBuy || isProjectPost;
  const showAdminControls = isAdminFund || isAdminBuy || isProjectPost;
  const showLikeCountFooter = isAdminFund || isAdminBuy || isMyFund || isMyBuy;
  const showBottomRow = isFundFamily || showLikeCountFooter || isShopFund;

  const currentAmountResolved =
    amountText ??
    (isFundFamily ? (isAdminFund || property1 === '내등록상품_펀딩카드_미달성' ? '370,000원' : '570,000원') : '570,000원');

  const progressResolved =
    progressPercent ??
    (isShopFund || isAdminFund || property1 === '내등록상품_펀딩카드_미달성' ? 70 : 100);

  if (isCompact) {
    return (
      <CompactListRow
        variant={property1}
        imageSrc={imageSrc}
        brand={property1 === '스크랩한 프로젝트' ? 'HUSH' : brand}
        title={property1 === '스크랩한 프로젝트' ? '조용하게 지구를 지키는 방법' : title}
        tags={property1 === '스크랩한 프로젝트' ? ['2025', '공모전'] : tags}
        onClick={onClick}
      />
    );
  }

  if (isProjectPost) {
    return (
      <div className={cn('w-[343px] rounded-lg border border-neutral-4 bg-neutral-2 px-4 pb-4 pt-3', className)}>
        <div className="flex flex-col gap-[10px]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CheckboxButton checked={homeExpose} label="홈에 노출" onChange={onHomeExposeChange} />
              <div className="inline-flex items-center gap-[9px]">
                <span className="text-[11px] leading-[1.5] text-neutral-7">공개</span>
                <ToggleSwitch checked={publicChecked} onChange={onPublicChange} />
              </div>
            </div>
            <DashDivider />
          </div>

          <ProjectPostInfo imageSrc={imageSrc} brand="팀명" title="프로젝트 제목" tags={tags} onClick={onClick} />

          <div className="flex w-[250px] items-center justify-between text-[11px] leading-[1.5] text-neutral-8">
            <span>게시 {postedAt}</span>
            <span>조회수 {views}</span>
            <span>좋아요 {likeCount}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-[343px] rounded-lg border border-neutral-4 bg-neutral-2',
        adminMode ? 'pb-4 pt-3' : 'px-[18px] py-4',
        isShopFund || isShopBuy ? 'px-[18px]' : adminMode ? 'px-[18px]' : '',
        className
      )}
    >
      <div className="flex flex-col gap-[10px]">
        {showAdminControls ? (
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center justify-between">
              <CheckboxButton checked={homeExpose} label="홈에 노출" onChange={onHomeExposeChange} />
              <div className="inline-flex items-center gap-[9px]">
                <span className="text-[11px] leading-[1.5] text-neutral-7">공개</span>
                <ToggleSwitch checked={publicChecked} onChange={onPublicChange} />
              </div>
            </div>
            <DashDivider />
          </div>
        ) : null}

        <ProductInfoBlock
          imageSrc={imageSrc}
          brand={brand}
          title={title}
          description={description}
          showPeriodField={isAdminFund || isAdminBuy || isMyFund || isMyBuy}
          periodLabel={periodLabel ?? (isBuyFamily ? '판매 기간' : '펀딩 기간')}
          periodText={periodText}
          showDDay={isShopFund || isShopBuy}
          showLikeIcon={isShopFund || isShopBuy}
          onClick={onClick}
        />

        {isFundFamily ? (
          <FundingstatusSection
            className="w-full"
            variant={isAdminFund ? 'admin' : isMyFundAchieved ? 'admin_달성' : isShopFund ? '미달성' : 'admin'}
            currentAmount={currentAmountResolved}
            targetAmount={targetAmountText}
            progressPercent={progressResolved}
          />
        ) : null}

        {showBottomRow ? (
          <div className={cn('flex w-full items-center', showLikeCountFooter && !isFundFamily ? 'justify-end' : 'justify-between')}>
          {isFundFamily ? <FundPercent variant={isMyFundAchieved ? '달성' : '미달성'} percentText={`${Math.round(progressResolved)}%`} /> : null}
          {isShopFund ? <ProductLike /> : null}
          {showLikeCountFooter ? <LikeStat count={likeCount} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
