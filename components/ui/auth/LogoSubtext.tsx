import Image from 'next/image';
import Link from 'next/link';

interface LogoSubtextProps {
  className?: string;
  subtext?: string;
}

export default function LogoSubtext({
  className,
  subtext = 'Graphic Communication Science',
}: LogoSubtextProps) {
  return (
    <Link
      href="/"
      className={`flex w-[182px] flex-col items-center gap-3 ${className ?? ''}`.trim()}
      aria-label="메인으로 이동"
    >
      <Image src="/assets/logos/logo-gcs.svg" alt="GCS 로고" width={103} height={37} priority />
      <p className="typo-body-xsmall text-orange-5">{subtext}</p>
    </Link>
  );
}
