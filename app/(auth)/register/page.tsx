'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NavBar } from '@/components/layout';
import { CheckboxButton, LoginSupportLinks, LogoSubtext } from '@/components/ui';
import { cn } from '@/lib/utils';

type AgreementKey = 'age' | 'terms' | 'privacy';

const REQUIRED_AGREEMENTS: AgreementKey[] = ['age', 'terms', 'privacy'];

export default function RegisterPage() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>({
    age: false,
    terms: false,
    privacy: false,
  });

  const isAllChecked = useMemo(
    () => REQUIRED_AGREEMENTS.every((key) => agreements[key]),
    [agreements]
  );

  const setAgreement = (key: AgreementKey, checked: boolean) => {
    setAgreements((prev) => ({ ...prev, [key]: checked }));
  };

  const handleToggleAll = (checked: boolean) => {
    setAgreements({
      age: checked,
      terms: checked,
      privacy: checked,
    });
  };

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="back" />

      <div className="flex items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <div className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-[39px]">
            <h1 className="text-center text-neutral-10 typo-heading-small">회원 가입</h1>

            <div className="space-y-[18px]">
              <div className="px-[10px]">
                <CheckboxButton
                  checked={isAllChecked}
                  onChange={handleToggleAll}
                  label="전체 동의"
                />
              </div>

              <div className="border-t border-neutral-4" />

              <div className="space-y-4">
                <div className="px-[10px]">
                  <CheckboxButton
                    checked={agreements.age}
                    onChange={(checked) => setAgreement('age', checked)}
                    label="[필수] 만 14세 이상입니다."
                  />
                </div>

                <div className="flex items-center justify-between pl-[10px]">
                  <CheckboxButton
                    checked={agreements.terms}
                    onChange={(checked) => setAgreement('terms', checked)}
                    label="[필수] 홈페이지 이용약관 동의"
                  />
                  <Link
                    href="/register/terms/terms-of-service"
                    className="inline-flex h-6 w-6 items-center justify-center"
                    aria-label="홈페이지 이용약관 보기"
                  >
                    <Image src="/assets/icons/icon-right.svg" alt="" width={24} height={24} />
                  </Link>
                </div>

                <div className="flex items-center justify-between pl-[10px]">
                  <CheckboxButton
                    checked={agreements.privacy}
                    onChange={(checked) => setAgreement('privacy', checked)}
                    label="[필수] 개인정보 수집·이용 동의"
                  />
                  <Link
                    href="/register/terms/privacy-policy"
                    className="inline-flex h-6 w-6 items-center justify-center"
                    aria-label="개인정보 수집 이용 보기"
                  >
                    <Image src="/assets/icons/icon-right.svg" alt="" width={24} height={24} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="flex w-full flex-col items-center gap-3">
              <button
                type="button"
                disabled={!isAllChecked}
                onClick={() => {
                  if (!isAllChecked) return;
                  router.push('/register/member-info');
                }}
                className={cn(
                  'h-[55px] w-full rounded-lg text-neutral-2 transition-colors typo-body-small-bold',
                  isAllChecked ? 'bg-orange-5' : 'bg-orange-3'
                )}
              >
                다음
              </button>

              <div className={cn('flex items-center justify-center gap-2 typo-body-xsmall')}>
                <p className="text-neutral-8">아직 계정이 없으신가요?</p>
                <Link href="/register" className={cn('typo-body-xsmall-bold', 'text-orange-4')}>
                  회원가입
                </Link>
              </div>
            </div>

            <LoginSupportLinks />
          </div>
        </div>
      </div>
    </div>
  );
}
