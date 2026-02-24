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
    <div className="relative h-[124px] w-[143px]" aria-hidden>
      <div className="absolute bottom-0 left-[2px] h-[90px] w-[139px] rounded-[10px] border border-[#fac0a1] bg-gradient-to-b from-[#fcdccb] to-[#fef0e9] shadow-[0_6px_14px_rgba(244,109,37,0.14)]" />
      <div className="absolute bottom-0 left-[8px] h-[90px] w-[127px] rounded-[9px] border border-white/60 bg-gradient-to-b from-white/35 to-transparent" />
      <div className="absolute left-[35px] top-[49px] h-[14px] w-[74px] rounded-[8px] bg-[#f6874c]" />
      <div className="absolute left-[43px] top-[56px] h-[3px] w-[58px] rounded-full bg-[#fac0a1]" />
      <div className="absolute left-[27px] top-[89px] h-[2px] w-[119px] rounded-full bg-[#fcdccb]" />
      <div className="absolute left-[62px] top-[77px] h-[3px] w-[51px] rounded-[4px] bg-[#fac0a1]" />
      <div className="absolute left-[43px] top-[46px] h-[7px] w-[7px] rounded-full border border-[#f46d25] bg-[#f6874c]" />
      <div className="absolute left-[126px] top-[46px] h-[7px] w-[7px] rounded-full border border-[#f46d25] bg-[#f6874c]" />
      <svg className="absolute left-[47px] top-[1px]" width="84" height="47" viewBox="0 0 84 47" fill="none">
        <path
          d="M1 46V43C1 20.356 19.356 2 42 2C64.644 2 83 20.356 83 43V46"
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
  const isShop = variant === 'shop';

  return (
    <section className={cn('h-[113px] w-full bg-orange-5 px-[11px] pt-5', className)}>
      <div
        className={cn(
          'flex w-full rounded-t-[9px] bg-neutral-2',
          isArchive
            ? 'h-[93px] items-center justify-between px-[27px]'
            : 'h-[94px] items-start justify-between pl-[17px] pr-[11px]'
        )}
      >
        <div className={cn('text-orange-5', isArchive ? 'text-center' : 'w-[170px] pt-5 text-left')}>
          <p className={cn(isShop ? 'text-[28px] font-bold leading-[1.5]' : 'typo-heading-large leading-[1.5]')}>
            {isArchive ? 'Archive' : 'Shop'}
          </p>
          <p
            className={cn(
              'text-[11px] leading-[1.5]',
              isArchive ? 'mt-[-2px] text-orange-4' : 'mt-[3px] text-orange-5'
            )}
          >
            {isArchive ? 'GCS의 활동과 기록을 만나보세요.' : 'GCS 학생들의 제작 상품을 만나보세요.'}
          </p>
        </div>
        {isArchive ? <ArchiveIllustration /> : <ShopIllustration />}
      </div>
    </section>
  );
}
