'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const CONFIRM_TEXT = '삭제하겠습니다';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canConfirm = inputValue.trim() === CONFIRM_TEXT && !isDeleting;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }, [canConfirm, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setInputValue('');
      onClose();
    }
  }, [isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-[343px] rounded-xl bg-neutral-1 p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="flex items-center gap-2 mb-3">
          <Image src="/assets/icons/icon-trash-danger.svg" alt="" width={24} height={24} />
          <h2 id="delete-modal-title" className="typo-body-small-bold text-neutral-10">
            계정 삭제
          </h2>
        </div>

        <p className="typo-body-xsmall text-neutral-10 mb-4">정말 계정을 삭제하시겠습니까?</p>

        <div className="rounded-lg border border-danger bg-[#ce1e1b]/10 p-3 mb-4">
          <div className="flex items-center gap-1 mb-1">
            <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} className="shrink-0" />
            <p className="typo-body-xsmall-bold text-danger">주의사항</p>
          </div>
          <ul className="typo-body-xsmall text-danger space-y-0.5 list-disc list-inside ml-5">
            <li>이 작업은 되돌릴 수 없습니다.</li>
            <li>모든 데이터가 영구적으로 삭제됩니다.</li>
          </ul>
        </div>

        <p className="typo-body-xsmall text-neutral-10 mb-2">
          계정을 삭제하려면 &quot;<span className="text-danger">삭제하겠습니다</span>&quot;를 입력하세요.
        </p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="삭제하겠습니다"
          className={cn(
            'mb-4 h-[45px] w-full rounded-lg border px-3 typo-body-xsmall outline-none placeholder:text-neutral-7',
            'border-neutral-5 bg-neutral-2 text-neutral-10'
          )}
          disabled={isDeleting}
          autoComplete="off"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-neutral-5 bg-neutral-1 py-3 typo-body-small-bold text-neutral-10 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn('flex-1 rounded-lg py-3 typo-body-small-bold')}
            style={
              !canConfirm
                ? { backgroundColor: '#C7C5C4', color: '#FDFDFD' }
                : { backgroundColor: '#CE1E1B', color: '#FDFDFD' }
            }
          >
            계정 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
