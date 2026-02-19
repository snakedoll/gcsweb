import Link from 'next/link';

type LoginSupportLinksVariant = 'default' | 'forgot_pw' | 'forgot_id';

interface LoginSupportLinksProps {
  variant?: LoginSupportLinksVariant;
  className?: string;
}

export default function LoginSupportLinks({ variant = 'default', className }: LoginSupportLinksProps) {
  if (variant === 'forgot_pw') {
    return (
      <div className={`typo-body-xsmall flex items-center justify-center p-[2px] text-neutral-7 ${className ?? ''}`.trim()}>
        <Link href="/forgot-password" className="hover:underline">
          비밀번호 찾기
        </Link>
      </div>
    );
  }

  if (variant === 'forgot_id') {
    return (
      <div className={`typo-body-xsmall flex items-center justify-center p-[2px] text-neutral-7 ${className ?? ''}`.trim()}>
        <Link href="/forgot-id" className="hover:underline">
          아이디 찾기
        </Link>
      </div>
    );
  }

  return (
    <div className={`typo-body-xsmall flex items-center justify-center gap-[10px] p-[2px] text-neutral-7 ${className ?? ''}`.trim()}>
      <Link href="/forgot-id" className="hover:underline">
        아이디 찾기
      </Link>
      <span className="h-[15px] w-px bg-neutral-7" aria-hidden />
      <Link href="/forgot-password" className="hover:underline">
        비밀번호 찾기
      </Link>
    </div>
  );
}
