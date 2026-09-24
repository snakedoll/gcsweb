'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import Button from '@/components/ui/button/Button';
import Modal from '@/components/ui/common/Modal';
import { createMockLandingV2Service, type LandingV2MockState } from '@/lib/mocks/sales-management-landing-v2-service';
import type { SalesManagementLandingV2Service } from '@/lib/services/sales-management-service';
import type { SalesProduct, SellerLandingSummary, VisitorOrderQr } from '@/types/sales-management';
import VisitorQrDialog, { LandingDialog } from './VisitorQrDialog';
import styles from './landing.module.css';

const assetRoot = '/assets/sales-management/v2';
const format = (value: number) => value.toLocaleString('ko-KR');
const shortcuts = [
  ['현장 포스', 'POS/QR샵 관리'],
  ['데이터 관리', '매출/판매 리포트 보기'],
  ['주문 관리', '전체 주문내역 조회하기'],
] as const;

function LandingFrame({ children }: { children: ReactNode }) {
  return <div className={styles.page}>
    <header className={styles.header}>
      <Image src={`${assetRoot}/header.svg`} alt="GCS" width={1392} height={25} priority />
    </header>
    <main className={styles.main}>
      <h1 id="landing-title" tabIndex={-1} className="sr-only">판매 관리</h1>
      {children}
    </main>
  </div>;
}

export function LandingV2Loading() {
  return <LandingFrame><div role="status" aria-label="판매 관리 정보를 불러오는 중" className={styles.skeleton}>
    <div /><div /><div /><span className="sr-only">판매 관리 정보를 불러오는 중</span>
  </div></LandingFrame>;
}

