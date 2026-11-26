'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/button/Button';
import Tag from '@/components/ui/common/Tag';
import { applyPosDiscount, createPosLine, getPosStock, posLineDiscount, posLineKey, posLineSubtotal, PosStockChangedError, type PosCartLine, type PosPaymentMethod, type PosReceipt, type PosService } from '@/lib/services/pos-service';
import { formatWon } from '@/lib/utils';
import type { SalesProduct } from '@/types/sales-management';
import { withOperationalStore } from '@/lib/services/sales-management-api-client';
import { usePosSession, usePosService } from './PosProvider';
import PosDiscountForm from './PosDiscountForm';
import PosHeader from './PosHeader';
import { LandingDialog } from '../VisitorQrDialog';
import styles from './pos.module.css';

const assets = '/assets/sales-management/v2/pos';
const methods = [{ id: 'card', label: '카드' }, { id: 'cash', label: '현금' }, { id: 'transfer', label: '계좌이체' }] as const;
const stockMessage = '남은 재고수 이상으로 상품을 담을 수 없습니다.';
const lowStockThreshold = 5;

function StepIcon({ plus = false }: { plus?: boolean }) {
  return <span className={styles.stepIcon} aria-hidden="true">
    <Image src={`${assets}/minus-line.svg`} alt="" width={7.5} height={1.5} />
    {plus && <Image src={`${assets}/plus-line.svg`} alt="" width={7.5} height={1.5} className={styles.verticalLine} />}
  </span>;
}

