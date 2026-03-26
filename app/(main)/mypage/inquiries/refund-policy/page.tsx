'use client';

import { NavBar } from '@/components/layout';

export default function MypageRefundPolicyPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="문의하기" />

      <main className="mx-auto w-full max-w-[375px] flex-1 px-4 pb-8 pt-[23px]">
        <section className="w-full rounded-lg bg-neutral-1 p-4 text-neutral-9">
          <h1 className="typo-heading-small mb-4 text-neutral-9">환불 정책 안내</h1>

          <div className="space-y-4">
            <section>
              <h2 className="typo-body-small-bold mb-[5px] text-neutral-9">1. 환불 접수 안내</h2>
              <ul className="typo-body-xsmall list-disc space-y-1 pl-5 text-neutral-9">
                <li>
                  본 사이트는 별도의 자동 환불 기능이 제공되지 않으며, 모든 환불 요청은 고객센터 이메일을
                  통해 접수됩니다.
                </li>
                <li>환불 요청 시, 주문 정보 및 사유를 함께 기재해주시기 바랍니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="typo-body-small-bold mb-[5px] text-neutral-9">2. 환불 가능 기준</h2>
              <p className="typo-body-xsmall text-neutral-9">다음의 경우에 한하여 환불이 가능합니다.</p>
              <ul className="typo-body-xsmall list-disc space-y-1 pl-5 text-neutral-9">
                <li>상품의 하자 또는 불량이 확인된 경우</li>
                <li>주문한 상품과 다른 상품이 배송된 경우 (오배송)</li>
                <li>상품이 파손된 상태로 배송된 경우</li>
              </ul>
              <p className="typo-body-xsmall text-neutral-9">
                위 사유에 해당할 경우, 수령 후 7일 이내 고객센터로 문의해주시기 바랍니다.
              </p>
            </section>

            <section>
              <h2 className="typo-body-small-bold mb-[5px] text-neutral-9">3. 환불 불가 사항</h2>
              <p className="typo-body-xsmall text-neutral-9">다음의 경우에는 환불이 제한될 수 있습니다.</p>
              <ul className="typo-body-xsmall list-disc space-y-1 pl-5 text-neutral-9">
                <li>단순 변심에 의한 환불</li>
                <li>사용 또는 훼손으로 인해 상품 가치가 감소한 경우</li>
                <li>수령 후 7일이 경과한 경우</li>
                <li>고객의 부주의로 인한 상품 손상</li>
              </ul>
            </section>

            <section>
              <h2 className="typo-body-small-bold mb-[5px] text-neutral-9">4. 환불 처리 절차</h2>
              <ul className="typo-body-xsmall list-disc space-y-1 pl-5 text-neutral-9">
                <li>환불 요청 접수 → 내용 확인 → 승인 여부 안내 → 환불 진행</li>
                <li>환불 승인 시, 결제 수단에 따라 영업일 기준 3~7일 내 환불 처리됩니다.</li>
              </ul>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