export default function SalesManagementLandingV2({ mockState = 'success', service: providedService }: {
  mockState?: LandingV2MockState; service?: SalesManagementLandingV2Service;
}) {
  const [service] = useState(() => providedService ?? createMockLandingV2Service(mockState));
  const [summary, setSummary] = useState<SellerLandingSummary | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [qr, setQr] = useState<VisitorOrderQr | null>(null);
  const [qrPending, setQrPending] = useState(false);
  const [deleting, setDeleting] = useState<SalesProduct | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [uploadPending, setUploadPending] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const productsRef = useRef<HTMLUListElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    service.getSellerSummary().then(data => { if (active) setSummary(data); })
      .catch(() => { if (active) setError('판매 관리 정보를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [service]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const list = productsRef.current;
    if (!list) return;
    const update = () => setAtEnd(list.scrollLeft + list.clientWidth >= list.scrollWidth - 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [summary?.recentProducts]);

  function notify(message: string) { setToast({ message }); }
  function comingSoon() { notify('준비 중입니다.'); }
  function openShortcut() {
    if (!summary?.store) notify('해당 기능은 상점/상품 등록 후 이용 가능합니다.');
    else if (!summary.productCount) notify('해당 기능은 상품 등록 후 이용 가능합니다.');
    else comingSoon();
  }
  async function openQr() {
    setQrPending(true);
    try { setQr(await service.getVisitorOrderQr()); }
    catch { notify('QR 정보를 불러오지 못했어요. 다시 시도해주세요.'); }
    finally { setQrPending(false); }
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadPending(true);
    try {
      const store = await service.updateStoreImage(file);
      setSummary(current => current ? { ...current, store } : current);
      notify('상점 이미지를 등록했어요.');
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : '이미지를 등록하지 못했어요. 다시 시도해주세요.');
    } finally { setUploadPending(false); }
  }
  async function confirmDelete() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteError('');
    try {
      setSummary(await service.deleteProduct(deleting.id));
      setDeleting(null);
    } catch { setDeleteError('상품을 삭제하지 못했어요. 다시 시도해주세요.'); }
    finally { setDeletePending(false); }
  }
  function nextProducts() {
    const list = productsRef.current;
    const first = list?.firstElementChild as HTMLElement | null;
    if (!list || !first) return;
    const step = first.offsetWidth + parseFloat(getComputedStyle(list).columnGap);
    list.scrollTo({ left: Math.min(list.scrollLeft + step * 2, list.scrollWidth - list.clientWidth), behavior: 'smooth' });
  }

  if (error) return <LandingFrame><section className={styles.error} role="alert">
    <h2>{error}</h2><p>잠시 후 다시 시도해주세요.</p>
    <Link className={styles.registerLink} href="/sales-management/v2">다시 불러오기</Link>
  </section></LandingFrame>;
  if (!summary) return <LandingV2Loading />;

  return <LandingFrame>
    <section aria-label="상점 정보" className={styles.overview}>
      <div className={styles.profile}>
        {summary.store ? <>
          <button type="button" className={styles.photo} aria-label="상점 이미지 등록" disabled={uploadPending}
            onClick={() => fileRef.current?.click()}>
            {summary.store.imageUrl ? <Image src={summary.store.imageUrl} alt={`${summary.store.name} 상점 이미지`} width={161} height={161} unoptimized />
              : <Image src={`${assetRoot}/upload.svg`} alt="" width={50} height={50} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" aria-label="상점 이미지 파일" className="sr-only" tabIndex={-1} onChange={uploadImage} />
          <div className={styles.profileInfo}>
            <div><h2>{summary.store.name}</h2><p>@{summary.store.storeIdentifier}</p></div>
            <div className={styles.profileActions}>
              <Button color="white" size="s" className={styles.editStore} onClick={comingSoon}>수정하기</Button>
              <Button color="white" size="s" className={styles.qrButton} disabled={qrPending} onClick={openQr}
                leftIcon={<Image src={`${assetRoot}/qr-icon.svg`} alt="" width={17} height={17} />}>QR 발급받기</Button>
            </div>
          </div>
        </> : <>
          <div className={styles.photo} aria-hidden="true" />
          <div className={styles.noStore}><h2>아직 상점이 등록되지 않았어요!</h2>
            <Link className={styles.registerLink} href="/sales-management/store">상점 등록 하러가기</Link>
          </div>
        </>}
      </div>
      <div className={styles.divider} aria-hidden="true"><Image src={`${assetRoot}/divider.svg`} alt="" width={994} height={1} /></div>
      <dl className={styles.stats}>
        {[['등록 상품', `${format(summary.productCount)}개`], ['오늘 매출', `${format(summary.todayRevenue)}원`], ['오늘 판매', `${format(summary.todaySalesCount)}건`]].map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>

    {summary.productCount ? <section className={styles.products} aria-label="상품 관리">
      <button type="button" className={styles.sectionHeading} onClick={comingSoon}>상품 관리<Image src={`${assetRoot}/right.svg`} alt="" width={24} height={24} /></button>
      <p className={styles.recentLabel}>최근 등록 상품</p>
      <div className={styles.carousel}>
        <ul ref={productsRef} className={styles.productList} aria-label="최근 등록 상품" onScroll={event => {
          const list = event.currentTarget;
          setAtEnd(list.scrollLeft + list.clientWidth >= list.scrollWidth - 1);
        }}>
          {summary.recentProducts.map(product => <li key={product.id} className={styles.productCard}>
            <Image src={product.imageUrl ?? '/assets/qrshop/product-placeholder.png'} alt={product.name} width={140} height={140} className={styles.productImage} />
            <div className={styles.productInfo}>
              <div><div className={styles.productName}><span>{product.category}</span><h3>{product.name}</h3></div>
                <p className={styles.price}>{format(product.price)}원</p>
                <p className={styles.stock}>옵션 {product.options.length}개 / 재고 {format(product.stock)}개</p>
              </div>
              <div className={styles.productActions}>
                <Button color="white" size="s" onClick={comingSoon} aria-label={`${product.name} 수정`}>수정</Button>
                <Button color="white" size="s" onClick={() => { setDeleteError(''); setDeleting(product); }} aria-label={`${product.name} 삭제`}>삭제</Button>
              </div>
            </div>
          </li>)}
        </ul>
        <button type="button" className={styles.nextButton} aria-label="다음 상품 보기" disabled={atEnd} onClick={nextProducts}>
          <Image src={`${assetRoot}/next.svg`} alt="" width={24} height={24} />
        </button>
      </div>
    </section> : <section className={`${styles.emptyProducts} ${summary.store ? styles.storeOnly : ''}`} aria-label="상품 관리">
      <h2>아직 상품이 등록 되지 않았어요!</h2>
      {summary.store ? <Link href="/sales-management/products" className={styles.registerLink}>상품 등록 하러가기</Link>
        : <p>상점 등록 후 상품 등록이 가능해요</p>}
    </section>}

    <nav className={styles.shortcuts} aria-label="판매 관리 바로가기">
      {shortcuts.map(([title, description]) => <button key={title} type="button" onClick={openShortcut}>
        <span>{title}<Image src={`${assetRoot}/right.svg`} alt="" width={24} height={24} /></span><p>{description}</p>
      </button>)}
    </nav>
    {toast && <div role="status" className={styles.toast}>
      <Image src={`${assetRoot}/info.svg`} alt="" width={21.5} height={21.5} /><p>{toast.message}</p>
    </div>}
    {qr && <VisitorQrDialog qr={qr} onDismiss={() => setQr(null)} />}
    {deleting && <LandingDialog label="상품 삭제 확인" onDismiss={() => { if (!deletePending) setDeleting(null); }} className={styles.deleteDialog}>
      <Modal variant="Large" title="상품을 삭제하시겠습니까?" description="삭제된 상품은 다시 복구할 수 없습니다."
        className={styles.deleteCard} titleClassName={styles.deleteTitle} disabled={deletePending}
        onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      {deleteError && <p role="alert" className={styles.deleteError}>{deleteError}</p>}
    </LandingDialog>}
  </LandingFrame>;
}
