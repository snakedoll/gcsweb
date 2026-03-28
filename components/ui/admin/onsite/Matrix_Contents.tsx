import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import Tag from '@/components/ui/common/Tag';
import { cn } from '@/lib/utils';

type MatrixStatus = 'ACTIVE' | 'COMPLETED';

interface Matrix_ContentsProps {
  className?: string;
  no?: number | string;
  productName?: string;
  optionText?: string[];
  status?: MatrixStatus;
  isSoldOut?: boolean;
  disableSwitchWhenCompleted?: boolean;
  onSoldOutChange?: (next: boolean) => void;
}

function statusLabel(status: MatrixStatus) {
  return status === 'ACTIVE' ? '진행중' : '진행완료';
}

export default function Matrix_Contents({
  className,
  no = 1,
  productName = '상품명',
  optionText = ['단일상품'],
  status = 'ACTIVE',
  isSoldOut = false,
  disableSwitchWhenCompleted = true,
  onSoldOutChange,
}: Matrix_ContentsProps) {
  const isCompleted = status === 'COMPLETED';
  const switchDisabled = disableSwitchWhenCompleted && isCompleted;

  return (
    <div className={cn('flex w-[375px] items-center justify-between border-b border-neutral-5', className)}>
      <div className="flex w-[44px] items-center p-3">
        <p className="text-[13px] leading-[1.5] tracking-[-0.26px] text-black">{no}</p>
      </div>

      <div className="flex min-w-0 flex-1 items-center px-2 py-3">
        <p className="w-full whitespace-normal break-words text-[13px] leading-[1.5] tracking-[-0.26px] text-black">{productName}</p>
      </div>

      <div className="flex min-h-[58px] w-[82px] flex-col justify-center px-2 py-3">
        {optionText.map((line, index) => (
          <p key={`${line}-${index}`} className="w-full whitespace-normal break-words text-[11px] leading-[1.5] text-black">
            {line}
          </p>
        ))}
      </div>

      <div className="flex h-[44px] w-[77px] items-center px-2">
        <Tag
          color={isCompleted ? 'solid-orange' : 'white-gray'}
          contents={statusLabel(status)}
          className="h-6 w-[61px] rounded-[4px] px-0 py-[2px]"
        />
      </div>

      <div className="flex h-[44px] w-[69px] items-center justify-center px-3">
        <ToggleSwitch
          checked={isSoldOut}
          disabled={switchDisabled}
          onChange={onSoldOutChange}
          className={switchDisabled ? 'opacity-100' : ''}
        />
      </div>
    </div>
  );
}
