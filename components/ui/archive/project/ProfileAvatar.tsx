import { cn } from '@/lib/utils';

type ProfileVariant = 'default' | 'major' | 'general';

interface ProfileAvatarProps {
  className?: string;
  variant?: ProfileVariant;
  name?: string;
  major?: string;
  imageSrc?: string;
  imageAlt?: string;
}

function PlaceholderAvatar() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-orange-2 to-orange-3 text-[12px] font-semibold text-orange-6">
      GCS
    </div>
  );
}

export default function ProfileAvatar({
  className,
  variant = 'default',
  name = '배민영',
  major = '산업시스템공학과',
  imageSrc,
  imageAlt,
}: ProfileAvatarProps) {
  const showBadge = variant !== 'default';
  const badgeText = variant === 'major' ? `${name} / ${major}` : name;

  return (
    <div className={cn('relative inline-block h-[79px] w-[47px] overflow-visible', className)}>
      <div className={cn('h-[47px] w-[47px] overflow-hidden rounded-full', variant !== 'default' && 'ring-2 ring-orange-5 ring-offset-0')}>
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt ?? `${name} 프로필`} className="h-full w-full object-cover" />
        ) : (
          <PlaceholderAvatar />
        )}
      </div>

      {showBadge ? (
        <div
          className={cn(
            'absolute top-[53px] flex h-[26px] items-center justify-center rounded-[8px] border border-orange-3 bg-neutral-2 px-[10px] py-1',
            variant === 'major' ? 'left-[-43px]' : 'left-[-1px]'
          )}
        >
          <span className="whitespace-nowrap text-[11px] leading-[1.5] text-neutral-10">{badgeText}</span>
        </div>
      ) : null}
    </div>
  );
}