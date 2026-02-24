import { cn } from '@/lib/utils';

interface ArchiveCardNameProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function ArchiveCardName({
  className,
  title = '\uC18C\uC7A5 \uC774\uC0C1\uC758 \uD65C\uC6A9 \uAC00\uCE58\uB97C \uB9CC\uB4E4\uB2E4',
  subtitle = '\uC720\uB791',
}: ArchiveCardNameProps) {
  return (
    <div className={cn('flex w-[207px] flex-col items-start leading-[1.5]', className)} data-name="archive_card_name">
      <p className="w-full typo-heading-xsmall text-neutral-12">{title}</p>
      <p className="w-full text-[15px] leading-[1.5] text-neutral-8">{subtitle}</p>
    </div>
  );
}
