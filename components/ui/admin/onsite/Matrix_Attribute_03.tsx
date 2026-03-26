import { cn } from '@/lib/utils';

interface MatrixAttribute03Props {
  className?: string;
}

export default function Matrix_Attribute_03({ className }: MatrixAttribute03Props) {
  return (
    <div
      className={cn(
        'grid h-[55px] w-full grid-cols-[1.2fr_0.8fr_1fr_1fr] items-end border-b border-[#DDDCDB] px-2',
        className
      )}
    >
      <p className="px-2 pb-1 pt-4 text-[13px] font-semibold leading-[1.2] tracking-[-0.26px] text-black">주문번호</p>
      <p className="px-1 pb-1 pt-4 text-center text-[13px] font-semibold leading-[1.2] tracking-[-0.26px] text-black">주문 시각</p>
      <p className="px-1 pb-1 pt-4 text-center text-[13px] font-semibold leading-[1.2] tracking-[-0.26px] text-black">결제여부</p>
      <p className="px-1 pb-1 pt-4 text-center text-[13px] font-semibold leading-[1.2] tracking-[-0.26px] text-black">수령여부</p>
    </div>
  );
}

