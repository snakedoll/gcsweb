'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ui/button/Button';
import { LandingDialog } from '../VisitorQrDialog';
import styles from './orders.module.css';

export default function RefundDialog({ orderNo, onRefund, onDismiss, apiMode = false }: {
  apiMode?: boolean;
  orderNo: string; onRefund: (restoreStock: boolean) => Promise<void>; onDismiss: () => void;
}) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [restoreStock, setRestoreStock] = useState(false);

  async function confirm() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(false);
    try { await onRefund(restoreStock); onDismiss(); }
    catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }

  return <LandingDialog label="환불 신청 확인" className={styles.refundDialog}
    onDismiss={() => { if (!busy.current) onDismiss(); }}>
    <div className={styles.refundModal} aria-busy={pending}>
      <h2>주문번호 [{orderNo}] 환불 처리하시겠습니까?</h2>
      <label className={styles.restoreChoice}>
        <input type="checkbox" checked={restoreStock} disabled={pending}
          onChange={event => setRestoreStock(event.target.checked)} />
        판매 수량만큼 재고에 다시 추가
      </label>
      <div className={styles.refundActions}>
        <Button type="button" color="white" size="s" disabled={pending} onClick={onDismiss}>취소</Button>
        <Button type="button" color="orange" size="s" disabled={pending} onClick={confirm}>확인</Button>
      </div>
      {pending && <p role="status" className={styles.refundFeedback}>{apiMode ? '환불 처리 중입니다.' : 'Mock 환불 처리 중입니다.'}</p>}
      {error && <p role="alert" className={styles.refundFeedback}>환불 처리하지 못했어요. 확인을 눌러 다시 시도해주세요.</p>}
    </div>
  </LandingDialog>;
}
