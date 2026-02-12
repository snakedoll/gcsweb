import Link from 'next/link';

export default function LoginSupportLinks() {
  return (
    <div className="flex items-center justify-center gap-[10px] p-[2px] text-[13px] tracking-[-0.02em] text-[#999694]">
      <Link href="/forgot-id" className="hover:underline">
        아이디 찾기
      </Link>
      <span className="text-[#dddcdb]">|</span>
      <Link href="/forgot-password" className="hover:underline">
        비밀번호 찾기
      </Link>
    </div>
  );
}
