import { cn } from '@/lib/utils';
import CheckboxButton from '@/components/ui/button/CheckboxButton';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';

type ListedcardVariant = string;

interface ListedcardProps {
  className?: string;
  property1?: ListedcardVariant;
  onContentClick?: () => void;
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

function StatusChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-lg bg-orange-3 px-2 py-0.5 typo-body-xsmall text-orange-7">
      {label}
    </span>
  );
}

export default function Listedcard({
  className,
  property1 = 'project_post',
  onContentClick,
  imageSrc = '/assets/images/profile_image.png',
  brand = '팀명',
  title = '프로젝트 제목',
  likeCount = 17,
  views = 393,
  postedAt = '2025.01.04 15:13',
  publicExpose = true,
  publicStatusText = '공개',
  projectTags = ['2025', '겨울 공모전'],
}: ListedcardProps) {
  if (property1 !== 'project_post') {
    return null;
  }

  return (
    <div className={cn('w-[343px] rounded-lg border border-neutral-4 bg-neutral-2 px-4 pb-4 pt-3', className)}>
      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CheckboxButton checked={publicExpose} label="홈에 노출" />
            <div className="inline-flex items-center gap-[9px]">
              <span className="text-[11px] leading-[1.5] text-neutral-7">{publicStatusText}</span>
              <ToggleSwitch checked={publicExpose} />
            </div>
          </div>
          <div className="h-px w-full border-t border-dashed border-neutral-5" />
        </div>

        <button
          type="button"
          onClick={onContentClick}
          className={cn('flex w-full items-center gap-4 text-left', onContentClick ? 'cursor-pointer' : 'cursor-default')}
        >
          <div className="h-[125px] w-[102px] overflow-hidden rounded">
            <img src={imageSrc} alt="프로젝트 썸네일" className="size-full object-cover" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
            <div className="flex flex-col gap-[3px]">
              <p className="typo-body-xsmall text-neutral-11">{brand}</p>
              <p className="truncate typo-heading-xsmall text-neutral-12">{title}</p>
            </div>

            <div className="h-px w-full border-t border-dashed border-neutral-5" />

            <div className="flex flex-wrap items-center gap-2">
              {projectTags.map((tag) => (
                <StatusChip key={tag} label={tag} />
              ))}
            </div>
          </div>
        </button>

        <div className="flex w-[250px] items-center justify-between text-[11px] leading-[1.5] text-neutral-8">
          <span>게시 {postedAt}</span>
          <span>조회수 {views}</span>
          <span>좋아요 {likeCount}</span>
        </div>
      </div>
    </div>
  );
}
