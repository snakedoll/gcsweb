import { cn } from '@/lib/utils';
import Tag from '@/components/ui/common/Tag';

interface MatrixAttribute06Props {
  className?: string;
}

export default function Matrix_Attribute_06({ className }: MatrixAttribute06Props) {
  return (
    <div
      className={cn('flex w-[359px] items-center justify-between border-b border-[#DDDCDB]', className)}
      data-name="Matrix_Attribute_06"
      data-node-id="7885:46021"
    >
      <div className="flex w-[130px] shrink-0 items-center pb-[4px] pl-[12px] pr-[8px] pt-[16px]">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">주문번호</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center px-[12px] pb-[4px] pt-[16px]">
        <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-black">주문 시각</p>
      </div>
      <div className="flex w-[77px] shrink-0 items-center justify-start pb-[4px] pl-[12px] pr-[24px] pt-[16px]">
        <Tag
          color="white-gray"
          contents="결제여부"
          className="h-auto gap-0 rounded-none bg-transparent px-0 py-0 text-black font-semibold leading-[1.5] tracking-[-0.26px] [&>span]:whitespace-nowrap"
        />
      </div>
      <div className="flex w-[77px] shrink-0 items-center justify-start pb-[4px] pl-[12px] pr-[24px] pt-[16px]">
        <Tag
          color="white-gray"
          contents="수령여부"
          className="h-auto gap-0 rounded-none bg-transparent px-0 py-0 text-black font-semibold leading-[1.5] tracking-[-0.26px] [&>span]:whitespace-nowrap"
        />
      </div>
    </div>
  );
}
