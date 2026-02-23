'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import Image from 'next/image';
import { useState } from 'react';
import { NavBar } from '@/components/layout';
import { LogoSubtext, Subtitle } from '@/components/ui';
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
  const nameValue = watch('name') ?? '';
  const phoneValue = watch('phone') ?? '';

  const emailTrimmed = emailValue.trim();
  const phoneDigits = normalizePhoneDigits(phoneValue);
  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);

  const passwordValid = passwordValue.length > 0 && isPasswordValid(passwordValue);
  const passwordInvalid = passwordValue.length > 0 && !isPasswordValid(passwordValue);

  const confirmMismatch = confirmPasswordValue.length > 0 && confirmPasswordValue !== passwordValue;
  const confirmInvalid =
    confirmPasswordValue.length > 0 &&
    (confirmPasswordValue !== passwordValue || !isPasswordValid(passwordValue));
  const confirmValid =
    confirmPasswordValue.length > 0 &&
    confirmPasswordValue === passwordValue &&
    isPasswordValid(passwordValue);

  const emailHasError = Boolean(emailDuplicateError);
  const verifyCodeHasError = Boolean(verificationError);

  const canSendEmail = emailFormatValid && !emailCheckLoading && !emailHasError;
  const canVerifyCode = verificationCode.length === 6 && !verifyLoading && !verifyCodeHasError;
  const canRegister =
    !isSubmitting &&
    verificationSuccess &&
    nameValue.trim().length >= 2 &&
    phoneDigits.length >= 9 &&
    phoneDigits.length <= 20 &&
    emailFormatValid &&
    passwordValid &&
    confirmValid;

  const handleEmailCheck = async () => {
    const email = emailTrimmed;
    if (!email || !emailFormatValid) {
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
    const email = emailTrimmed;
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
        setVerificationSuccess(false);
        setVerificationError(data?.message ?? '인증번호가 올바르지 않습니다.');
        return;
      }

      setVerificationSuccess(true);
      setValue('verificationCode', code, { shouldValidate: true });
      setVerificationError(null);
    } catch {
      setVerificationSuccess(false);
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

      <div className="flex flex-col items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-[38px] pt-[38px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-[833px] flex-col">
          <input type="hidden" {...register('verificationCode')} />

          <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-[25px]">
              <Subtitle title="회원가입" className="w-full" />

              {error ? <div className="rounded-lg bg-danger/10 p-3 typo-body-xsmall text-danger">{error}</div> : null}

              <div className="space-y-[30px]">
                <div className="space-y-[6px]">
                  <p className="typo-body-small-bold text-neutral-8">회원정보</p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="typo-body-small-bold text-neutral-10">
                        이름
                      </label>
                      <input
                        id="name"
                        type="text"
                        {...register('name')}
                        className="mt-1 h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-2 px-3 typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7 focus:border-orange-5"
                        placeholder="홍길동"
                      />
                      {errors.name ? <p className="mt-1 typo-body-xsmall text-danger">{errors.name.message}</p> : null}
                    </div>

                    <div>
                      <label htmlFor="phone" className="typo-body-small-bold text-neutral-10">
                        전화번호
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="010-1234-5678"
                        className="mt-1 h-[45px] w-full rounded-lg border border-neutral-6 bg-neutral-2 px-3 typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7 focus:border-orange-5"
                        {...register('phone', {
                          onChange: (e) => {
                            const formatted = formatPhoneWithHyphen(e.target.value);
                            if (formatted !== e.target.value) setValue('phone', formatted);
                          },
                        })}
                      />
                      {errors.phone ? <p className="mt-1 typo-body-xsmall text-danger">{errors.phone.message}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-neutral-4" />

                <div className="space-y-[6px]">
                  <p className="typo-body-small-bold text-neutral-8">ID/PW</p>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className={cn('typo-body-small-bold', emailHasError ? 'text-danger' : 'text-neutral-10')}
                      >
                        아이디 (이메일)
                      </label>
                      <div className="relative mt-1 flex items-start gap-[10px]">
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
                          className={cn(
                            'h-[45px] flex-1 rounded-lg border bg-neutral-2 px-3 pr-10 typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7 focus:border-orange-5',
                            emailHasError ? 'border-danger' : 'border-neutral-6'
                          )}
                          placeholder="example@gmail.com"
                        />
                        {emailHasError ? (
                          <div className="pointer-events-none absolute right-[92px] top-[12px]">
                            <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleEmailCheck}
                          disabled={!canSendEmail}
                          className={cn(
                            'mt-[28px] h-10 w-[70px] shrink-0 rounded-lg typo-body-small-bold text-neutral-2',
                            canSendEmail ? 'bg-neutral-10' : 'bg-neutral-6'
                          )}
                        >
                          {emailCheckLoading ? '전송 중' : '전송'}
                        </button>
                      </div>
                      {verificationSent ? <p className="mt-1 typo-body-xsmall text-orange-5">인증번호를 전송했습니다.</p> : null}
                      {emailDuplicateError ? <p className="mt-1 typo-body-xsmall text-danger">{emailDuplicateError}</p> : null}
                      {errors.email && !emailDuplicateError && !verificationSent ? (
                        <p className="mt-1 typo-body-xsmall text-danger">{errors.email.message}</p>
                      ) : null}
                    </div>

                    {verificationSent ? (
                      <div>
                        <label
                          htmlFor="verificationCode"
                          className={cn('typo-body-small-bold', verificationError ? 'text-danger' : 'text-neutral-10')}
                        >
                          인증번호
                        </label>
                        <div className="mt-1 flex items-start gap-[10px]">
                          <div
                            className={cn(
                              'flex h-[45px] flex-1 items-center rounded-lg border bg-neutral-2 px-3',
                              verificationError
                                ? 'border-danger'
                                : verificationSuccess
                                  ? 'border-neutral-6'
                                  : 'border-neutral-5'
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
                                setVerificationSuccess(false);
                              }}
                              className="flex-1 bg-transparent typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7"
                              placeholder="인증번호를 입력해주세요."
                            />
                            {verificationError ? (
                              <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                            ) : null}
                            {verificationSuccess && !verificationError ? (
                              <Image src="/assets/icons/icon-check-success.svg" alt="" width={20} height={20} />
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={!canVerifyCode}
                            className={cn(
                              'mt-[28px] h-10 w-[70px] shrink-0 rounded-lg typo-body-small-bold text-neutral-2',
                              canVerifyCode ? 'bg-neutral-10' : 'bg-neutral-6'
                            )}
                          >
                            {verifyLoading ? '확인 중' : '확인'}
                          </button>
                        </div>
                        {verificationError ? <p className="mt-1 typo-body-xsmall text-danger">{verificationError}</p> : null}
                        {verificationSuccess ? (
                          <p className="mt-1 typo-body-xsmall text-orange-5">인증에 성공했습니다.</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <label
                        htmlFor="password"
                        className={cn('typo-body-small-bold', passwordInvalid ? 'text-danger' : 'text-neutral-10')}
                      >
                        비밀번호
                      </label>
                      <div
                        className={cn(
                          'mt-1 flex h-[45px] items-center rounded-lg border bg-neutral-2 px-3',
                          passwordInvalid ? 'border-danger' : passwordValid ? 'border-neutral-6' : 'border-neutral-5'
                        )}
                      >
                        <input
                          id="password"
                          type="password"
                          {...register('password')}
                          className="flex-1 bg-transparent typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7"
                          placeholder="비밀번호를 입력해주세요."
                        />
                        {passwordInvalid ? (
                          <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                        ) : null}
                        {passwordValid && !passwordInvalid ? (
                          <Image src="/assets/icons/icon-check-success.svg" alt="" width={20} height={20} />
                        ) : null}
                      </div>
                      {passwordInvalid ? <p className="mt-1 typo-body-xsmall text-danger">{PASSWORD_HINT}</p> : null}
                      {errors.password && !passwordInvalid ? (
                        <p className="mt-1 typo-body-xsmall text-danger">{errors.password.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className={cn('typo-body-small-bold', confirmInvalid ? 'text-danger' : 'text-neutral-10')}
                      >
                        비밀번호 확인
                      </label>
                      <div
                        className={cn(
                          'mt-1 flex h-[45px] items-center rounded-lg border bg-neutral-2 px-3',
                          confirmInvalid ? 'border-danger' : confirmValid ? 'border-neutral-6' : 'border-neutral-5'
                        )}
                      >
                        <input
                          id="confirmPassword"
                          type="password"
                          {...register('confirmPassword')}
                          className="flex-1 bg-transparent typo-body-xsmall text-neutral-12 outline-none placeholder:text-neutral-7"
                          placeholder="비밀번호를 다시 입력해주세요."
                        />
                        {confirmInvalid ? (
                          <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                        ) : null}
                        {confirmValid && !confirmInvalid ? (
                          <Image src="/assets/icons/icon-check-success.svg" alt="" width={20} height={20} />
                        ) : null}
                      </div>
                      {confirmInvalid ? (
                        <p className="mt-1 typo-body-xsmall text-danger">
                          {confirmMismatch ? '비밀번호가 일치하지 않습니다.' : PASSWORD_HINT}
                        </p>
                      ) : null}
                      {errors.confirmPassword && !confirmInvalid ? (
                        <p className="mt-1 typo-body-xsmall text-danger">{errors.confirmPassword.message}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canRegister}
              className={cn(
                'h-[55px] w-full rounded-lg typo-body-small-bold text-neutral-2',
                canRegister ? 'bg-orange-5' : 'bg-orange-3'
              )}
            >
              {isSubmitting ? '가입 중...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
