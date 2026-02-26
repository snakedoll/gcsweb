import { cn } from '@/lib/utils';
import DaterangepickerVariation, { type DaterangepickerVariationVariant } from './DaterangepickerVariation';

interface DaterangepickerFieldProps {
  label: string;
  suffix: string;
  value?: string;
  placeholder?: string;
  variant?: DaterangepickerVariationVariant;
}

interface DaterangepickerProps {
  className?: string;
  start?: DaterangepickerFieldProps;
  end?: DaterangepickerFieldProps;
}

function DateRangeField({
  label,
  suffix,
  value,
  placeholder,
  variant = 'Default',
}: DaterangepickerFieldProps) {
  return (
    <div className="flex h-16 w-[158px] flex-col gap-1">
      <div className="h-5">
        <p className="typo-body-xsmall text-neutral-8">{label}</p>
      </div>
      <div className="flex items-center gap-[7px]">
        <DaterangepickerVariation className="shrink-0" property1={variant} value={value} placeholder={placeholder} />
        <p className="typo-heading-xxsmall text-neutral-13">{suffix}</p>
      </div>
    </div>
  );
}

export default function Daterangepicker({
  className,
  start = {
    label: '기간 시작일',
    suffix: '부터',
    placeholder: 'YYYY-MM-DD',
    variant: 'Default',
  },
  end = {
    label: '기간 종료일',
    suffix: '까지',
    placeholder: 'YYYY-MM-DD',
    variant: 'Default',
  },
}: DaterangepickerProps) {
  return (
    <div className={cn('flex w-[343px] flex-col', className)}>
      <div className="flex h-16 w-full items-center justify-between">
        <DateRangeField {...start} />
        <DateRangeField {...end} />
      </div>
    </div>
  );
}
