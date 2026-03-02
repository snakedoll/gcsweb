import { cn } from '@/lib/utils';

type TabbarVariant =
  | 'about'
  | 'archive'
  | 'home'
  | 'shap'
  | 'community'
  | 'shop_partnerup'
  | 'shop_fund&buynow';

interface TabbarProps {
  className?: string;
  variant?: TabbarVariant;
  onOrderClick?: () => void;
}

interface NavItem {
  key: Exclude<TabbarVariant, 'shop_partnerup' | 'shop_fund&buynow'>;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'about', label: 'About' },
  { key: 'archive', label: 'Archive' },
  { key: 'home', label: 'Home' },
  { key: 'shap', label: 'Shop' },
  { key: 'community', label: 'Community' },
];

function IconPlaceholder({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'h-6 w-6 rounded-[6px] border-[1.5px]',
        active ? 'border-orange-5' : 'border-neutral-7'
      )}
      aria-hidden
    />
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <span className="relative block h-5 w-5" aria-hidden>
      <span
        className={cn(
          'absolute left-1 top-[2px] h-[9px] w-[9px] -rotate-45 rounded-[5px_5px_0_0] border border-b-0 border-r-0',
          active ? 'border-orange-5' : 'border-neutral-6'
        )}
      />
      <span
        className={cn(
          'absolute right-1 top-[2px] h-[9px] w-[9px] rotate-45 rounded-[5px_5px_0_0] border border-b-0 border-l-0',
          active ? 'border-orange-5' : 'border-neutral-6'
        )}
      />
    </span>
  );
}

function CartIcon() {
  return (
    <span className="relative block h-5 w-5" aria-hidden>
      <span className="absolute left-[3px] top-[4px] h-[9px] w-[12px] rounded-sm border border-neutral-6" />
      <span className="absolute left-[6px] top-[14px] h-[3px] w-[3px] rounded-full bg-neutral-6" />
      <span className="absolute left-[12px] top-[14px] h-[3px] w-[3px] rounded-full bg-neutral-6" />
    </span>
  );
}

export default function Tabbar({ className, variant = 'about', onOrderClick }: TabbarProps) {
  const isPartnerup = variant === 'shop_partnerup';
  const isFundBuyNow = variant === 'shop_fund&buynow';
  const isShopModes = isPartnerup || isFundBuyNow;

  return (
    <nav
      className={cn(
        'flex w-[375px] flex-col border-t border-neutral-4 bg-neutral-3 py-[13px]',
        isFundBuyNow ? 'px-5' : isPartnerup ? 'px-[18px]' : 'px-4',
        className
      )}
      aria-label="Bottom Navigation"
    >
      <div
        className={cn(
          'flex w-full items-center',
          isFundBuyNow ? 'gap-5' : isPartnerup ? 'gap-[23px]' : 'justify-between'
        )}
      >
        {!isShopModes &&
          NAV_ITEMS.map((item) => {
            const active = item.key === variant;

            return (
              <button key={item.key} type="button" className="flex w-[57px] flex-col items-center gap-px">
                <IconPlaceholder active={active} />
                <span className={cn('text-[11px] leading-[1.5]', active ? 'text-orange-5' : 'text-neutral-7')}>
                  {item.label}
                </span>
              </button>
            );
          })}

        {isShopModes && (
          <>
            <button
              type="button"
              className={cn(
                'h-[30px] w-[30px] rounded-full border',
                isFundBuyNow ? 'border-neutral-6 text-neutral-6' : 'border-neutral-6 text-neutral-6'
              )}
              aria-label="like"
            >
              <HeartIcon active={false} />
            </button>

            {isFundBuyNow && (
              <button
                type="button"
                className="h-[30px] w-[30px] rounded-full border border-neutral-6 text-neutral-6"
                aria-label="cart"
              >
                <CartIcon />
              </button>
            )}

            <button
              type="button"
              onClick={onOrderClick}
              className={cn(
                'min-w-0 flex-1 rounded-[8px] px-4 py-3 text-[15px] font-bold leading-[1.5] text-neutral-2',
                isFundBuyNow ? 'bg-orange-5' : 'bg-orange-3'
              )}
            >
              주문하기
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
