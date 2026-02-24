import Image from 'next/image';
import Link from 'next/link';

interface FooterProps {
  showAdminButton?: boolean;
}

export default function Footer({ showAdminButton = false }: FooterProps) {
  return (
    <footer className="w-full bg-neutral-3 text-left">
      <div className="mx-auto max-w-[375px] px-4 py-6">
        <section className="mb-6">
          <h2 className="typo-body-medium-bold mb-2 text-neutral-10">고객지원</h2>
          <ul className="typo-body-xsmall space-y-2 text-neutral-7">
            <li>전화 : 010-5238-0236</li>
            <li>이메일 : gcsweb01234@gmail.com</li>
            <li>주소 : 서울특별시 강북구 솔샘로 174 136동 304호</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="typo-body-medium-bold mb-2 text-neutral-10">사업자 정보</h2>
          <ul className="typo-body-xsmall space-y-2 text-neutral-7">
            <li className="flex gap-8">
              <span>대표 : 안성은</span>
              <span>회사명 : 안북스 스튜디오</span>
            </li>
            <li>사업자등록번호 : 693-01-03164</li>
            <li>통신판매업신고번호 : 제 2025-서울강북-0961호</li>
          </ul>
        </section>

        <div className="flex flex-col gap-2">
          <Link href="/" className="inline-block">
            <Image src="/assets/logos/logo-gcs.svg" alt="GCS" width={59} height={21} />
          </Link>
          <p className="text-[8px] leading-[1.5] text-neutral-10">© 2025 GCS:Web. All rights reserved.</p>
          <Link href="/terms/art" className="text-[8px] leading-[1.5] text-neutral-10 underline">
            이용약관
          </Link>
          <Link href="/terms/privacy" className="text-[8px] leading-[1.5] text-neutral-10 underline">
            개인정보처리방침
          </Link>
          {showAdminButton ? (
            <Link
              href="/admin"
              className="mt-2 flex h-[32px] w-1/5 min-w-0 items-center justify-center rounded-lg bg-orange-5 text-[15px] font-bold leading-[1.5] text-neutral-2 transition-colors hover:bg-orange-6"
            >
              admin
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
