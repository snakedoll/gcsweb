import { cn } from '@/lib/utils';

type ShopCardVariant = 'fund' | 'buynow_partnerup';

interface ShopCardProps {
  className?: string;
  variant?: ShopCardVariant;
  brand?: string;
  title?: string;
  description?: string;
  imageSrc?: string;
  percentText?: string;
  targetAmountText?: string;
  progressPercent?: number;
}

const DEFAULT_IMAGE =
  'https://www.figma.com/api/mcp/asset/84f9ceca-15f1-4e3a-a0ac-95bf7eb51f8c';

export default function ShopCard({
  className,
  variant = 'fund',
  brand = 'MUA',
  title = '염소 후드집업',
  description = '따뜻함 한 스푼을 더한 그래픽 후드집업',
  imageSrc = DEFAULT_IMAGE,
  percentText = '70%',
  targetAmountText = '목표 금액 : 570,000원',
  progressPercent = 70,
}: ShopCardProps) {
  const isFund = variant === 'fund';
  const clampedPercent = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className={cn('flex w-[375px] items-center justify-center bg-white px-4 py-[23px]', className)}>
      <article className="flex w-[343px] flex-col gap-[13px]">
        <div className="h-[430px] w-full overflow-hidden rounded-xl">
          <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
        </div>

        <div className={cn('flex w-full flex-col', isFund && 'gap-[15px]')}>
          <div className="flex w-full flex-col leading-[1.5]">
            <p className="text-[17px] text-neutral-10">{brand}</p>
            <div className="flex w-full flex-col gap-[3px]">
              <p className="text-2xl font-bold text-neutral-12">{title}</p>
              <p className="text-[17px] text-neutral-9">{description}</p>
            </div>
          </div>

          {isFund && (
            <>
              <div className="w-full border-t border-neutral-5" />
              <div className="flex w-full flex-col gap-[10px]">
                <div className="flex w-full items-center justify-between">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-[17px] w-[39px] items-center justify-center rounded bg-neutral-5 px-[5px] text-center text-[11px] leading-[1.5] text-neutral-9">
                      미달성
                    </span>
                    <span className="text-[13px] leading-[1.5] tracking-[-0.02em] text-neutral-8">{percentText}</span>
                  </div>
                  <span className="text-[13px] leading-[1.5] tracking-[-0.02em] text-neutral-8">{targetAmountText}</span>
                </div>

                <div className="h-[7px] w-full overflow-hidden rounded-[3.5px] border border-neutral-5 bg-[#f8f6f4]">
                  <div className="h-full rounded-[3.5px] bg-[#efddc9]" style={{ width: `${clampedPercent}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
