import { format, parseISO } from 'date-fns';
import { shift } from '@floating-ui/react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';

function parseOrNull(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  try {
    const date = parseISO(`${dateStr}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
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
  const startDate = parseOrNull(startValue);
  const endDate = parseOrNull(endValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <p className="typo-body-small-bold text-neutral-10">{title}</p>
          {required ? <span className="typo-body-xsmall-bold text-danger">*</span> : null}
        </div>
        {helperText ? <p className="text-[11px] leading-[1.5] text-neutral-8">{helperText}</p> : null}
      </div>

      <div className="flex h-16 items-center justify-between">
        <div className="date-range-field flex h-full w-[158px] flex-col gap-1">
          <p className="typo-body-xsmall text-neutral-8">{startLabel}</p>
          <div className="flex items-center gap-[7px]">
            <div className="min-w-0 flex-1">
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => {
                  const value = date ? format(date, 'yyyy-MM-dd') : '';
                  onChangeStart(value);
                  if (endDate && date && endDate < date) {
                    onChangeEnd(value);
                  }
                }}
                minDate={today}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                popperPlacement="bottom-start"
                popperModifiers={[shift({ padding: 8 })]}
                className="h-10 w-full min-w-0 rounded-lg border border-neutral-6 bg-neutral-2 px-[14px] typo-body-small text-neutral-12"
                calendarClassName="gcs-datepicker-calendar"
                name={startLabel}
              />
            </div>
            <span className="shrink-0 typo-heading-xxsmall text-neutral-13">{"\uBD80\uD130"}</span>
          </div>
        </div>

        <div className="date-range-field flex h-full w-[158px] flex-col gap-1">
          <p className="typo-body-xsmall text-neutral-8">{endLabel}</p>
          <div className="flex items-center gap-[7px]">
            <div className="min-w-0 flex-1">
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => onChangeEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                minDate={startDate ?? today}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                popperPlacement="bottom-start"
                popperModifiers={[shift({ padding: 8 })]}
                className="h-10 w-full min-w-0 rounded-lg border border-neutral-6 bg-neutral-2 px-[14px] typo-body-small text-neutral-12"
                calendarClassName="gcs-datepicker-calendar"
                name={endLabel}
              />
            </div>
            <span className="shrink-0 typo-heading-xxsmall text-neutral-13">{"\uAE4C\uC9C0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
