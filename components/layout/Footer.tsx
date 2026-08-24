'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function Footer() {
  const { session, profile, isAuthenticated } = useUser();
  const showAdminButton =
    isAuthenticated &&
    (session?.user?.role === 'admin' || profile?.role === 'admin');

  return (
    <footer className="w-full bg-neutral-3 text-left">
      <div className="mx-auto max-w-[375px] px-[21px] pt-[21px] pb-4">
        <section className="mb-[45px]">
          <h2 className="mb-2 text-[17px] font-bold leading-[1.5] text-neutral-10">고객지원</h2>
          <ul className="space-y-3 text-[13px] leading-[1.5] tracking-[-0.26px] text-neutral-7">
            <li>전화 : 010-5238-0236</li>
            <li>이메일 : gcsweb01234@gmail.com</li>
            <li>주소 : 서울특별시 강북구 솔샘로 174 136동 304호</li>
          </ul>
        </section>

        <section className="mb-[45px]">
          <h2 className="mb-2 text-[17px] font-bold leading-[1.5] text-neutral-10">사업자 정보</h2>
          <ul className="space-y-3 text-[13px] leading-[1.5] tracking-[-0.26px] text-neutral-7">
            <li className="flex gap-10">
              <span>대표 : 안성은</span>
              <span>회사명 : 안북스 스튜디오</span>
            </li>
            <li>사업자등록번호 : 693-01-03164</li>
            <li>통신판매업신고번호 : 제 2025-서울강북-0961호</li>
          </ul>
        </section>

        <div className="flex flex-col items-start gap-2">
          <Link href="/" className="inline-block">
            <Image src="/assets/logos/logo-gcs.svg" alt="GCS" width={59} height={21} />
          </Link>

          <p className="text-[11px] leading-[1.5] text-neutral-10">© 2025 GCS:Web. All rights reserved.</p>

          <Link
            href="/terms/terms-of-service"
            className="text-[11px] leading-[1.5] text-neutral-10 underline decoration-[1px] underline-offset-[2px]"
          >
            이용약관
          </Link>

          <Link
            href="/terms/privacy-policy"
            className="text-[11px] leading-[1.5] text-neutral-10 underline decoration-[1px] underline-offset-[2px]"
          >
            개인정보처리방침
          </Link>

          {showAdminButton ? (
            <div className="mt-2 flex items-start gap-2">
              <Link
                href="/admin"
                className="inline-flex h-[22px] w-20 items-center justify-center rounded-[8px] bg-orange-5 typo-body-xxsmall-bold text-neutral-2 transition-colors hover:bg-orange-6"
              >
                관리자
              </Link>
              <Link
                href="/admin/onsite"
                className="inline-flex h-[22px] w-20 items-center justify-center rounded-[8px] bg-orange-5 typo-body-xxsmall-bold text-neutral-2 transition-colors hover:bg-orange-6"
              >
                박람회
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
