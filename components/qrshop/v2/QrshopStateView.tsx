import Button from '@/components/ui/button/Button';

type QrshopStateViewProps = {
  icon?: 'cart' | 'warning';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  paymentResult?: boolean;
};

export default function QrshopStateView({ icon, title, description, actionLabel, onAction, paymentResult = false }: QrshopStateViewProps) {
  const action = actionLabel && onAction && <Button className={paymentResult ? 'h-[45px] rounded-[4px]' : 'mt-6'} color="orange" onClick={onAction}>{actionLabel}</Button>;

  return (
    <main className={`relative mx-auto flex min-h-dvh items-center justify-center px-4 ${paymentResult ? 'max-w-[430px] py-28' : ''}`}>
      <div className={`flex w-full max-w-[343px] flex-col items-center text-center ${icon && !paymentResult ? '-translate-y-7' : ''}`}>
        {icon ? (
          <span
            aria-hidden
            className="mb-4 h-10 w-10 bg-orange-5"
            style={{
              WebkitMask: `url('${icon === 'cart' ? '/assets/icons/filled/Filled/Cart.svg' : '/assets/icons/additional/icon-park-solid_caution.svg'}') center / contain no-repeat`,
              mask: `url('${icon === 'cart' ? '/assets/icons/filled/Filled/Cart.svg' : '/assets/icons/additional/icon-park-solid_caution.svg'}') center / contain no-repeat`,
            }}
          />
        ) : <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-orange-1 text-2xl text-orange-6">!</div>}
        <h1 className="typo-heading-small text-neutral-12">{title}</h1>
        {description ? <p className="typo-body-small mt-[3px] whitespace-pre-line text-neutral-9">{description}</p> : null}
        {!paymentResult && action}
      </div>
      {paymentResult && action && <div className="absolute inset-x-4 bottom-[max(51px,env(safe-area-inset-bottom))]">{action}</div>}
    </main>
  );
}
