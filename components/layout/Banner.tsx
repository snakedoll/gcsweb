import { cn } from '@/lib/utils';

interface BannerProps {
  className?: string;
  variant?: 'archive' | 'shop';
}

function ArchiveIllustration() {
  return (
    <div className="relative h-[74px] w-[128px]" aria-hidden>
      <div className="absolute right-0 top-0 h-[50px] w-[112px] rounded-[8px] bg-gradient-to-b from-orange-2 to-orange-1 shadow-[0_3px_8px_rgba(244,109,37,0.18)]" />
      <div className="absolute right-[16px] top-[-4px] h-[18px] w-[36px] rounded-t-[7px] bg-orange-4" />
      <div className="absolute left-[8px] top-[24px] h-[38px] w-[86px] rounded-[6px] border border-orange-3 bg-white/75" />
      <div className="absolute left-[17px] top-[33px] h-[2px] w-[32px] rounded bg-orange-3" />
      <div className="absolute left-[17px] top-[40px] h-[2px] w-[52px] rounded bg-orange-2" />
      <div className="absolute left-[24px] top-[50px] h-[12px] w-[42px] rounded-[999px] border border-orange-3 bg-white/70" />
      <div className="absolute left-[35px] top-[55px] h-[2px] w-[20px] rounded bg-orange-3" />
    </div>
  );
}

function ShopIllustration() {
  return (
    <div className="relative h-[76px] w-[132px]" aria-hidden>
      <div className="absolute bottom-0 left-[8px] h-[42px] w-[116px] rounded-[10px_10px_8px_8px] border border-orange-3 bg-gradient-to-b from-orange-2 to-orange-1 shadow-[0_3px_8px_rgba(244,109,37,0.16)]" />
      <div className="absolute left-[24px] top-[8px] h-[30px] w-[84px] rounded-t-[8px] bg-orange-4" />
      <div className="absolute left-[31px] top-[20px] h-[3px] w-[70px] rounded bg-orange-3" />
      <div className="absolute left-[33px] top-[47px] h-[3px] w-[50px] rounded bg-orange-3" />
      <div className="absolute left-[24px] top-[2px] h-[5px] w-[5px] rounded-full bg-orange-5" />
      <div className="absolute right-[24px] top-[2px] h-[5px] w-[5px] rounded-full bg-orange-5" />
      <svg className="absolute left-[24px] top-0" width="84" height="30" viewBox="0 0 84 30" fill="none">
        <path
          d="M5 25V18C5 8.611 12.611 1 22 1h40c9.389 0 17 7.611 17 17v7"
          stroke="#F46D25"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function Banner({ className, variant = 'archive' }: BannerProps) {
  const isArchive = variant === 'archive';

  return (
    <section className={cn('h-[113px] w-full bg-orange-5 px-[11px] pt-5', className)}>
      <div
        className={cn(
          'flex h-[93px] w-full items-center rounded-t-[9px] bg-neutral-2',
          isArchive ? 'justify-between px-[27px]' : 'justify-between pl-[17px] pr-[23px]'
        )}
      >
        <div className={cn('text-orange-5', isArchive ? 'text-center' : 'pt-[2px] text-left')}>
          <p className="typo-heading-large leading-[1.5] text-orange-5">
            {isArchive ? 'Archive' : 'Shop'}
          </p>
          <p className={cn('mt-[-2px] text-[11px] leading-[1.5]', isArchive ? 'text-orange-4' : 'text-orange-5')}>
            {isArchive
              ? 'GCS의 활동과 기록을 만나보세요.'
              : 'GCS 학생들의 제작 상품을 만나보세요.'}
          </p>
        </div>
        {isArchive ? <ArchiveIllustration /> : <ShopIllustration />}
      </div>
    </section>
  );
}
