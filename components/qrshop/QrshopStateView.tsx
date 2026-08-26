import Button from '@/components/ui/button/Button';

type QrshopStateViewProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function QrshopStateView({ title, description, actionLabel, onAction }: QrshopStateViewProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex w-full max-w-[343px] flex-col items-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-orange-1 text-2xl text-orange-6">!</div>
        <h1 className="typo-heading-small text-neutral-12">{title}</h1>
        {description ? <p className="typo-body-small mt-2 whitespace-pre-line text-neutral-8">{description}</p> : null}
        {actionLabel && onAction ? <Button className="mt-6" color="orange" onClick={onAction}>{actionLabel}</Button> : null}
      </div>
    </div>
  );
}
