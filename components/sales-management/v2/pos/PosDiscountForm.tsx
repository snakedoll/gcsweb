'use client';

import Image from 'next/image';
import { useState } from 'react';
import Button from '@/components/ui/button/Button';
import styles from './discount.module.css';

export default function PosDiscountForm({ limit, onApply, onCancel }: {
  limit: number | null;
  onApply: (amount: number) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState('');
  const amount = /^\d+$/.test(input) ? Number(input) : NaN;
  const validAmount = Number.isSafeInteger(amount);
  const error = input && (!validAmount ? '할인 금액은 원 단위로 입력해주세요.'
    : limit !== null && amount > limit ? '할인 금액은 선택한 각 상품 줄의 금액을 초과할 수 없습니다.' : '');
  const canApply = validAmount && amount > 0 && limit !== null && !error;

  return <form className={styles.form} aria-label="할인 적용" onSubmit={event => {
    event.preventDefault();
    if (canApply) onApply(amount);
  }}>
    <div className={styles.field} data-error={Boolean(error)}>
      <input type="text" inputMode="numeric" aria-label="할인 금액" placeholder="원"
        aria-invalid={Boolean(error)} aria-describedby={error ? 'pos-discount-error' : undefined}
        value={validAmount ? amount.toLocaleString('ko-KR') : input}
        onChange={event => setInput(event.target.value.replaceAll(',', ''))} />
      {error && <Image src="/assets/sales-management/v2/pos/discount-danger.svg" alt="" width={17.917} height={16.6037} />}
    </div>
    <Button type="button" size="s" color="white" onClick={onCancel}>취소</Button>
    <Button type="submit" size="s" color="black" status={canApply ? 'default' : 'disabled'}>적용</Button>
    {error && <p role="alert" className={styles.error} id="pos-discount-error">{error}</p>}
  </form>;
}
