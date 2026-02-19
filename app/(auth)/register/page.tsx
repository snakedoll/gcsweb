'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import Image from 'next/image';
import { useState } from 'react';
import { NavBar } from '@/components/layout';
import { cn } from '@/lib/utils';
import { formatPhoneWithHyphen } from '@/lib/format-phone';

const PASSWORD_HINT = '8자 이상 영문, 숫자 조합';

function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export default function RegisterPage() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [emailDuplicateError, setEmailDuplicateError] = useState<string | null>(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);

  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      verificationCode: '',
    },
  });

  const passwordValue = watch('password') ?? '';
  const confirmPasswordValue = watch('confirmPassword') ?? '';
  const emailValue = watch('email') ?? '';

  const passwordInvalid = passwordValue.length > 0 && !isPasswordValid(passwordValue);
  const confirmInvalid =
    confirmPasswordValue.length > 0 &&
    (confirmPasswordValue !== passwordValue || !isPasswordValid(passwordValue));

  const handleEmailCheck = async () => {
    const email = emailValue.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailDuplicateError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setEmailDuplicateError(null);
    setVerificationError(null);
    setEmailCheckLoading(true);

    try {
      const checkRes = await fetch('/api/v1/auth/email/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json().catch(() => null);
      if (checkRes.status === 409) {
        setEmailDuplicateError(checkData?.message ?? '사용 중인 이메일입니다.');
        return;
      }

      const sendRes = await fetch('/api/v1/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' }),
      });

      if (!sendRes.ok) {
        const sendData = await sendRes.json().catch(() => null);
        setEmailDuplicateError(sendData?.message ?? '인증번호 전송에 실패했습니다.');
        return;
      }

      setVerificationSent(true);
      setVerificationSuccess(false);
      setVerificationCode('');
      setValue('verificationCode', '', { shouldValidate: true });
    } catch {
      setEmailDuplicateError('이메일 확인에 실패했습니다.');
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = emailValue.trim();
    const code = verificationCode.trim();
    if (!email || !code) return;

    setVerificationError(null);
    setVerifyLoading(true);

    try {
      const res = await fetch('/api/v1/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register', code }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVerificationError(data?.message ?? '인증번호가 올바르지 않습니다.');
        return;
      }

      setVerificationSuccess(true);
      setValue('verificationCode', code, { shouldValidate: true });
      setVerificationError(null);
    } catch {
      setVerificationError('인증번호 확인에 실패했습니다.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setEmailDuplicateError(null);

    if (!verificationSuccess) {
      setVerificationError('인증번호를 먼저 확인해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          phone: normalizePhoneDigits(data.phone),
          verificationCode: verificationCode.trim(),
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        if (result?.code === 'EMAIL_EXISTS') {
          setEmailDuplicateError(result?.message ?? '사용 중인 이메일입니다.');
        } else if (result?.code === 'INVALID_CODE' || result?.code === 'CODE_EXPIRED') {
          setVerificationError(result?.message ?? '인증번호가 올바르지 않습니다.');
          setVerificationSuccess(false);
        } else {
          setError(result?.message || result?.error || '회원가입에 실패했습니다.');
        }
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="home" />

      <div className="flex flex-col items-center gap-3 pb-7 pt-7">
        <Image src="/assets/logos/logo-gcs.svg" alt="GCS 로고" width={103} height={37} priority />
        <p className={cn('typo-body-xsmall', 'text-orange-5')}>Graphic Communication Science</p>
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[10px]">
        <div className="flex items-center border-b border-neutral-4 py-[10px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-6 w-6 items-center justify-center"
            aria-label="뒤로가기"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
          <h1 className={cn('flex-1 text-center typo-heading-small text-neutral-10')}>회원가입</h1>
          <div className="h-6 w-6" aria-hidden />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-[25px] space-y-[30px]">
          <input type="hidden" {...register('verificationCode')} />

          {error && <div className="rounded-lg bg-danger/10 p-3 typo-body-xsmall text-danger">{error}</div>}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="typo-body-small-bold text-neutral-10">이름</label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="mt-1 h-12 w-full rounded-lg border border-neutral-5 bg-neutral-2 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                placeholder="홍길동"
              />
              {errors.name && <p className="mt-1 typo-body-xsmall text-danger">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="typo-body-small-bold text-neutral-10">전화번호</label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-1234-5678"
                className="mt-1 h-12 w-full rounded-lg border border-neutral-5 bg-neutral-2 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                {...register('phone', {
                  onChange: (e) => {
                    const formatted = formatPhoneWithHyphen(e.target.value);
                    if (formatted !== e.target.value) setValue('phone', formatted);
                  },
                })}
              />
              {errors.phone && <p className="mt-1 typo-body-xsmall text-danger">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="h-px w-full bg-neutral-4" />

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="typo-body-small-bold text-neutral-10">아이디 (이메일)</label>
              <div className="mt-1 flex gap-[10px]">
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    onChange: () => {
                      setEmailDuplicateError(null);
                      setVerificationSent(false);
                      setVerificationSuccess(false);
                      setVerificationError(null);
                      setVerificationCode('');
                      setValue('verificationCode', '', { shouldValidate: true });
                    },
                  })}
                  className="h-12 flex-1 rounded-lg border border-neutral-5 bg-neutral-2 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                  placeholder="example@gmail.com"
                />
                <button
                  type="button"
                  onClick={handleEmailCheck}
                  disabled={emailCheckLoading}
                  className="h-12 shrink-0 rounded-lg bg-neutral-10 px-4 typo-body-small-bold text-neutral-2 disabled:opacity-50"
                >
                  {emailCheckLoading ? '전송 중' : '전송'}
                </button>
              </div>
              {verificationSent && <p className="mt-1 typo-body-xsmall text-orange-5">인증번호를 전송했습니다.</p>}
              {emailDuplicateError && <p className="mt-1 typo-body-xsmall text-danger">{emailDuplicateError}</p>}
              {errors.email && !emailDuplicateError && !verificationSent && (
                <p className="mt-1 typo-body-xsmall text-danger">{errors.email.message}</p>
              )}
            </div>

            {verificationSent && (
              <div>
                <label htmlFor="verificationCode" className="typo-body-small-bold text-neutral-10">인증번호</label>
                <div className="mt-1 flex gap-[10px]">
                  <div
                    className={cn(
                      'flex h-12 flex-1 items-center rounded-lg border bg-neutral-2 px-3',
                      verificationError ? 'border-danger' : 'border-neutral-5'
                    )}
                  >
                    <input
                      id="verificationCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        const nextCode = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(nextCode);
                        setValue('verificationCode', nextCode, { shouldValidate: true });
                        setVerificationError(null);
                      }}
                      className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none"
                      placeholder="인증번호를 입력해주세요."
                    />
                    {verificationError && <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />}
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyLoading || verificationCode.length === 0}
                    className="h-12 shrink-0 rounded-lg bg-neutral-10 px-4 typo-body-small-bold text-neutral-2 disabled:bg-neutral-5 disabled:text-neutral-7"
                  >
                    {verifyLoading ? '확인 중' : '확인'}
                  </button>
                </div>
                {verificationError && <p className="mt-1 typo-body-xsmall text-danger">{verificationError}</p>}
                {verificationSuccess && <p className="mt-1 typo-body-xsmall text-orange-5">인증에 성공했습니다.</p>}
              </div>
            )}

            <div>
              <label htmlFor="password" className="typo-body-small-bold text-neutral-10">비밀번호</label>
              <div
                className={cn(
                  'mt-1 flex h-12 items-center rounded-lg border bg-neutral-2 px-3',
                  passwordInvalid ? 'border-danger' : 'border-neutral-5'
                )}
              >
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none"
                  placeholder="비밀번호를 입력해주세요."
                />
                {passwordInvalid && <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />}
              </div>
              <p className={cn('mt-1 typo-body-xsmall', passwordInvalid ? 'text-danger' : 'text-neutral-7')}>
                {PASSWORD_HINT}
              </p>
              {errors.password && <p className="mt-1 typo-body-xsmall text-danger">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="typo-body-small-bold text-neutral-10">비밀번호 확인</label>
              <div
                className={cn(
                  'mt-1 flex h-12 items-center rounded-lg border bg-neutral-2 px-3',
                  confirmInvalid ? 'border-danger' : 'border-neutral-5'
                )}
              >
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none"
                  placeholder="비밀번호를 입력해주세요."
                />
                {confirmInvalid && <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />}
              </div>
              <p className={cn('mt-1 typo-body-xsmall', confirmInvalid ? 'text-danger' : 'text-neutral-7')}>
                {PASSWORD_HINT}
              </p>
              {errors.confirmPassword && (
                <p className="mt-1 typo-body-xsmall text-danger">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !verificationSuccess}
            className="h-[55px] w-full rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2 disabled:bg-orange-3"
          >
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  );
}
