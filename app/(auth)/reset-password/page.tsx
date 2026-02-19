'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { NavBar } from '@/components/layout';
import { LoginSupportLinks, LogoSubtext, Subtitle } from '@/components/ui';
import { cn } from '@/lib/utils';

const PASSWORD_HINT = '8자 이상 영문, 숫자 조합';

function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordInvalid = password.length > 0 && !isPasswordValid(password);
  const passwordValid = password.length > 0 && isPasswordValid(password);
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const confirmInvalid =
    confirmPassword.length > 0 &&
    (confirmPassword !== password || !isPasswordValid(password));
  const confirmValid = confirmPassword.length > 0 && password === confirmPassword && isPasswordValid(password);
  const canSubmit =
    isPasswordValid(password) &&
    password === confirmPassword &&
    !!token &&
    !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? '비밀번호 변경에 실패했습니다.');
        return;
      }
      router.push('/login?reset=success');
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-[375px]">
        <NavBar variant="home" />
        <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
          <p className="typo-body-small text-neutral-10 text-center">
            유효하지 않은 링크입니다. 비밀번호 찾기를 다시 시도해주세요.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 block text-center typo-body-small-bold text-orange-5"
          >
            비밀번호 찾기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="home" />

      <div className="flex flex-col items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <Subtitle title="새 비밀번호 설정" className="w-full mb-6" onBack={() => router.push('/forgot-password')} />

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 typo-body-xsmall text-danger">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className={cn(
                'typo-body-xsmall-bold',
                passwordInvalid ? 'text-danger' : 'text-neutral-10'
              )}
            >
              새 비밀번호
            </label>
            <div
              className={cn(
                'mt-1 flex h-12 items-center rounded-lg border bg-neutral-1 px-3',
                passwordInvalid ? 'border-danger' : passwordValid ? 'border-neutral-6' : 'border-neutral-5'
              )}
            >
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="새 비밀번호를 입력해주세요."
                className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none pr-10"
              />
              {passwordInvalid && (
                <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} className="shrink-0" />
              )}
              {passwordValid && !passwordInvalid && (
                <Image src="/assets/icons/icon-check-success.svg" alt="" width={20} height={20} className="shrink-0" />
              )}
            </div>
            <p
              className={cn(
                'mt-1 typo-body-xsmall',
                passwordInvalid ? 'text-danger' : 'text-neutral-7'
              )}
            >
              {PASSWORD_HINT}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className={cn(
                'typo-body-xsmall-bold',
                confirmInvalid ? 'text-danger' : 'text-neutral-10'
              )}
            >
              비밀번호 확인
            </label>
            <div
              className={cn(
                'mt-1 flex h-12 items-center rounded-lg border bg-neutral-1 px-3',
                confirmInvalid ? 'border-danger' : confirmValid ? 'border-neutral-6' : 'border-neutral-5'
              )}
            >
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 입력해주세요."
                className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none pr-10"
              />
              {confirmInvalid && (
                <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} className="shrink-0" />
              )}
              {confirmValid && (
                <Image src="/assets/icons/icon-check-success.svg" alt="" width={20} height={20} className="shrink-0" />
              )}
            </div>
            {(confirmInvalid || confirmPassword.length === 0) && (
              <p
                className={cn(
                  'mt-1 typo-body-xsmall',
                  confirmInvalid ? 'text-danger' : 'text-neutral-7'
                )}
              >
                {confirmMismatch ? '비밀번호가 일치하지 않습니다.' : PASSWORD_HINT}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'mt-6 h-[55px] w-full rounded-lg typo-body-small-bold text-neutral-2',
              canSubmit ? 'bg-orange-5' : 'bg-orange-3'
            )}
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 typo-body-xsmall">
          <div className="flex items-center justify-center gap-2">
            <span className="text-neutral-8">아직 계정이 없으신가요?</span>
            <Link href="/register" className="typo-body-xsmall-bold text-orange-4">
              회원가입
            </Link>
          </div>
          <LoginSupportLinks variant="forgot_id" />
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
