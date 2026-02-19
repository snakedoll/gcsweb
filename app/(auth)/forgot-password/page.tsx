'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { NavBar } from '@/components/layout';
import { LoginSupportLinks, LogoSubtext, Subtitle, TextField } from '@/components/ui';
import { cn } from '@/lib/utils';

const VERIFY_EXPIRE_SEC = 5 * 60; // 5분

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(VERIFY_EXPIRE_SEC);
  const [focusedField, setFocusedField] = useState<'email' | 'code' | null>(null);

  const hasEmail = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasCode = verificationCode.trim().length >= 6;
  const canSubmit = hasEmail && hasCode;

  const getFieldState = (field: 'email' | 'code', hasValue: boolean) => {
    if (focusedField === field) return 'focus' as const;
    if (hasValue) return 'filled' as const;
    return 'default' as const;
  };

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSendError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    setSendError(null);
    setVerifyError(null);
    setSendLoading(true);
    try {
      const res = await fetch('/api/v1/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, type: 'reset-password' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSendError(data?.message ?? '인증번호 전송에 실패했습니다.');
        return;
      }
      setVerificationSent(true);
      setVerificationSuccess(false);
      setVerificationCode('');
      setRemainingSec(VERIFY_EXPIRE_SEC);
    } catch {
      setSendError('전송에 실패했습니다.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleFindPassword = async () => {
    const trimmedEmail = email.trim();
    const code = verificationCode.trim();
    if (!trimmedEmail || !code) return;
    setVerifyError(null);
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/v1/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code, type: 'reset-password' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVerifyError(data?.message ?? '인증번호가 올바르지 않습니다.');
        return;
      }
      setVerificationSuccess(true);
      setVerifyError(null);
      const resetToken = data?.data?.resetToken;
      if (resetToken) {
        setTimeout(() => router.push(`/reset-password?token=${resetToken}`), 800);
      } else {
        setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(trimmedEmail)}`), 800);
      }
    } catch {
      setVerifyError('인증 확인에 실패했습니다.');
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    if (!verificationSent || remainingSec <= 0) return;
    const t = setInterval(() => setRemainingSec((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [verificationSent, remainingSec]);

  const timeText = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="home" />

      <div className="flex flex-col items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <div className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-9">
            <Subtitle title="비밀번호 찾기" className="w-full" />

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className={cn(
                    'typo-body-small-bold',
                    sendError ? 'text-danger' : 'text-neutral-10'
                  )}
                >
                  아이디 (이메일)
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex flex-1 items-center">
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSendError(null);
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="example@gmail.com"
                      disabled={verificationSent}
                      className={cn(
                        'h-12 w-full rounded-lg border bg-neutral-1 px-3 pr-10 typo-body-small text-neutral-10 outline-none placeholder:text-neutral-7',
                        sendError
                          ? 'border-danger'
                          : getFieldState('email', hasEmail) === 'focus'
                            ? 'border-orange-5'
                            : 'border-neutral-5',
                        verificationSent && !sendError && 'border-neutral-6 bg-neutral-3'
                      )}
                    />
                    {sendError && (
                      <div className="absolute right-3">
                        <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendLoading || !hasEmail || verificationSent}
                    className="h-12 shrink-0 rounded-lg bg-neutral-8 px-4 typo-body-xsmall-bold text-neutral-1 disabled:bg-neutral-5 disabled:text-neutral-7"
                  >
                    {sendLoading ? '전송 중' : '전송'}
                  </button>
                </div>
                {sendError && <p className="mt-1 typo-body-xsmall text-danger">{sendError}</p>}
                {verificationSent && !sendError && (
                  <p className="mt-1 typo-body-xsmall text-orange-5">인증번호가 전송되었습니다.</p>
                )}
              </div>

              {verificationSent && (
                <div>
                  <TextField
                    id="forgot-code"
                    label="인증번호"
                    placeholder="인증번호를 입력해주세요."
                    state={verifyError ? 'error' : 'time'}
                    timeText={timeText}
                    inputProps={{
                      value: verificationCode,
                      onChange: (e) => {
                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setVerifyError(null);
                      },
                      onFocus: () => setFocusedField('code'),
                      onBlur: () => setFocusedField(null),
                      inputMode: 'numeric',
                    }}
                  />
                  {verifyError && (
                    <p className="mt-1 typo-body-xsmall text-danger">{verifyError}</p>
                  )}
                  {verificationSuccess && (
                    <p className="mt-1 typo-body-xsmall text-orange-5">인증번호가 확인되었습니다.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="flex w-full flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleFindPassword}
                disabled={!canSubmit || verifyLoading || remainingSec <= 0}
                className={cn(
                  'h-[55px] w-full rounded-lg text-neutral-2 typo-body-small-bold transition-colors',
                  canSubmit && remainingSec > 0 ? 'bg-orange-5' : 'bg-orange-3'
                )}
              >
                {verifyLoading ? '확인 중...' : '비밀번호 찾기'}
              </button>

              <div className={cn('flex items-center justify-center gap-2 typo-body-xsmall')}>
                <p className="text-neutral-8">아직 계정이 없으신가요?</p>
                <Link href="/register" className={cn('typo-body-xsmall-bold', 'text-orange-4')}>
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
