import Tag from '@/components/ui/common/Tag';
import { cn } from '@/lib/utils';

type MatrixContents06TagTone = 'orange' | 'gray';

interface MatrixContents06Props {
  className?: string;
  orderCode?: string;
  orderTime?: string;
  paymentLabel?: string;
  receiptLabel?: string;
  paymentTone?: MatrixContents06TagTone;
  receiptTone?: MatrixContents06TagTone;
  onClick?: () => void;
}

export default function Matrix_Contents_06({
  className,
  orderCode = '260320B012K',
  orderTime = '14:00',
  paymentLabel = '결제완료',
  receiptLabel = '수령완료',
  paymentTone = 'orange',
  receiptTone = 'gray',
  onClick,
}: MatrixContents06Props) {
  const paymentTagClass =
    paymentTone === 'orange'
      ? 'w-[61px] items-center justify-center gap-[4px] rounded-[4px] bg-[var(--Orange-Orange-4,#F8A376)] px-[8px] py-[2px] text-center text-[13px] font-normal leading-[1.5] tracking-[-0.26px] text-white'
      : 'w-[61px] items-center justify-center gap-[4px] rounded-[4px] bg-[#DDDCDB] px-[8px] py-[2px] text-center text-[13px] font-normal leading-[1.5] tracking-[-0.26px] text-[#6C6764]';

  const receiptTagClass =
    receiptTone === 'orange'
      ? 'w-[61px] items-center justify-center gap-[4px] rounded-[4px] bg-[var(--Orange-Orange-4,#F8A376)] px-[8px] py-[2px] text-center text-[13px] font-normal leading-[1.5] tracking-[-0.26px] text-white'
      : 'w-[61px] items-center justify-center gap-[4px] rounded-[4px] bg-[#DDDCDB] px-[8px] py-[2px] text-center text-[13px] font-normal leading-[1.5] tracking-[-0.26px] text-[#6C6764]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-[359px] items-center justify-between border-b border-[#DDDCDB] text-left',
        className
      )}
      data-name="Matrix_Contents_06"
      data-node-id="7885:45570"
    >
      <div className="flex h-11 w-[130px] shrink-0 items-center py-[16px] pl-[12px] pr-[8px]">
        <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-normal leading-[1.5] tracking-[-0.26px] text-black">
          {orderCode}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 items-center p-[12px]">
        <p className="whitespace-nowrap text-[13px] font-normal leading-[1.5] tracking-[-0.26px] text-black">{orderTime}</p>
      </div>
      <div className="flex h-11 shrink-0 flex-col items-start justify-center px-[8px]">
        <Tag
          color={paymentTone === 'orange' ? 'solid-orange' : 'white-gray'}
          contents={paymentLabel}
          className={paymentTagClass}
        />
      </div>
      <div className="flex h-11 shrink-0 flex-col items-start justify-center px-[8px]">
        <Tag
          color={receiptTone === 'orange' ? 'solid-orange' : 'white-gray'}
          contents={receiptLabel}
          className={receiptTagClass}
        />
      </div>
    </button>
  );
}
