import { cn } from '@/lib/utils';

type ItemSize = 'm' | 'l';
type ItemState = 'default' | 'hovered' | 'selected';

interface ItemProps {
  contents?: string;
  size?: ItemSize;
  state?: ItemState;
  className?: string;
  onClick?: () => void;
}

export default function Item({
  contents = '리스트',
  size = 'm',
  state = 'default',
  className,
  onClick,
}: ItemProps) {
  const textClass = size === 'l' ? 'typo-body-small' : 'typo-body-xsmall';
  const backgroundClass =
    state === 'selected'
      ? 'bg-neutral-5'
      : state === 'hovered'
        ? 'bg-neutral-3'
        : 'bg-neutral-2';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center px-3 py-2 text-left text-neutral-10 transition-colors',
        backgroundClass,
        textClass,
        className
      )}
    >
      {contents}
    </button>
  );
}
