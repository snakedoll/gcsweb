import { cn } from '@/lib/utils';
import RadioButton from '@/components/ui/button/RadioButton';

type RadiocardgroupVariant = 'Default' | 'filled';
type RadiocardgroupOptionStatus = 'default' | 'disabled';

interface RadiocardgroupProps {
  className?: string;
  property1?: RadiocardgroupVariant;
  options?: string[];
  selectedIndex?: number | null;
  optionStatuses?: RadiocardgroupOptionStatus[];
  onSelect?: (index: number) => void;
}

export default function Radiocardgroup({
  className,
  property1 = 'Default',
  options = ['옵션', '옵션', '옵션'],
  selectedIndex,
  optionStatuses,
  onSelect,
}: RadiocardgroupProps) {
  const resolvedSelectedIndex = selectedIndex ?? (property1 === 'filled' ? 1 : null);

  return (
    <div
      className={cn(
        'w-[343px] rounded-lg border bg-neutral-2 p-3',
        property1 === 'filled' ? 'border-neutral-5' : 'border-neutral-4',
        className
      )}
    >
      <div className="flex w-[317px] flex-col gap-[9px]">
        {options.map((option, index) => {
          const isDisabled = optionStatuses?.[index] === 'disabled';
          const isChecked = resolvedSelectedIndex === index;
          const status = isDisabled ? 'disabled' : isChecked ? 'checked' : 'unchecked';

          return (
            <RadioButton
              key={`${option}-${index}`}
              label={option}
              status={status}
              className="h-7"
              onChange={!isDisabled && onSelect ? () => onSelect(index) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