export default function PosPage({ service: providedService, accountId }: { service?: PosService; accountId?: string }) {
  const service = usePosService(providedService);
  const storeSlug = usePosSession()?.storeSlug;
  const apiMode = service.dataSource === 'api';
  const [products, setProducts] = useState<SalesProduct[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [optionProduct, setOptionProduct] = useState<SalesProduct | null>(null);
  const optionTrigger = useRef<HTMLButtonElement | null>(null);
  const optionClose = useRef<HTMLButtonElement>(null);
  const [method, setMethod] = useState<PosPaymentMethod | null>(null);
  const [discountSelection, setDiscountSelection] = useState<Set<string> | null>(null);
  const discountTrigger = useRef<HTMLButtonElement>(null);
  const firstDiscountChoice = useRef<HTMLInputElement>(null);
  const editingDiscount = discountSelection !== null;
  const [pending, setPending] = useState(false);
  const completing = useRef(false);
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [notice, setNotice] = useState<{ text: string; soldOut?: boolean } | null>(null);
  const subtotal = cart.reduce((sum, line) => sum + posLineSubtotal(line), 0);
  const discount = cart.reduce((sum, line) => sum + posLineDiscount(line), 0);
  const discountable = cart.filter(line => !posLineDiscount(line) && posLineSubtotal(line) > 0);
  const selectedLines = discountable.filter(line => discountSelection?.has(posLineKey(line)));
  const discountLimit = selectedLines.length ? Math.min(...selectedLines.map(posLineSubtotal)) : null;
  const total = subtotal - discount;

  useEffect(() => {
    let active = true;
    service.getCatalog().then(data => { if (active) setProducts(data); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [service]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (editingDiscount) firstDiscountChoice.current?.focus();
  }, [editingDiscount]);

  useEffect(() => {
    if (!optionProduct) return;
    optionClose.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setOptionProduct(null);
      optionTrigger.current?.focus();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [optionProduct]);

  function closeOptions() {
    setOptionProduct(null);
    optionTrigger.current?.focus();
  }

  function updateCart(next: PosCartLine[]) {
    if (completing.current) return false;
    // Removing/decreasing stale lines must remain possible after a catalog refresh.
    const onlyDecreasing = next.every(line => line.quantity <= (cart.find(item => posLineKey(item) === posLineKey(line))?.quantity ?? 0));
    if (!onlyDecreasing) {
      for (const line of next) {
        const product = products?.find(item => item.id === line.productId);
        const productQuantity = next.filter(item => item.productId === line.productId).reduce((sum, item) => sum + item.quantity, 0);
        if (!product || line.quantity > getPosStock(product, line.optionId) || productQuantity > product.stock) {
          setNotice({ text: stockMessage });
          return false;
        }
      }
    }
    setCart(next);
    if (!next.length) setDiscountSelection(null);
    else if (discountSelection) setDiscountSelection(new Set(next.map(posLineKey).filter(key => discountSelection.has(key))));
    setNotice(null);
    return true;
  }

  function addLines(lines: PosCartLine[]) {
    const next = cart.map(line => ({ ...line }));
    for (const line of lines) {
      const existing = next.find(item => posLineKey(item) === posLineKey(line));
      if (existing) {
        existing.quantity += 1;
        delete existing.discountAmount;
      }
      else next.push(line);
    }
    return updateCart(next);
  }

  function changeQuantity(line: PosCartLine, delta: number) {
    updateCart(cart.map(item => {
      if (posLineKey(item) !== posLineKey(line)) return item;
      return { ...item, quantity: item.quantity + delta, discountAmount: undefined };
    }).filter(item => item.quantity > 0));
  }

  function finishDiscount() {
    setDiscountSelection(null);
    requestAnimationFrame(() => discountTrigger.current?.focus());
  }

  function toggleDiscountLine(key: string, checked: boolean) {
    setDiscountSelection(current => {
      if (!current) return current;
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function completeSale() {
    if (!method || !cart.length || completing.current) return;
    completing.current = true;
    setPending(true);
    setOptionProduct(null);
    setNotice(null);
    try {
      const result = await service.completeSale(cart, method);
      setReceipt(result);
      setCart([]);
      setMethod(null);
      // The receipt is already committed even if refreshing the catalog fails.
      try { setProducts(await service.getCatalog()); }
      catch { setProducts(null); setLoadError(true); }
    } catch (error) {
      if (error instanceof PosStockChangedError) {
        const unavailable = new Set(error.unavailableLineKeys);
        const names = error.items.length ? error.items.map(item => `${item.name}${item.optionName ? `(${item.optionName})` : ''}`)
          : cart.filter(line => unavailable.has(posLineKey(line)))
            .map(line => `${line.productName}${line.option ? `(${line.option})` : ''}`);
        setCart(current => current.filter(line => !unavailable.has(posLineKey(line))));
        const summary = names.length === 1 ? `[${names[0]}]` : names.join(' / ');
        setNotice({ text: `${summary}가 품절되었습니다. 해당 상품은 자동으로 제외됩니다.`, soldOut: true });
      } else {
        setNotice({ text: error instanceof Error ? error.message : '결제완료 처리에 실패했어요. 다시 시도해주세요.' });
      }
      try { setProducts(await service.getCatalog()); } catch { /* Keep the cart available for retry. */ }
    } finally {
      completing.current = false;
      setPending(false);
    }
  }

  const categories = [...new Set(products?.map(product => product.category).filter(Boolean))];

  return <div className={styles.page}>
    <PosHeader pending={pending} accountId={accountId} />

    <main className={styles.body}>
      <section className={styles.products} aria-label="POS 상품">
        <div className={styles.categoryRow}>
          <div className={styles.categories} role="group" aria-label="상품 카테고리">
            <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>전체</button>
            {categories.map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
          </div>
          <Link href={withOperationalStore("/sales-management/v2/pos/edit", storeSlug)} className={styles.edit}>편집</Link>
        </div>

        {loadError ? <div role="alert" className={styles.empty}>
          <p>상품 정보를 불러오지 못했어요.</p>
          <Button type="button" color="white" size="s" onClick={async () => {
            setLoadError(false);
            try { setProducts(await service.getCatalog()); } catch { setLoadError(true); }
          }}>다시 불러오기</Button>
        </div> : !products ? <p role="status" className={styles.empty}>상품을 불러오는 중입니다.</p>
          : !products.length ? <div className={styles.empty}><p>노출 중인 상품이 없습니다.</p><Link href="/sales-management/v2/products">상품 관리로 이동</Link></div>
            : <ul className={styles.grid} aria-label="POS 상품 목록">
              {products.filter(product => category === null || product.category === category).map(product => {
                const optionStock = product.options.reduce((sum, option) => sum + Math.max(0, option.stock), 0);
                const stock = Math.max(0, product.options.length ? Math.min(product.stock, optionStock) : product.stock);
                const soldOut = stock === 0;
                const lowStock = !soldOut && stock <= lowStockThreshold;
                const count = cart.filter(line => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0);
                return <li key={product.id}>
                  <button type="button" className={styles.productCard} disabled={soldOut || pending}
                    data-sold-out={soldOut} data-low-stock={lowStock} data-option-open={optionProduct?.id === product.id}
                    aria-haspopup={product.options.length ? 'dialog' : undefined}
                    aria-expanded={product.options.length ? optionProduct?.id === product.id : undefined}
                    aria-label={`${product.name}, 재고 ${stock}개${soldOut ? ', 품절' : ''}`} onClick={event => {
                      if (product.options.length) {
                        optionTrigger.current = event.currentTarget;
                        setOptionProduct(product);
                      } else addLines([createPosLine(product)]);
                    }}>
                    <span className={styles.cardTags}>
                      {product.category && <Tag contents={product.category} className={styles.tag} />}
                      {soldOut && <span className={styles.soldOutBadge}>품절</span>}
                    </span>
                    <span className={styles.productName} title={product.name}>{product.name}</span>
                    <span className={styles.stockRow}><span>재고 {stock.toLocaleString('ko-KR')}개</span>{count > 0 && <span className={styles.count} aria-label={`선택 ${count}개`}>{count}</span>}</span>
                  </button>
                </li>;
              })}
            </ul>}
        {!apiMode && <p className={styles.mockNote}>Mock 모드 · 실제 결제 및 QR샵에는 반영되지 않습니다.</p>}
        {optionProduct && <>
          <div className={styles.optionBackdrop} role="presentation" onClick={closeOptions} />
          <section className={styles.optionPanel} role="dialog" aria-labelledby="pos-option-title">
            <div className={styles.optionHeading}>
              <h2 id="pos-option-title">{optionProduct.name}</h2>
              <button ref={optionClose} type="button" aria-label="옵션창 닫기" onClick={closeOptions}>
                <span className={styles.optionCloseIcon} aria-hidden="true" />
              </button>
            </div>
            <ul className={styles.optionGrid}>
              {optionProduct.options.map(option => {
                const count = cart.find(line => line.productId === optionProduct.id && line.optionId === option.id)?.quantity ?? 0;
                const stock = getPosStock(optionProduct, option.id);
                const soldOut = stock <= 0;
                const atLimit = count >= stock;
                return <li key={option.id}>
                  <button type="button" className={styles.optionCard} disabled={atLimit} data-sold-out={soldOut}
                    onClick={() => addLines([createPosLine(optionProduct, option.id)])}>
                    <span className={styles.optionCardRow}>
                      <strong>{option.name}</strong>
                      {soldOut ? <span className={styles.optionSoldOut}>품절</span>
                        : count > 0 && <span className={styles.count} aria-label={`선택 ${count}개`}>{count}</span>}
                    </span>
                    <span className={styles.optionCardRow}>
                      <strong>재고 {stock.toLocaleString('ko-KR')}개</strong>
                      {option.price > 0 && <span>+ {formatWon(option.price)}</span>}
                    </span>
                  </button>
                </li>;
              })}
            </ul>
          </section>
        </>}
      </section>

      <aside className={styles.cart} data-option-open={!!optionProduct} aria-label="POS 장바구니" aria-busy={pending}>
        {cart.length ? <ul className={styles.cartList} aria-label="선택 상품">
          {cart.map(line => <li key={posLineKey(line)} data-discount-editing={editingDiscount}>
            {discountSelection && <input ref={line === discountable[0] ? firstDiscountChoice : undefined}
              className={styles.discountCheckbox} type="checkbox"
              aria-label={`${line.productName}${line.option ? ` ${line.option}` : ''} 할인 선택`}
              disabled={!discountable.includes(line)}
              checked={discountSelection.has(posLineKey(line))}
              onChange={event => toggleDiscountLine(posLineKey(line), event.target.checked)} />}
            <div className={styles.lineName}><h2>{line.productName}</h2>
              <button type="button" aria-label={`${line.productName} ${line.option ?? ''} 제거`} disabled={pending} onClick={() => updateCart(cart.filter(item => posLineKey(item) !== posLineKey(line)))}>
                <Image src={`${assets}/remove.svg`} alt="" width={20} height={20} />
              </button>
            </div>
            {line.option && <p className={styles.option}>{line.option}</p>}
            <div className={styles.linePrice}>
              <p>{formatWon(posLineSubtotal(line) - posLineDiscount(line))}</p>
              <div className={styles.stepper} role="group" aria-label={`${line.productName} ${line.option ?? ''} 수량`}>
                <button type="button" aria-label="수량 줄이기" disabled={pending} onClick={() => changeQuantity(line, -1)}><StepIcon /></button>
                <span aria-label="수량">{line.quantity}</span>
                <button type="button" aria-label="수량 늘리기" disabled={pending} onClick={() => changeQuantity(line, 1)}><StepIcon plus /></button>
              </div>
            </div>
            {posLineDiscount(line) > 0 && <p className={styles.lineDiscount}>기존: {formatWon(posLineSubtotal(line))} / 할인: {formatWon(posLineDiscount(line))}</p>}
          </li>)}
        </ul> : <p className={styles.cartEmpty}>상품을 선택해주세요</p>}
        <div className={styles.payment}>
          <div className={styles.amount}><h2>결제 금액</h2><p data-empty={!cart.length} aria-label="결제 금액">{formatWon(total)}</p></div>
          {discount > 0 && <p className={styles.discountTotal}>기존 금액 : {formatWon(subtotal)} / 할인 금액 : {formatWon(discount)}</p>}
          {discountSelection ? <PosDiscountForm limit={discountLimit}
            onCancel={finishDiscount} onApply={value => {
              setCart(applyPosDiscount(cart, discountSelection, value));
              finishDiscount();
            }} /> : <>
            <div className={styles.methods} role="group" aria-label="결제수단">
              {methods.map(item => <Button type="button" key={item.id} size="s" color="white" disabled={pending}
                aria-pressed={method === item.id} onClick={() => setMethod(item.id)}>{item.label}</Button>)}
            </div>
            <div className={styles.paymentActions}>
              {!apiMode && <Button ref={discountTrigger} type="button" color="beige" disabled={!discountable.length || pending} onClick={() => {
                setOptionProduct(null);
                setDiscountSelection(new Set());
              }}>할인</Button>}
              <Button type="button" color="orange" status={!cart.length || !method || pending || loadError ? 'disabled' : 'default'}
                onClick={completeSale}>{pending ? '처리 중' : '결제완료'}</Button>
            </div>
          </>}
        </div>
      </aside>
    </main>
    {notice && <div role="status" className={notice.soldOut ? styles.soldOutToast : styles.toast}>
      {notice.soldOut && <span className={styles.toastIcon}><Image src="/assets/sales-management/v2/orders/refund-info.svg" alt="" width={21.5} height={21.5} /></span>}
      {notice.text}
    </div>}
    {receipt && <LandingDialog label={apiMode ? "결제완료" : "Mock 결제완료"} onDismiss={() => { if (!pending) setReceipt(null); }} className={styles.receipt}>
      <h2>결제가 완료되었습니다</h2><p>주문번호 {receipt.orderCode}</p>
      <p>{methods.find(item => item.id === receipt.paymentMethod)?.label} · {formatWon(receipt.totalAmount)}</p>
      <ul>{receipt.lines.map(line => <li key={posLineKey(line)}>{line.productName}{line.option ? ` (${line.option})` : ''} / {line.quantity}개</li>)}</ul>
      {!apiMode && <p className={styles.receiptNote}>Mock 처리이며 실제 결제·주문 및 재고에는 반영되지 않습니다.</p>}
      <Button type="button" color="orange" disabled={pending} onClick={() => setReceipt(null)}>확인</Button>
    </LandingDialog>}
  </div>;
}
