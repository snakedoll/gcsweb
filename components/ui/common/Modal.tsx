import { cn } from '@/lib/utils';

type ModalVariant = 'Default' | 'one button' | 'Toggle' | 'Large';

interface ModalProps {
  className?: string;
  titleClassName?: string;
  variant?: ModalVariant;
  title?: string;
  description?: string;
  toggleLabel?: string;
  toggleChecked?: boolean;
  cancelText?: string;
  confirmText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  onToggleChange?: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({
  checked = false,
  onChange,
}: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative h-5 w-[35px] rounded-full transition-colors',
        checked ? 'bg-orange-5' : 'bg-neutral-6'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-neutral-1 transition-transform',
          checked ? 'translate-x-[17px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function ActionButton({
  tone,
  label,
  onClick,
  disabled,
}: {
  tone: 'secondary' | 'primary';
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isPrimary = tone === 'primary';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-[47px] flex-1 items-center justify-center rounded-lg px-4 py-3 typo-body-small-bold transition-colors',
        isPrimary
          ? 'bg-orange-5 text-neutral-2 disabled:bg-orange-4'
          : 'border border-neutral-5 bg-neutral-2 text-neutral-10 disabled:bg-neutral-3',
        disabled && 'cursor-not-allowed opacity-70'
      )}
    >
      {label}
    </button>
  );
}

export default function Modal({
  className,
  titleClassName,
  variant = 'Default',
  title = '관리자에게 상품글 등록을 요청하시겠습니까?',
  description = '관리자에게 상품글 등록을 요청하시겠습니까?',
  toggleLabel = '공개',
  toggleChecked = false,
  cancelText = '취소',
  confirmText = '확인',
  onCancel,
  onConfirm,
  onToggleChange,
  disabled = false,
}: ModalProps) {
  const isLarge = variant === 'Large';
  const isOneButton = variant === 'one button';
  const isToggle = variant === 'Toggle';

  return (
    <div
      className={cn(
        'flex w-[343px] flex-col rounded-xl bg-neutral-2 px-7 pt-10',
        isLarge ? 'pb-[23px]' : 'pb-6',
        className
      )}
    >
      <div className={cn('flex flex-col', isToggle ? 'gap-5' : 'gap-[30px]')}>
        <div className={cn('flex w-full flex-col items-center', isLarge ? 'gap-1' : isToggle ? 'gap-2.5' : 'gap-[5px]')}>
          <p className={cn('w-[265px] text-center typo-heading-xxsmall text-neutral-12', titleClassName)}>
            {title}
          </p>

          {isLarge ? (
            <p className="w-[265px] text-center typo-body-xsmall text-neutral-10">{description}</p>
          ) : null}

          {isToggle ? (
            <div className="flex items-center gap-[9px]">
              <span className="typo-body-small text-black">{toggleLabel}</span>
              <ToggleSwitch checked={toggleChecked} onChange={onToggleChange} />
            </div>
          ) : null}
        </div>

        {isOneButton ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className={cn(
              'inline-flex h-[47px] w-full items-center justify-center rounded-lg bg-orange-5 px-4 py-3 typo-body-small-bold text-neutral-2 transition-colors',
              disabled && 'cursor-not-allowed opacity-70'
            )}
          >
            {confirmText}
          </button>
        ) : (
          <div className="flex w-full items-end gap-[14px]">
            <ActionButton tone="secondary" label={cancelText} onClick={onCancel} disabled={disabled} />
            <ActionButton tone="primary" label={confirmText} onClick={onConfirm} disabled={disabled} />
          </div>
        )}
      </div>
    </div>
  );
}
