'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/button/Button';
import { readMockStaffInviteRequest, requestMockStaffInvite, subscribeToMockStaffInvite } from '@/lib/mocks/pos-staff-invite-service';
import { createPosStaffInviteApiService } from '@/lib/services/pos-staff-api-service';
import type { PosStaffInvite, PosStaffInviteStatus } from '@/lib/services/pos-staff-service';
import { StoreApiError, withOperationalStore } from '@/lib/services/sales-management-api-client';
import styles from './staff-invite.module.css';

const assets = '/assets/sales-management/v2/pos/staff-invite';
const posPath = '/sales-management/v2/pos';
const refreshInterval = 4000;

function useSentNotice() {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(timer);
  }, [sent]);
  return [sent, setSent] as const;
}

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
  const [sent, setSent] = useSentNotice();
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
    router.replace(mobile ? `${posPath}/order-board` : posPath);
  }, [approved, router]);

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

  return <StaffInviteView valid={valid} status={request?.status ?? 'none'} shopName={storeName} mock
    ready={ready} sending={sending} sent={sent} error={error} submit={submit} />;
}

type InviteState = { type: 'loading' | 'invalid' | 'error' } | { type: 'invite'; invite: PosStaffInvite };

export function ApiStaffInvitePage({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const service = useMemo(() => createPosStaffInviteApiService(inviteCode), [inviteCode]);
  const [state, setState] = useState<InviteState>({ type: 'loading' });
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [sent, setSent] = useSentNotice();
  const submission = useRef<AbortController | null>(null);
  const redirecting = useRef(false);
  const invite = state.type === 'invite' ? state.invite : null;
  const pending = invite?.status === 'pending';

  const handleAccessError = useCallback((error: unknown) => {
    if (!(error instanceof StoreApiError)) return false;
    if (error.status === 404) {
      setState({ type: 'invalid' });
      return true;
    }
    if (error.status === 401) {
      const callbackUrl = `/sales-management/v2/staff/join/${encodeURIComponent(inviteCode)}`;
      router.replace(`/login?${new URLSearchParams({ callbackUrl })}`);
      return true;
    }
    return false;
  }, [inviteCode, router]);

  const loading = state.type === 'loading';
  useEffect(() => {
    if (!loading && !pending) return;
    const controller = new AbortController();
    let refresh: number | undefined;

    async function sync() {
      try {
        const result = await service.getInvite(controller.signal);
        if (controller.signal.aborted) return;
        setState({ type: 'invite', invite: result });
        if (pending && result.status === 'pending') schedule();
      } catch (error) {
        if (controller.signal.aborted || handleAccessError(error)) return;
        if (pending) schedule();
        else setState({ type: 'error' });
      }
    }

    function schedule() {
      refresh = window.setTimeout(() => void sync(), refreshInterval);
    }

    if (pending) schedule();
    else void sync();
    return () => {
      controller.abort();
      window.clearTimeout(refresh);
    };
  }, [service, loading, pending, handleAccessError]);

  useEffect(() => {
    if (!invite || redirecting.current) return;
    if (invite.status === 'owner' || (invite.status === 'approved' && invite.store.storeSlug)) {
      redirecting.current = true;
      router.replace(invite.status === 'owner' ? posPath : withOperationalStore(posPath, invite.store.storeSlug));
    }
  }, [invite, router]);

  useEffect(() => () => submission.current?.abort(), []);

  async function submit() {
    if (!invite || (invite.status !== 'none' && invite.status !== 'rejected') || submission.current) return;
    const controller = new AbortController();
    submission.current = controller;
    setSending(true);
    setSubmitError(false);
    try {
      const result = await service.requestAccess(controller.signal);
      if (!controller.signal.aborted) {
        setState({ type: 'invite', invite: { store: { ...invite.store, storeSlug: result.storeSlug }, status: result.status } });
        if (result.status === 'pending') setSent(true);
      }
    } catch (error) {
      if (!controller.signal.aborted && !handleAccessError(error)) setSubmitError(true);
    } finally {
      submission.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  if (loading || state.type === 'error') {
    return <main className={styles.page}>
      <section className={`${styles.card} ${styles.inviteCard}`} aria-labelledby="staff-invite-title">
        <h1 id="staff-invite-title" role={loading ? 'status' : 'alert'}>
          {loading ? '초대 정보를 불러오고 있습니다' : '초대 정보를 불러오지 못했습니다'}
        </h1>
        {!loading && <Button type="button" color="orange" size="m" onClick={() => setState({ type: 'loading' })}>다시 시도하기</Button>}
      </section>
    </main>;
  }

  return <StaffInviteView valid={state.type !== 'invalid'} status={invite?.status ?? 'none'} shopName={invite?.store.name ?? ''}
    ready={invite !== null} sending={sending} sent={sent} error={submitError} submit={submit} />;
}

function StaffInviteView({ valid, status, shopName, ready, sending, sent, error, submit, mock = false }: {
  valid: boolean;
  status: PosStaffInviteStatus;
  shopName: string;
  ready: boolean;
  sending: boolean;
  sent: boolean;
  error: boolean;
  submit: () => Promise<void>;
  mock?: boolean;
}) {
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

  const approved = status === 'approved' || status === 'owner';
  const waiting = status === 'pending' || approved;
  const canRequest = !waiting;
  const requestFailed = error && canRequest;
  const title = waiting ? '승인을 기다리고 있습니다' : '직원 등록을 요청합니다';
  const description = waiting ? '소유자가 승인하면 자동으로 이동합니다' : '상점 소유자가 승인하면 이용할 수 있습니다';

  return <main className={styles.page}>
    {(requestFailed || (sent && status === 'pending')) && <div className={styles.toast} role={requestFailed ? 'alert' : 'status'}>
      <picture className={styles.toastIcon}>
        <source media="(max-width: 600px)" srcSet={`${assets}/info-mobile.svg`} />
        <Image src="/assets/sales-management/v2/orders/refund-info.svg" alt="" width={21.5} height={21.5} />
      </picture>
      <span>{requestFailed ? '요청을 보내지 못했습니다. 다시 시도해주세요.' : '요청을 보냈습니다'}</span>
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
          <p className={styles.shop}>{shopName}</p>
        </div>
        <div className={styles.copy}>
          <div aria-live="polite" aria-atomic="true">
            <h1 id="staff-invite-title">{title}</h1>
            <p className={styles.description}>{description}</p>
            {approved && <p className="sr-only">현장 운영으로 이동합니다.</p>}
          </div>
          {status === 'rejected' && <p className={styles.rejection} role="status">상점 소유자가 이전 요청을 거절했습니다.</p>}
          {mock && <p id="staff-invite-mock-note" className={styles.mockNote}>Mock 직원 등록</p>}
        </div>
      </div>
      {canRequest && <div>
        <Button type="button" color="orange" size="m" className={styles.requestButton} disabled={!ready || sending} status={sending ? 'disabled' : 'default'}
          aria-describedby={mock ? 'staff-invite-mock-note' : undefined} onClick={() => void submit()}>
          {sending ? '권한 요청중입니다' : '권한 요청하기'}
        </Button>
        {sending && <span role="status" className="sr-only">권한 요청중입니다</span>}
      </div>}
    </section>
  </main>;
}
