import { cn } from '@/lib/utils';

interface MatrixContents03Props {
  className?: string;
  orderId: string;
  orderTime: string;
  paymentStatus: string;
  receiptStatus: string;
  onClick?: () => void;
}

function badgeStyle(type: 'payment' | 'receipt', status: string) {
  if (type === 'payment') {
    if (status === '결제완료') return 'bg-[#F8A376] text-white';
    return 'bg-[#F1F1F1] text-[#6C6764]';
  }

  if (status === '수령완료') return 'bg-[#F1F1F1] text-[#6C6764]';
  return 'bg-[#F8A376] text-white';
}

export default function Matrix_Contents_03({
  className,
  orderId,
  orderTime,
  paymentStatus,
  receiptStatus,
  onClick,
}: MatrixContents03Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid h-[44px] w-full grid-cols-[1.2fr_0.8fr_1fr_1fr] items-center border-b border-[#DDDCDB] px-2 text-left last:border-b-0',
        className
      )}
    >
      <p className="truncate px-2 text-[13px] leading-[1.5] tracking-[-0.26px] text-black">{orderId}</p>
      <p className="px-1 text-center text-[13px] leading-[1.5] tracking-[-0.26px] text-black">{orderTime}</p>
      <span className="flex items-center justify-center px-1">
        <span
          className={cn(
            'inline-flex h-6 w-[61px] items-center justify-center rounded-[4px] text-[13px] font-semibold leading-[1.5] tracking-[-0.26px]',
            badgeStyle('payment', paymentStatus)
          )}
        >
          {paymentStatus}
        </span>
      </span>
      <span className="flex items-center justify-center px-1">
        <span
          className={cn(
            'inline-flex h-6 w-[61px] items-center justify-center rounded-[4px] text-[13px] font-semibold leading-[1.5] tracking-[-0.26px]',
            badgeStyle('receipt', receiptStatus)
          )}
        >
          {receiptStatus}
        </span>
      </span>
    </button>
  );
}

