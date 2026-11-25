'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button/Button';
import { qrshopTerms } from './qrshop-terms';

export default function QrshopTerms({ onClose }: { onClose?: () => void }) {
  return <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-neutral-4 text-neutral-9">
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5">
      <h1 id="qrshop-terms-title" tabIndex={-1} className="mb-6 typo-body-large-bold">이용약관</h1>
      <div className="space-y-5 pb-3 typo-body-xsmall">
        {qrshopTerms.map(({ title, paragraphs }) => <section key={title}>
          <h2>{title}</h2>
          {paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>)}
      </div>
    </div>
    <div className="shrink-0 px-4 pb-[max(50px,env(safe-area-inset-bottom))] pt-[17px]">
      {onClose ? <Button type="button" color="orange" className="h-[55px] rounded-[4px]" onClick={onClose}>확인</Button>
        : <Link href="/QRshop" className="flex h-[55px] w-full items-center justify-center rounded-[4px] bg-orange-5 text-neutral-2 typo-body-small-bold">확인</Link>}
    </div>
  </div>;
}

export function QrshopTermsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    element.querySelector('h1')?.focus();
  }, []);

  return <dialog ref={dialog} aria-labelledby="qrshop-terms-title" onClose={onClose}
    className="m-auto h-dvh max-h-none w-full max-w-[430px] overflow-hidden bg-neutral-4 p-0 backdrop:bg-black/30">
    <QrshopTerms onClose={() => dialog.current?.close()} />
  </dialog>;
}
