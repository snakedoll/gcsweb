import Link from 'next/link';
import { typography } from '@/lib/styles/typography';

export default function LoginSupportLinks() {
  return (
    <div className={`flex items-center justify-center gap-[10px] p-[2px] text-neutral-7 ${typography.bodyXSmall}`}>
      <Link href="/forgot-id" className="hover:underline">
        아이디 찾기
      </Link>
      <span className="text-neutral-5">|</span>
      <Link href="/forgot-password" className="hover:underline">
        비밀번호 찾기
      </Link>
    </div>
  );
}
