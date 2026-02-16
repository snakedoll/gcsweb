import Image from 'next/image';

interface LogoSubtextProps {
  className?: string;
  subtext?: string;
}

export default function LogoSubtext({
  className,
  subtext = 'Graphic Communication Science',
}: LogoSubtextProps) {
  return (
    <div className={`flex w-[182px] flex-col items-center gap-3 ${className ?? ''}`.trim()}>
      <Image src="/assets/logos/logo-gcs.svg" alt="GCS 로고" width={103} height={37} priority />
      <p className="typo-body-xsmall text-orange-5">{subtext}</p>
    </div>
  );
}
