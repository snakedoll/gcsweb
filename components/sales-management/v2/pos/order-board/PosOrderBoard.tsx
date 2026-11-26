'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/button/Button';
import { orderPaymentLabels } from '@/lib/services/orders-service';
import { posLineKey, type PosReceipt } from '@/lib/services/pos-service';
import { formatWon } from '@/lib/utils';
import PosHeader from '../PosHeader';
import { usePosService } from '../PosProvider';
import posStyles from '../pos.module.css';
import styles from './order-board.module.css';

export default function PosOrderBoard() {
  const service = usePosService();
  const [receipts, setReceipts] = useState<PosReceipt[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    service.getReceipts()
      .then(orders => { if (active) setReceipts(orders); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [service, retry]);

  return <div className={posStyles.page}>
    <PosHeader page="board" initialHelp={false} />
    <main className={styles.body}>
      {error ? <div role="alert" className={posStyles.empty}>
        <p>주문서를 불러오지 못했어요.</p>
        <Button type="button" color="white" size="s" onClick={() => {
          setError(false);
          setRetry(current => current + 1);
        }}>다시 불러오기</Button>
      </div> : !receipts ? <p role="status" className={posStyles.empty}>주문서를 불러오는 중입니다.</p>
        : receipts.length === 0 ? <div className={posStyles.empty}>
          <p>결제 완료된 주문서가 없어요.</p>
          <p>현장 포스에서 결제를 완료하면 여기에 주문서가 표시돼요.</p>
        </div> : <ul aria-label="현장 POS 주문서" className={styles.grid}>
          {receipts.map(receipt => <li key={receipt.orderCode} className={styles.card}>
            <h2>주문번호 <strong>{receipt.orderCode}</strong></h2>
            <ul className={styles.items}>
              {receipt.lines.map(line => <li key={posLineKey(line)}>
                <div><p>{line.productName}</p>{line.option && <p className={styles.option}>{line.option}</p>}</div>
                <span>{line.quantity}개</span>
              </li>)}
            </ul>
            <div className={styles.total}><span>{orderPaymentLabels[receipt.paymentMethod]}</span><strong>{formatWon(receipt.totalAmount)}</strong></div>
          </li>)}
        </ul>}
    </main>
  </div>;
}
