import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BannerProps {
  className?: string;
  variant?: 'archive' | 'shop';
}

export default function Banner({ className, variant = 'archive' }: BannerProps) {
  const src =
    variant === 'shop'
      ? '/assets/images/banner-shop.svg'
      : '/assets/images/banner-archive.svg';

  return (
    <section className={cn('relative h-[113px] w-full', className)}>
      <Image src={src} alt="" fill aria-hidden className="object-cover" priority={variant === 'shop'} />
    </section>
  );
}
