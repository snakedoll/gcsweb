'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/button/Button';
import { readMockStaffInviteRequest, requestMockStaffInvite, subscribeToMockStaffInvite } from '@/lib/mocks/pos-staff-invite-service';
import styles from './staff-invite.module.css';

const assets = '/assets/sales-management/v2/pos/staff-invite';

export default function StaffInvitePage({ valid, storeName, previewFailure = false }: {
  valid: boolean;
  storeName: string;
  previewFailure?: boolean;
}) {
  const router = useRouter();
  const [request, setRequest] = useState<ReturnType<typeof readMockStaffInviteRequest>>(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
  const submitting = useRef(false);
  const failNext = useRef(previewFailure);
  const redirecting = useRef(false);

  useEffect(() => {
    if (!valid) return;
    const sync = () => setRequest(readMockStaffInviteRequest());
    const unsubscribe = subscribeToMockStaffInvite(sync);
    sync();
    setReady(true);
    return unsubscribe;
  }, [valid]);

  const approved = valid && request?.status === 'approved';
  useEffect(() => {
    if (!approved || redirecting.current) return;
    redirecting.current = true;
    const mobile = window.matchMedia?.('(max-width: 760px)').matches;
    router.replace(mobile ? '/sales-management/v2/pos/order-board' : '/sales-management/v2/pos');
  }, [approved, router]);

  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(timer);
  }, [sent]);

  async function submit() {
    if (!ready || submitting.current) return;
    submitting.current = true;
    setSending(true);
    setError(false);
    const simulateFailure = failNext.current;
    failNext.current = false;
    try {
      await requestMockStaffInvite(simulateFailure);
      setSent(true);
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }

  if (!valid) {
    return <main className={styles.page}>
      <section className={`${styles.card} ${styles.invalid}`} aria-labelledby="staff-invite-title">
        <div className={styles.invalidIcon}><picture>
          <source media="(max-width: 600px)" srcSet={`${assets}/invalid-mobile.svg`} />
          <Image src={`${assets}/invalid.svg`} alt="" width={60} height={52.5} />
        </picture></div>
        <h1 id="staff-invite-title">유효하지 않은 링크입니다</h1>
        <p className={styles.description}>링크를 다시 확인하거나 상점 소유자에게 새 링크를 요청해주세요.</p>
      </section>
    </main>;
  }

  const waiting = request?.status === 'pending' || approved;
  const canRequest = !waiting;
  const title = waiting ? '승인을 기다리고 있습니다' : '직원 등록을 요청합니다';
  const description = waiting ? '소유자가 승인하면 자동으로 이동합니다' : '상점 소유자가 승인하면 이용할 수 있습니다';

  return <main className={styles.page}>
    {((error && canRequest) || (sent && waiting && !approved)) && <div className={styles.toast} role={error ? 'alert' : 'status'}>
      <picture className={styles.toastIcon}>
        <source media="(max-width: 600px)" srcSet={`${assets}/info-mobile.svg`} />
        <Image src="/assets/sales-management/v2/orders/refund-info.svg" alt="" width={21.5} height={21.5} />
      </picture>
      <span>{error ? '요청을 보내지 못했습니다. 다시 시도해주세요.' : '요청을 보냈습니다'}</span>
    </div>}
    <section className={`${styles.card} ${styles.inviteCard}`} aria-labelledby="staff-invite-title">
      <div className={styles.message}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            {waiting ? <picture className={styles.pendingIcon}>
              <source media="(max-width: 600px)" srcSet={`${assets}/pending-mobile.svg`} />
              <Image src={`${assets}/pending.svg`} alt="" width={45.9103} height={53.75} />
            </picture> : <picture className={styles.requestIcon}>
              <source media="(max-width: 600px)" srcSet={`${assets}/request-mobile.svg`} />
              <Image src={`${assets}/request.svg`} alt="" width={60} height={60} />
            </picture>}
          </div>
          <p className={styles.shop}>{storeName}</p>
        </div>
        <div className={styles.copy}>
          <div aria-live="polite" aria-atomic="true">
            <h1 id="staff-invite-title">{title}</h1>
            <p className={styles.description}>{description}</p>
            {approved && <p className="sr-only">현장 운영으로 이동합니다.</p>}
          </div>
          {request?.status === 'rejected' && <p className={styles.rejection} role="status">상점 소유자가 이전 요청을 거절했습니다.</p>}
          <p id="staff-invite-mock-note" className={styles.mockNote}>Mock 직원 등록</p>
        </div>
      </div>
      {canRequest && <div>
        <Button type="button" color="orange" size="m" className={styles.requestButton} disabled={!ready || sending} status={sending ? 'disabled' : 'default'}
          aria-describedby="staff-invite-mock-note" onClick={() => void submit()}>
          {sending ? '권한 요청중입니다' : '권한 요청하기'}
        </Button>
        {sending && <span role="status" className="sr-only">권한 요청중입니다</span>}
      </div>}
    </section>
  </main>;
}
