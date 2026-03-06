import { cn } from '@/lib/utils';

type SingleDateInputProps = {
  label: string;
  suffix: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function SingleDateInput({
  label,
  suffix,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
}: SingleDateInputProps) {
  return (
    <div className="flex h-16 w-[158px] flex-col gap-1">
      <p className="h-5 typo-body-xsmall text-neutral-8">{label}</p>
      <div className="flex items-center gap-[7px]">
        <label
          className={cn(
            'relative inline-flex h-10 w-[125px] items-center justify-center rounded-lg border bg-neutral-2 px-[14px] py-2',
            value ? 'border-neutral-6' : 'border-neutral-4'
          )}
        >
          <span className={cn('typo-body-small', value ? 'text-neutral-12' : 'text-neutral-7')}>
            {value || placeholder}
          </span>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <p className="typo-heading-xxsmall text-neutral-13">{suffix}</p>
      </div>
    </div>
  );
}

type DateRangeInputProps = {
  title: string;
  required?: boolean;
  helperText?: string;
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  onChangeStart: (next: string) => void;
  onChangeEnd: (next: string) => void;
};

export default function DateRangeInput({
  title,
  required = false,
  helperText,
  startLabel,
  endLabel,
  startValue,
  endValue,
  onChangeStart,
  onChangeEnd,
}: DateRangeInputProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <p className="typo-body-small-bold text-neutral-10">{title}</p>
          {required ? <span className="typo-body-xsmall-bold text-danger">*</span> : null}
        </div>
        {helperText ? <p className="text-[11px] leading-[1.5] text-neutral-8">{helperText}</p> : null}
      </div>
      <div className="flex h-16 w-full items-center justify-between">
        <SingleDateInput label={startLabel} suffix="부터" value={startValue} onChange={onChangeStart} />
        <SingleDateInput label={endLabel} suffix="까지" value={endValue} onChange={onChangeEnd} />
      </div>
    </div>
  );
}
