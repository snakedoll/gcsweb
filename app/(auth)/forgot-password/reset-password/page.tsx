'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import { Button, LoginSupportLinks, LogoSubtext, Subtitle, TextField } from '@/components/ui';

const PASSWORD_HINT = '8자 이상 영문, 숫자 조합';

type FocusField = 'password' | 'confirmPassword' | null;

function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /^[A-Za-z\d]+$/.test(password);
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordHasValue = password.length > 0;
  const passwordValid = passwordHasValue && isPasswordValid(password);
  const passwordInvalid = passwordHasValue && !isPasswordValid(password);

  const confirmHasValue = confirmPassword.length > 0;
  const confirmMismatch = confirmHasValue && confirmPassword !== password;
  const confirmValid = confirmHasValue && confirmPassword === password && isPasswordValid(password);
  const confirmInvalid = confirmMismatch;

  const canSubmit = Boolean(token) && passwordValid && confirmValid && !loading;

  const confirmPasswordCaption = confirmMismatch ? '비밀번호가 일치하지 않습니다.' : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;

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
        console.error('Reset password failed', data);
        return;
      }

      router.push('/login?reset=success');
    } catch (error) {
      console.error('Reset password request failed', error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-[375px]">
        <NavBar variant="home" />
        <div className="rounded-t-[12px] bg-neutral-1 px-4 pb-[38px] pt-[38px]">
          <p className="text-center typo-body-small text-neutral-10">
            유효하지 않은 링크입니다. 비밀번호 찾기를 다시 시도해주세요.
          </p>
          <Link href="/forgot-password" className="mt-4 block text-center typo-body-small-bold text-orange-5">
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

      <div className="rounded-t-[12px] bg-neutral-1 px-4 pb-[38px] pt-[38px]">
        <div className="flex min-h-[533px] flex-col justify-between">
          <div className="space-y-[25px]">
            <Subtitle title="새 비밀번호 설정" className="w-full" onBack={() => router.push('/forgot-password')} />

            <form id="reset-password-form" onSubmit={onSubmit} className="space-y-4">
              <TextField
                id="new-password"
                type="password"
                label="새 비밀번호"
                placeholder="새 비밀번호를 입력해주세요."
                state={
                  passwordInvalid ? 'error' : focusedField === 'password' ? 'focus' : passwordValid ? 'success' : 'default'
                }
                inputProps={{
                  value: password,
                  autoComplete: 'new-password',
                  onChange: (e) => setPassword(e.target.value),
                  onFocus: () => setFocusedField('password'),
                  onBlur: () => setFocusedField(null),
                }}
                caption={passwordInvalid ? PASSWORD_HINT : undefined}
                captionClassName={passwordInvalid ? 'text-danger' : undefined}
              />

              <TextField
                id="confirm-password"
                type="password"
                label="비밀번호 확인"
                placeholder="새 비밀번호를 입력해주세요."
                state={
                  confirmInvalid
                    ? 'error'
                    : focusedField === 'confirmPassword'
                      ? 'focus'
                      : confirmValid
                        ? 'success'
                        : 'default'
                }
                inputProps={{
                  value: confirmPassword,
                  autoComplete: 'new-password',
                  onChange: (e) => setConfirmPassword(e.target.value),
                  onFocus: () => setFocusedField('confirmPassword'),
                  onBlur: () => setFocusedField(null),
                }}
                caption={confirmPasswordCaption}
                captionClassName={confirmInvalid ? 'text-danger' : undefined}
              />
            </form>
          </div>

          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                type="submit"
                form="reset-password-form"
                size="l"
                color="orange"
                status={canSubmit ? 'default' : 'disabled'}
                disabled={!canSubmit}
                className="h-[55px] py-0"
              >
                {loading ? '처리 중' : '이메일로 로그인'}
              </Button>

              <div className="flex items-center justify-center gap-2 typo-body-xsmall">
                <span className="text-neutral-8">아직 계정이 없으신가요?</span>
                <Link href="/register" className="typo-body-xsmall-bold text-orange-4">
                  회원가입
                </Link>
              </div>
            </div>

            <LoginSupportLinks variant="forgot_id" />
          </div>
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
