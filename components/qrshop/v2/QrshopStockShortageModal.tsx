'use client';

import { useEffect, useRef } from 'react';
import Button from '@/components/ui/button/Button';
import type { QrshopCartLine } from '@/types/qrshop';

type Props = {
  line: Pick<QrshopCartLine, 'productName' | 'option'>;
  onConfirm: () => void;
};

export default function QrshopStockShortageModal({ line, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { productName, option } = line;
  const twoLines = Boolean(option) || productName.length > 14;
  const lastCharacter = productName.trim().slice(-1).charCodeAt(0);
  const particle = !option && lastCharacter >= 0xac00 && lastCharacter <= 0xd7a3 && (lastCharacter - 0xac00) % 28 === 0 ? '가' : '이';

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/[0.35] px-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="qrshop-stock-shortage-title"
        aria-describedby="qrshop-stock-shortage-description"
        className="w-full max-w-[343px] rounded-xl bg-neutral-1 px-7 pb-[23px] pt-10 text-center text-neutral-12"
        onKeyDown={(event) => {
          if (event.key === 'Tab') event.preventDefault();
          if (event.key === 'Escape') onConfirm();
        }}
      >
        <h2 id="qrshop-stock-shortage-title" className={`mx-auto max-w-[265px] break-words ${twoLines ? 'typo-body-small-bold' : 'text-[13px] font-bold leading-[1.5]'}`}>
          {productName}{option ? `(${option})` : ''}{particle}{twoLines ? <br /> : ' '}
          남은 재고수 보다 많이 담겼습니다.
        </h2>
        <p id="qrshop-stock-shortage-description" className="typo-body-xsmall mt-1">
          초과된 재고수는 결제 목록에서 차감됩니다.
        </p>
        <Button ref={confirmRef} type="button" color="orange" size="s" className="mt-[30px] h-9 py-0" onClick={onConfirm}>확인</Button>
      </section>
    </div>
  );
}
