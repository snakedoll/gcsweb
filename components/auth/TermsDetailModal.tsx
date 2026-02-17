'use client';

interface TermsDetailModalProps {
  title: string;
  content: string;
  onConfirm: () => void;
}

export default function TermsDetailModal({ title, content, onConfirm }: TermsDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-1">
      <div className="flex shrink-0 items-center justify-center border-b border-neutral-4 py-4">
        <h2 className="typo-heading-small text-neutral-12">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <pre className="typo-body-small whitespace-pre-wrap font-sans text-neutral-10">{content}</pre>
      </div>
      <div className="shrink-0 border-t border-neutral-4 p-4">
        <button
          type="button"
          onClick={onConfirm}
          className="h-[55px] w-full rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2"
        >
          확인
        </button>
      </div>
    </div>
  );
}
