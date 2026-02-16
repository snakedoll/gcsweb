import { cn } from '@/lib/utils';
import MenuSectionItem from './MenuSectionItem';
import MenuSectionTitle from './MenuSectionTitle';

interface MenuSectionProps {
  title?: string;
  items?: string[];
  className?: string;
}

export default function MenuSection({
  title = '판매 관리',
  items = ['상품글 관리', '주문 관리', '전체 품목 관리', '정산 관리', '상품 리뷰 관리'],
  className,
}: MenuSectionProps) {
  return (
    <section className={cn('w-full rounded-lg bg-neutral-1 p-4', className)}>
      <div className="flex w-full flex-col gap-[5px]">
        <MenuSectionTitle>{title}</MenuSectionTitle>
        <div className="h-px w-full bg-neutral-4" />
        <div className="flex w-full flex-col gap-3">
          {items.map((item) => (
            <MenuSectionItem key={item}>{item}</MenuSectionItem>
          ))}
        </div>
      </div>
    </section>
  );
}

