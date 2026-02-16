'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface SubtitleProps {
  title: string;
  className?: string;
  onBack?: () => void;
}

export default function Subtitle({ title, className, onBack }: SubtitleProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <div className={`flex w-[313px] items-center justify-between ${className ?? ''}`.trim()}>
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex h-6 w-6 items-center justify-center"
        aria-label="뒤로가기"
      >
        <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
      </button>
      <h2 className="typo-heading-small w-[241px] text-center text-neutral-12">{title}</h2>
      <span className="inline-flex h-6 w-6 opacity-0" aria-hidden />
    </div>
  );
}
