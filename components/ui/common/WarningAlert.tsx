'use client';

import Image from 'next/image';

interface WarningAlertProps {
  items?: string[];
  className?: string;
}

export default function WarningAlert({
  items = [
    '이 작업은 되돌릴 수 없습니다.',
    '모든 데이터가 영구적으로 삭제됩니다.',
  ],
  className = '',
}: WarningAlertProps) {
  return (
    <div
      className={`rounded-lg border border-[#f0b9b8] bg-[#fae9e8] p-3 ${className}`}
      role="alert"
    >
      {/* Header: Icon + Title */}
      <div className="mb-2 flex items-center gap-1">
        <Image
          src="/assets/icons/light/danger.svg"
          alt=""
          width={16}
          height={16}
          className="shrink-0"
        />
        <p
          className="font-semibold text-[11px] leading-[1.5] text-[#ce1e1b]"
          style={{ fontFamily: 'Pretendard' }}
        >
          주의사항
        </p>
      </div>

      {/* List Items */}
      <ul
        className="space-y-0 text-[11px] leading-[1.5] text-[#ce1e1b]"
        style={{ fontFamily: 'Pretendard' }}
      >
        {items.map((item, idx) => (
          <li key={idx} className="list-disc list-inside marker:text-[#ce1e1b]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
