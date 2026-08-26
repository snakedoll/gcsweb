import Button from '@/components/ui/button/Button';
import { formatWon } from '@/lib/utils';
import type { QrshopCartLine, QrshopPaymentMethod } from '@/types/qrshop';

type Props = {
  lines: QrshopCartLine[]; buyerName: string; buyerPhone: string; paymentMethod: QrshopPaymentMethod;
  agreed: boolean; submitting: boolean; error: string | null;
  onBuyerNameChange: (value: string) => void; onBuyerPhoneChange: (value: string) => void;
  onPaymentMethodChange: (value: QrshopPaymentMethod) => void; onAgreementChange: (value: boolean) => void;
  onQuantityChange: (productId: string, next: number) => void; onRemove: (productId: string) => void; onSubmit: () => void;
};

export default function QrshopCartPanel(props: Props) {
  const { lines, buyerName, buyerPhone, paymentMethod, agreed, submitting, error } = props;
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const canSubmit = Boolean(lines.length && buyerName.trim() && buyerPhone.trim() && agreed && !submitting);

  return (
    <section aria-label="주문 정보" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-h-[72dvh] w-full max-w-[430px] overflow-y-auto bg-white px-4 pt-[13px] shadow-[0_0_5px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
      {lines.length > 0 ? (
        <ul className="mb-[10px] space-y-2">
          {lines.map((line) => (
            <li key={line.productId} className="rounded-[4px] bg-[#f2f4f6] px-[14px] py-[11px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="typo-body-xsmall-bold truncate text-neutral-12">{line.productName}</p><p className="typo-body-xxsmall truncate text-neutral-7">{line.option ?? '단일 옵션'}</p></div>
                <button type="button" className="h-5 w-5 text-xl leading-none text-neutral-6" aria-label={`${line.productName} 삭제`} onClick={() => props.onRemove(line.productId)}>×</button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="typo-body-xsmall-bold text-neutral-12">{formatWon(line.unitPrice)}</span>
                <div className="flex items-center gap-[13px]">
                  <button type="button" className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-neutral-6 typo-body-small text-neutral-12 disabled:text-neutral-6" aria-label={`${line.productName} 수량 감소`} disabled={line.quantity <= 1} onClick={() => props.onQuantityChange(line.productId, line.quantity - 1)}>−</button>
                  <span className="w-3 text-center typo-body-xsmall-bold text-neutral-12">{line.quantity}</span>
                  <button type="button" className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-neutral-6 typo-body-small text-neutral-12 disabled:text-neutral-6" aria-label={`${line.productName} 수량 증가`} disabled={line.quantity >= 99} onClick={() => props.onQuantityChange(line.productId, line.quantity + 1)}>+</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {lines.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="typo-body-xxsmall text-neutral-8">주문자 이름<input value={buyerName} onChange={(event) => props.onBuyerNameChange(event.target.value)} placeholder="이름 입력" autoComplete="name" className="mt-1 h-10 w-full rounded-[4px] border border-neutral-5 bg-white px-3 typo-body-xsmall text-neutral-12 outline-none focus:border-orange-5" /></label>
          <label className="typo-body-xxsmall text-neutral-8">휴대폰 번호<input value={buyerPhone} onChange={(event) => props.onBuyerPhoneChange(event.target.value)} placeholder="010-0000-0000" inputMode="tel" autoComplete="tel" className="mt-1 h-10 w-full rounded-[4px] border border-neutral-5 bg-white px-3 typo-body-xsmall text-neutral-12 outline-none focus:border-orange-5" /></label>
          <fieldset className="col-span-2 flex items-center gap-4 typo-body-xsmall text-neutral-10"><legend className="sr-only">결제 수단</legend>
            {([['online', '온라인 결제'], ['on-site', '현장 결제']] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-1.5"><input type="radio" name="payment-method" value={value} checked={paymentMethod === value} onChange={() => props.onPaymentMethodChange(value)} className="accent-orange-5" />{label}</label>)}
          </fieldset>
        </div>
      ) : null}
      <div className="flex items-center justify-between typo-body-small-bold"><span className="text-neutral-12">결제 금액</span><span className="text-orange-6">{formatWon(total)}</span></div>
      <label className="mt-[10px] flex cursor-pointer items-center gap-[5px] typo-body-xxsmall text-neutral-7"><input type="checkbox" checked={agreed} disabled={lines.length === 0} onChange={(event) => props.onAgreementChange(event.target.checked)} className="h-[13px] w-[13px] rounded accent-orange-5" />결제 시, 쇼핑몰 이용약관 및 결제에 동의합니다.</label>
      {error ? <p role="alert" className="mt-2 typo-body-xxsmall text-danger">{error}</p> : null}
      <Button color="orange" size="s" status={canSubmit ? 'default' : 'disabled'} disabled={!canSubmit} className="mt-[14px] h-[35px] rounded-[4px]" onClick={props.onSubmit}>{submitting ? '주문 정보를 저장하는 중…' : '결제하기'}</Button>
    </section>
  );
}
