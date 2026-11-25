'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ToggleSwitch from '@/components/ui/button/ToggleSwitch';
import PosStaffPanel from './PosStaffPanel';
import styles from './pos.module.css';

const assets = '/assets/sales-management/v2/pos';
const titles = { pos: '현장 포스', orders: '전체 주문 조회', board: '주문서 보드' };
type PosHeaderPage = keyof typeof titles;
const helpDisplayMs = 4000;
const shownHelpAccounts = new Set<string>();

export default function PosHeader({ pending = false, initialHelp = true, page = 'pos', accountId }: { pending?: boolean; initialHelp?: boolean; page?: PosHeaderPage; accountId?: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [openHelp, setOpenHelp] = useState<{ accountId?: string } | null>(null);
  const showHelp = openHelp !== null && openHelp.accountId === accountId;
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!initialHelp || !accountId || shownHelpAccounts.has(accountId)) return;
    const key = `gcsweb:pos:qr-help:${accountId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* The in-memory flag still covers client navigation. */ }
    shownHelpAccounts.add(accountId);
    setOpenHelp({ accountId });
  }, [accountId, initialHelp]);

  useEffect(() => {
    if (!showHelp) return;
    const timer = window.setTimeout(() => setOpenHelp(null), helpDisplayMs);
    return () => window.clearTimeout(timer);
  }, [showHelp, openHelp]);

  useEffect(() => {
    if (!menuOpen) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) setMenuOpen(false);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !navigation.current?.contains(document.activeElement)) return;
      setMenuOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div ref={navigation} className={styles.navigation}>
        <h1><button ref={trigger} type="button" className={styles.title} aria-expanded={menuOpen} aria-controls="pos-navigation" onClick={() => setMenuOpen(open => !open)}>
          <span>{titles[page]}</span><Image src={`${assets}/down.svg`} alt="" width={24} height={24} />
        </button></h1>
        <nav id="pos-navigation" aria-label="현장 운영 화면" className={styles.menu} hidden={!menuOpen}>
          {page !== 'pos' && <Link href="/sales-management/v2/pos" onClick={() => setMenuOpen(false)}>{titles.pos}</Link>}
          <Link href="/sales-management/v2/orders" aria-current={page === 'orders' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{titles.orders}</Link>
          <Link href="/sales-management/v2/pos/order-board" aria-current={page === 'board' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{titles.board}</Link>
          {page === 'orders' && <>
            <Link href="/sales-management/v2">판매 관리 홈</Link>
            <Link href="/sales-management/v2/products">상품 관리</Link>
          </>}
        </nav>
      </div>
      <div className={styles.headerActions}>
        <PosStaffPanel disabled={pending} onOpen={() => setOpenHelp(null)} />
        <button type="button" className={styles.qrLabel} aria-label="QR shop 도움말" aria-expanded={showHelp} onClick={() => setOpenHelp(showHelp ? null : { accountId })}>QR shop</button>
        <label className={styles.qrControl}>
          <span className="sr-only">QR shop</span>
          <ToggleSwitch checked={qrOpen} disabled={pending} onChange={checked => { setQrOpen(checked); setOpenHelp(null); }} />
        </label>
      </div>
      {showHelp && <div className={styles.help} role="note">
        <Image src={`${assets}/tooltip.svg`} alt="" width={474} height={57.9998} />
        <p>토글을 누르면 QR샵을 오픈할 수 있어요. 오픈시 고객들에게 상품이 노출돼요</p>
        <span className="sr-only">현재는 Mock 상태로 실제 QR샵에는 반영되지 않습니다.</span>
      </div>}
    </header>
  );
}
