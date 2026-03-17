import { cn } from '@/lib/utils';

interface Matrix_Attribute_02Props {
  className?: string;
}

export default function Matrix_Attribute_02({ className }: Matrix_Attribute_02Props) {
  return (
    <div className={cn('flex w-[375px] items-center justify-between border-b border-neutral-5', className)}>
      <div className="flex w-[44px] items-center px-3 pb-1 pt-4">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">No.</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center px-2 pb-1 pt-4">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">상품명</p>
      </div>
      <div className="flex w-[82px] items-center px-3 pb-1 pt-4">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">옵션</p>
      </div>
      <div className="flex w-[77px] items-center px-3 pb-1 pt-4">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">진행상태</p>
      </div>
      <div className="flex w-[69px] items-center px-3 pb-1 pt-4">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">품절여부</p>
      </div>
    </div>
  );
}
