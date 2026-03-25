import { cn } from '@/lib/utils';

type ItemSize = 'm' | 'l';
type ItemState =
  | 'default'
  | 'hovered'
  | 'selected'
  | 'default_subtext'
  | 'hovered_subtext'
  | 'selected_subtext';

interface ItemProps {
  contents?: string;
  subtext?: string;
  size?: ItemSize;
  state?: ItemState;
  className?: string;
  onClick?: () => void;
}

export default function Item({
  contents = '리스트',
  subtext,
  size = 'm',
  state = 'default',
  className,
  onClick,
}: ItemProps) {
  const isSubtextState = state.includes('subtext');
  const hasSubtext = size === 'l' && (isSubtextState || typeof subtext === 'string');
  const visualState = state.replace('_subtext', '') as 'default' | 'hovered' | 'selected';

  const textClass =
    size === 'l' && visualState === 'selected' && !hasSubtext
      ? 'typo-body-small'
      : 'typo-body-xsmall';
  const backgroundClass =
    visualState === 'selected'
      ? 'bg-neutral-5'
      : visualState === 'hovered'
        ? 'bg-neutral-3'
        : 'bg-neutral-2';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center text-left text-neutral-10 transition-colors',
        hasSubtext ? 'justify-between p-3' : 'px-3 py-2',
        backgroundClass,
        textClass,
        className
      )}
    >
      <span>{contents}</span>
      {hasSubtext && subtext ? <span className="typo-body-xsmall">{subtext}</span> : null}
    </button>
  );
}
