'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { CheckboxButton } from '@/components/ui';
import TermsDetailModal from '@/components/auth/TermsDetailModal';
import { PRIVACY_COLLECTION, TERMS_OF_USE } from '@/lib/terms-content';
import { formatPhoneWithHyphen } from '@/lib/format-phone';
import { cn } from '@/lib/utils';

const PASSWORD_HINT = '8자 이상 영문, 숫자 조합';

function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

type RegisterStep = 'terms' | 'form';
type TermsDetailType = 'terms' | 'privacy' | null;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('terms');
  const [detailModal, setDetailModal] = useState<TermsDetailType>(null);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailDuplicateError, setEmailDuplicateError] = useState<string | null>(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const allRequiredChecked = agreeAge && agreeTerms && agreePrivacy;

  const handleAgreeAllChange = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeAge(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  };

  const updateAgreeAll = () => {
    setAgreeAll(agreeAge && agreeTerms && agreePrivacy);
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
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
        setEmailDuplicateError(checkData?.message ?? '사용중인 이메일 입니다.');
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
    } catch {
      setEmailDuplicateError('확인에 실패했습니다.');
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
      setVerificationError(null);
    } catch {
      setVerificationError('인증 확인에 실패했습니다.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setEmailDuplicateError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) {
        if (result?.code === 'EMAIL_EXISTS') {
          setEmailDuplicateError('사용중인 이메일 입니다.');
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

  if (detailModal === 'terms') {
    return (
      <TermsDetailModal
        title="홈페이지 이용약관"
        content={TERMS_OF_USE}
        onConfirm={() => setDetailModal(null)}
      />
    );
  }
  if (detailModal === 'privacy') {
    return (
      <TermsDetailModal
        title="개인정보 수집 이용"
        content={PRIVACY_COLLECTION}
        onConfirm={() => setDetailModal(null)}
      />
    );
  }

  if (step === 'terms') {
    return (
      <div className="w-full max-w-[375px]">
        <div className="border-b border-neutral-4 px-4 pb-[10px] pt-[10px]">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex h-6 w-3 items-center justify-center"
            aria-label="뒤로가기"
          >
            <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
          </button>
        </div>

        <Link href="/" className="flex flex-col items-center gap-3 pb-7 pt-7" aria-label="메인으로 이동">
          <Image src="/assets/logos/logo-gcs.svg" alt="GCS 로고" width={103} height={37} priority />
          <p className={cn('typo-body-xsmall', 'text-orange-5')}>Graphic Communication Science</p>
        </Link>

        <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
          <h1 className={cn('text-center text-neutral-10 typo-heading-small')}>회원 가입</h1>

          <div className="mt-6 border-t border-neutral-4 pt-4">
            <CheckboxButton
              checked={agreeAll}
              onChange={handleAgreeAllChange}
              label="약관 전체 동의"
            />
          </div>
          <div className="mt-4 border-t border-neutral-4 pt-4 space-y-4">
            <CheckboxButton
              checked={agreeAge}
              onChange={(c) => {
                setAgreeAge(c);
                updateAgreeAll();
              }}
              label="[필수] 만 14세 이상입니다."
            />
            <div className="flex items-center justify-between gap-2">
              <CheckboxButton
                checked={agreeTerms}
                onChange={(c) => {
                  setAgreeTerms(c);
                  updateAgreeAll();
                }}
                label="[필수] 홈페이지 이용약관 동의"
              />
              <button
                type="button"
                onClick={() => setDetailModal('terms')}
                className="shrink-0 p-1"
                aria-label="홈페이지 이용약관 상세 보기"
              >
                <Image src="/assets/icons/icon-right.svg" alt="" width={24} height={24} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <CheckboxButton
                checked={agreePrivacy}
                onChange={(c) => {
                  setAgreePrivacy(c);
                  updateAgreeAll();
                }}
                label="[필수] 개인정보 수집·이용 동의"
              />
              <button
                type="button"
                onClick={() => setDetailModal('privacy')}
                className="shrink-0 p-1"
                aria-label="개인정보 수집 이용 상세 보기"
              >
                <Image src="/assets/icons/icon-right.svg" alt="" width={24} height={24} />
              </button>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={!allRequiredChecked}
              className={cn(
                'h-[55px] w-full rounded-lg typo-body-small-bold text-neutral-2',
                allRequiredChecked ? 'bg-orange-5' : 'bg-orange-3'
              )}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[375px]">
      <div className="border-b border-neutral-4 px-4 pb-[10px] pt-[10px]">
        <button
          type="button"
          onClick={() => setStep('terms')}
          className="inline-flex h-6 w-3 items-center justify-center"
          aria-label="뒤로가기"
        >
          <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
        </button>
      </div>

      <Link href="/" className="flex flex-col items-center gap-3 pb-7 pt-7" aria-label="메인으로 이동">
        <Image src="/assets/logos/logo-gcs.svg" alt="GCS 로고" width={103} height={37} priority />
        <p className={cn('typo-body-xsmall', 'text-orange-5')}>Graphic Communication Science</p>
      </Link>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <h1 className={cn('text-center text-neutral-10 typo-heading-small')}>회원가입</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 typo-body-xsmall text-danger">{error}</div>
          )}

          <section>
            <h2 className="typo-body-small-bold text-neutral-10 mb-4">회원정보</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="typo-body-xsmall-bold text-neutral-10">
                  이름
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="mt-1 h-12 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                  placeholder="홍길동"
                />
                {errors.name && (
                  <p className="mt-1 typo-body-xsmall text-danger">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="nickname" className="typo-body-xsmall-bold text-neutral-10">
                  닉네임
                </label>
                <input
                  id="nickname"
                  type="text"
                  {...register('nickname')}
                  className="mt-1 h-12 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                  placeholder="닉네임 입력"
                />
                {errors.nickname && (
                  <p className="mt-1 typo-body-xsmall text-danger">{errors.nickname.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="typo-body-xsmall-bold text-neutral-10">
                  전화번호
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="010-1234-5678"
                  className="mt-1 h-12 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                  {...register('phone', {
                    onChange: (e) => {
                      const formatted = formatPhoneWithHyphen(e.target.value);
                      if (formatted !== e.target.value) setValue('phone', formatted);
                    },
                  })}
                />
                {errors.phone && (
                  <p className="mt-1 typo-body-xsmall text-danger">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="typo-body-small-bold text-neutral-10 mb-4">ID/PW</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="typo-body-xsmall-bold text-neutral-10">
                  아이디 (이메일)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="email"
                    type="email"
                    {...register('email', {
                      onChange: () => {
                        setEmailDuplicateError(null);
                        setVerificationSent(false);
                        setVerificationSuccess(false);
                        setVerificationError(null);
                      },
                    })}
                    className="h-12 flex-1 rounded-lg border border-neutral-5 bg-neutral-1 px-3 typo-body-small text-neutral-10 outline-none focus:border-orange-5"
                    placeholder="example@gmail.com"
                  />
                  <button
                    type="button"
                    onClick={handleEmailCheck}
                    disabled={emailCheckLoading}
                    className="h-12 shrink-0 rounded-lg bg-neutral-8 px-4 typo-body-xsmall-bold text-neutral-1 disabled:opacity-50"
                  >
                    {emailCheckLoading ? '전송 중' : '전송'}
                  </button>
                </div>
                {verificationSent && (
                  <p className="mt-1 typo-body-xsmall text-orange-5">인증번호를 전송했습니다.</p>
                )}
                {emailDuplicateError && (
                  <p className="mt-1 typo-body-xsmall text-danger">{emailDuplicateError}</p>
                )}
                {errors.email && !emailDuplicateError && !verificationSent && (
                  <p className="mt-1 typo-body-xsmall text-danger">{errors.email.message}</p>
                )}
              </div>
              {verificationSent && (
                <div>
                  <label htmlFor="verificationCode" className="typo-body-xsmall-bold text-neutral-10">
                    인증번호
                  </label>
                  <div className="mt-1 flex gap-2">
                    <div
                      className={cn(
                        'flex h-12 flex-1 items-center rounded-lg border bg-neutral-1 px-3',
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
                          setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setVerificationError(null);
                        }}
                        className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none"
                        placeholder="인증번호를 입력해주세요."
                      />
                      {verificationError && (
                        <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifyLoading || verificationCode.length === 0}
                      className="h-12 shrink-0 rounded-lg bg-neutral-8 px-4 typo-body-xsmall-bold text-neutral-1 disabled:bg-neutral-5 disabled:text-neutral-7"
                    >
                      {verifyLoading ? '확인 중' : '확인'}
                    </button>
                  </div>
                  {verificationError && (
                    <p className="mt-1 typo-body-xsmall text-danger">{verificationError}</p>
                  )}
                  {verificationSuccess && (
                    <p className="mt-1 typo-body-xsmall text-orange-5">인증에 성공했습니다.</p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="password" className="typo-body-xsmall-bold text-neutral-10">
                  비밀번호
                </label>
                <div
                  className={cn(
                    'mt-1 flex h-12 items-center rounded-lg border bg-neutral-1 px-3',
                    passwordInvalid
                      ? 'border-danger'
                      : 'border-neutral-5'
                  )}
                >
                  <input
                    id="password"
                    type="password"
                    {...register('password')}
                    className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none"
                    placeholder="비밀번호를 입력해주세요."
                  />
                  {passwordInvalid && (
                    <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
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
                {errors.password && (
                  <p className="mt-1 typo-body-xsmall text-danger">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="typo-body-xsmall-bold text-neutral-10">
                  비밀번호 확인
                </label>
                <div
                  className={cn(
                    'mt-1 flex h-12 items-center rounded-lg border bg-neutral-1 px-3',
                    confirmInvalid ? 'border-danger' : 'border-neutral-5'
                  )}
                >
                  <input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    className="flex-1 bg-transparent typo-body-small text-neutral-10 outline-none"
                    placeholder="비밀번호를 다시 입력해주세요."
                  />
                  {confirmInvalid && (
                    <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                  )}
                </div>
                <p
                  className={cn(
                    'mt-1 typo-body-xsmall',
                    confirmInvalid ? 'text-danger' : 'text-neutral-7'
                  )}
                >
                  {PASSWORD_HINT}
                </p>
                {errors.confirmPassword && (
                  <p className="mt-1 typo-body-xsmall text-danger">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isSubmitting || !verificationSuccess}
            className={cn(
              'h-[55px] w-full rounded-lg bg-orange-5 typo-body-small-bold text-neutral-2 disabled:bg-orange-3'
            )}
          >
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-2 typo-body-xsmall">
          <span className="text-neutral-8">이미 계정이 있으신가요?</span>
          <Link href="/login" className="typo-body-xsmall-bold text-orange-4">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
