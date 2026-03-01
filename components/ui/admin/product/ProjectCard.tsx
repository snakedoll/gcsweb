import Image from 'next/image';
import CheckboxButton from '@/components/ui/button/CheckboxButton';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import Tag from '@/components/ui/common/Tag';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  className?: string;
  imageSrc?: string;
  brand?: string;
  title?: string;
  tags?: string[];
  likeCount?: number;
  homeExpose?: boolean;
  publicChecked?: boolean;
  postedAt?: string;
  views?: number;
  onHomeExposeChange?: (checked: boolean) => void;
  onPublicChange?: (checked: boolean) => void;
  onClick?: () => void;
}

function DashDivider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full border-t border-dashed border-neutral-5', className)} aria-hidden />;
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
      <div className="relative h-[125px] w-[102px] overflow-hidden rounded">
        <Image src={imageSrc} alt="" fill unoptimized sizes="102px" className="object-cover" />
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

export default function ProjectCard({
  className,
  imageSrc = '/assets/images/profile_image.png',
  brand = '팀명',
  title = '프로젝트 제목',
  tags = ['2025', '겨울 공모전'],
  likeCount = 17,
  homeExpose = true,
  publicChecked = false,
  postedAt = '2025.01.04 15:13',
  views = 393,
  onHomeExposeChange,
  onPublicChange,
  onClick,
}: ProjectCardProps) {
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

        <ProjectPostInfo imageSrc={imageSrc} brand={brand} title={title} tags={tags} onClick={onClick} />

        <div className="flex w-[250px] items-center justify-between text-[11px] leading-[1.5] text-neutral-8">
          <span>게시 {postedAt}</span>
          <span>조회수 {views}</span>
          <span>좋아요 {likeCount}</span>
        </div>
      </div>
    </div>
  );
}
