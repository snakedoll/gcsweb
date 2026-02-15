import Image from 'next/image';
import Link from 'next/link';

interface FooterProps {
  showAdminButton?: boolean;
}

export default function Footer({ showAdminButton = false }: FooterProps) {
  return (
    <footer className="w-full bg-[#f6f6f5] text-left">
      <div className="mx-auto max-w-[375px] px-4 py-6">
        {/* 고객지원 */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-[#443e3c]">고객지원</h2>
          <ul className="space-y-1 text-[13px] text-[#666]">
            <li>전화: 010-5238-0236</li>
            <li>이메일 : gcsweb01234@gmail.com</li>
            <li>주소 : 서울특별시 강북구 솔샘로 174 136동 304호</li>
          </ul>
        </section>

        {/* 사업자 정보 */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-[#443e3c]">사업자 정보</h2>
          <ul className="space-y-1 text-[13px] text-[#666]">
            <li>대표 : 안성은</li>
            <li>회사명 : 안북스 스튜디오</li>
            <li>사업자등록번호 : 693-01-03164</li>
            <li>통신판매업신고번호 : 제 2025-서울강북-0961호</li>
          </ul>
        </section>

        {/* 로고, 저작권, 약관, admin 버튼 */}
        <div className="flex flex-col gap-3">
          <Link href="/" className="inline-block">
            <Image src="/assets/logos/logo-gcs.svg" alt="GCS" width={53} height={19} />
          </Link>
          <p className="text-xs text-[#999694]">© 2025 GCS:Web. All rights reserved.</p>
          <div className="flex flex-col gap-1 text-xs text-[#666]">
            <Link href="/terms/art" className="underline hover:text-[#443e3c]">
              이용약관
            </Link>
            <Link href="/terms/privacy" className="underline hover:text-[#443e3c]">
              개인정보처리방침
            </Link>
          </div>
          {showAdminButton && (
            <Link
              href="/admin"
              className="mt-2 inline-block w-fit rounded-lg bg-[#E8754D] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d66a42]"
            >
              admin
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
