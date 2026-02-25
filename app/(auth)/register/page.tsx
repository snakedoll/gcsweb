'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavBar } from '@/components/layout';
import { Button, LogoSubtext, Subtitle, TextField } from '@/components/ui';
import { formatPhoneWithHyphen } from '@/lib/format-phone';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import Image from 'next/image';

const PASSWORD_HINT = '8자 이상 영문, 숫자 조합';
const EMAIL_DUPLICATE_MESSAGE = '사용 중인 이메일입니다.';

type FocusField = 'name' | 'phone' | 'email' | 'verificationCode' | 'password' | 'confirmPassword' | null;

function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /^[A-Za-z\d]+$/.test(password);
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export default function RegisterPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<'terms' | 'form' | 'terms-service' | 'terms-privacy'>('terms');

  // Terms state
  const [agreements, setAgreements] = useState({
    age: false,
    service: false,
    privacy: false,
  });
  const allAgreed = agreements.age && agreements.service && agreements.privacy;

  const handleAllAgree = () => {
    const nextState = !allAgreed;
    setAgreements({ age: nextState, service: nextState, privacy: nextState });
  };

  const [focusedField, setFocusedField] = useState<FocusField>(null);
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

  const resetVerificationState = () => {
    setVerificationSent(false);
    setVerificationSuccess(false);
    setVerificationError(null);
    setVerificationCode('');
    setValue('verificationCode', '', { shouldValidate: true });
  };

  const nameField = register('name');
  const phoneField = register('phone', {
    onChange: (e) => {
      const formatted = formatPhoneWithHyphen(e.target.value);
      if (formatted !== e.target.value) setValue('phone', formatted);
    },
  });
  const emailField = register('email', {
    onChange: () => {
      setEmailDuplicateError(null);
      resetVerificationState();
    },
  });
  const passwordField = register('password');
  const confirmPasswordField = register('confirmPassword');

  const nameValue = watch('name') ?? '';
  const phoneValue = watch('phone') ?? '';
  const emailValue = watch('email') ?? '';
  const passwordValue = watch('password') ?? '';
  const confirmPasswordValue = watch('confirmPassword') ?? '';

  const emailTrimmed = emailValue.trim();
  const phoneDigits = normalizePhoneDigits(phoneValue);
  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);

  const nameHasValue = nameValue.trim().length > 0;
  const nameLengthValid = nameValue.length >= 2 && nameValue.length <= 50;
  const nameLengthInvalid = nameHasValue && !nameLengthValid;

  const phoneHasValue = phoneValue.trim().length > 0;
  const phoneFormatAllowed = /^[0-9+\-()\s]+$/.test(phoneValue);
  const phoneValid = phoneDigits.length >= 9 && phoneDigits.length <= 20 && phoneFormatAllowed;

  const passwordHasValue = passwordValue.length > 0;
  const passwordValid = passwordHasValue && isPasswordValid(passwordValue);
  const passwordInvalid = passwordHasValue && !isPasswordValid(passwordValue);

  const confirmHasValue = confirmPasswordValue.length > 0;
  const confirmMismatch = confirmHasValue && confirmPasswordValue !== passwordValue;
  const confirmValid = confirmHasValue && confirmPasswordValue === passwordValue && isPasswordValid(passwordValue);
  const confirmInvalid = confirmHasValue && !confirmValid;

  const emailHasError = Boolean(emailDuplicateError);
  const verifyCodeHasError = Boolean(verificationError);
  const verifyCodeHasValue = verificationCode.length > 0;
  const verifyCodeValueValid = /^\d{6}$/.test(verificationCode);

  const nameCaption = nameLengthInvalid ? '이름은 2자 이상 50자 이하여야 합니다.' : undefined;
  const emailCaption = emailDuplicateError ?? (verificationSent ? '인증번호를 전송했습니다.' : undefined);
  const emailCaptionClassName = emailDuplicateError ? 'text-danger' : verificationSent ? 'text-orange-5' : undefined;
  const verificationCaption = verificationError ?? (verificationSuccess ? '인증에 성공했습니다.' : undefined);
  const verificationCaptionClassName = verificationError
    ? 'text-danger'
    : verificationSuccess
      ? 'text-orange-5'
      : undefined;
  const confirmPasswordCaption = confirmInvalid
    ? confirmMismatch
      ? '비밀번호가 일치하지 않습니다.'
      : PASSWORD_HINT
    : undefined;

  const registerPasswordFieldState = passwordInvalid
    ? 'error'
    : passwordValid
      ? 'success'
      : focusedField === 'password'
        ? 'focus'
        : 'default';
  const registerConfirmPasswordFieldState = confirmInvalid
    ? 'error'
    : confirmValid
      ? 'success'
      : focusedField === 'confirmPassword'
        ? 'focus'
        : 'default';

  const canSendEmail =
    emailFormatValid &&
    !emailCheckLoading &&
    !emailHasError &&
    !(verificationSent && verificationCode.trim().length === 0 && !verificationSuccess);
  const canVerifyCode = verificationCode.length === 6 && !verifyLoading && !verifyCodeHasError;
  const canRegister =
    !isSubmitting &&
    verificationSuccess &&
    nameHasValue &&
    nameLengthValid &&
    phoneValid &&
    emailFormatValid &&
    passwordValid &&
    confirmValid;

  const handleEmailCheck = async () => {
    if (!emailTrimmed || !emailFormatValid) return;

    setEmailDuplicateError(null);
    setVerificationError(null);
    setEmailCheckLoading(true);

    try {
      const checkRes = await fetch('/api/v1/auth/email/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      });

      await checkRes.json().catch(() => null);
      if (checkRes.status === 409) {
        setEmailDuplicateError(EMAIL_DUPLICATE_MESSAGE);
        return;
      }

      const sendRes = await fetch('/api/v1/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed, type: 'register' }),
      });

      if (!sendRes.ok) {
        const sendData = await sendRes.json().catch(() => null);
        const msg =
          sendData?.code === 'TOO_MANY_REQUESTS' && typeof sendData?.retryAfterSeconds === 'number'
            ? `${sendData.retryAfterSeconds}초 후 다시 시도해주세요.`
            : sendData?.message ?? '인증번호 전송에 실패했습니다.';
        setEmailDuplicateError(msg);
        return;
      }

      setVerificationSent(true);
      setVerificationSuccess(false);
      setVerificationError(null);
      setVerificationCode('');
      setValue('verificationCode', '', { shouldValidate: true });
    } catch {
      setEmailDuplicateError('이메일 확인에 실패했습니다.');
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.trim();
    if (!emailTrimmed || !code) return;

    setVerificationError(null);
    setVerifyLoading(true);

    try {
      const res = await fetch('/api/v1/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed, type: 'register', code }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVerificationSuccess(false);
        setVerificationError(data?.message ?? '인증번호가 올바르지 않습니다.');
        return;
      }

      setVerificationSuccess(true);
      setVerificationError(null);
      setValue('verificationCode', code, { shouldValidate: true });
    } catch {
      setVerificationSuccess(false);
      setVerificationError('인증번호 확인에 실패했습니다.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
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
          setEmailDuplicateError(EMAIL_DUPLICATE_MESSAGE);
        } else if (result?.code === 'INVALID_CODE' || result?.code === 'CODE_EXPIRED') {
          setVerificationError(result?.message ?? '인증번호가 올바르지 않습니다.');
          setVerificationSuccess(false);
        } else {
          console.error('Register failed', result);
        }
        return;
      }

      router.push('/login?registered=true');
    } catch (e) {
      console.error('Register request failed', e);
    }
  };

  const TERMS_CONTENT_SERVICE = `본 약관은 안북스 스튜디오(이하 "회사")가 인터넷 사이트(https://gcsweb.kr)를 통하여 제공하는 회원 서비스, 크라우드펀딩 서비스, 스토어 서비스 등 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.`;
  const TERMS_CONTENT_PRIVACY = TERMS_CONTENT_SERVICE; // Figma shows the same text for both as a placeholder. Let's use it.

  if (step === 'terms-service' || step === 'terms-privacy') {
    const isService = step === 'terms-service';
    return (
      <div className="w-full max-w-[375px] h-screen bg-neutral-3 flex flex-col">
        <NavBar 
          variant="title-back" 
          title={isService ? '홈페이지 이용약관' : '개인정보 수집 이용'} 
          onBack={() => setStep('terms')} 
        />
        {/* 흰색 카드: 스크롤 영역 + 하단 버튼 */}
        <div className="flex-1 flex flex-col bg-white rounded-t-xl overflow-hidden min-h-0">
          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-5 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D9D9D9] [&::-webkit-scrollbar-thumb]:rounded-full">
            <h1 className="typo-heading-small text-[#5f5a58] mb-6">제1장 총칙</h1>
            
            <div className="space-y-[12px]">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-[12px]">
                  <h2 className="typo-heading-xxsmall text-[#5f5a58]">제{i + 1}조 (목적)</h2>
                  <p className="typo-body-xsmall text-[#5f5a58] whitespace-pre-wrap">{isService ? TERMS_CONTENT_SERVICE : TERMS_CONTENT_PRIVACY}</p>
                </div>
              ))}
            </div>
          </div>
          {/* 하단 고정 버튼 */}
          <div className="shrink-0 bg-white px-4 pt-[17px] pb-[50px]">
            <Button size="l" color="orange" onClick={() => setStep('terms')} className="w-full h-[55px]">
              확인
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[375px] min-h-screen bg-neutral-3 flex flex-col">
      <NavBar variant={step === 'terms' ? 'back' : 'home'} onBack={step === 'terms' ? () => router.back() : undefined} />

      <div className="flex flex-col items-center justify-center pb-7 pt-[38px]">
        <LogoSubtext />
      </div>

      <div className="flex-1 rounded-t-[12px] bg-neutral-1 px-4 pb-[38px] pt-[38px]">
        {step === 'terms' ? (
          <div className="flex flex-col h-full min-h-[500px]">
            <h2 className="typo-heading-small text-center text-neutral-12 mb-10 mt-2">회원 가입</h2>

            <div className="px-[10px] flex-1">
              <label className="flex items-center gap-2 cursor-pointer mb-5">
                <div className={`relative shrink-0 w-6 h-6 flex items-center justify-center rounded-lg ${allAgreed ? 'bg-orange-5' : 'border-2 border-neutral-6'}`}>
                  {allAgreed && (
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                      <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="typo-body-xsmall-bold text-neutral-8 select-none">전체 동의</span>
                <input type="checkbox" checked={allAgreed} onChange={handleAllAgree} className="hidden" />
              </label>

              <div className="h-px w-full bg-neutral-4 mb-4" />

              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`relative shrink-0 w-6 h-6 flex items-center justify-center rounded-lg ${agreements.age ? 'bg-orange-5' : 'border-2 border-neutral-6'}`}>
                    {agreements.age && (
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="typo-body-xsmall text-neutral-8 select-none">[필수] 만 14세 이상입니다.</span>
                  <input type="checkbox" checked={agreements.age} onChange={() => setAgreements(s => ({ ...s, age: !s.age }))} className="hidden" />
                </label>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`relative shrink-0 w-6 h-6 flex items-center justify-center rounded-lg ${agreements.service ? 'bg-orange-5' : 'border-2 border-neutral-6'}`}>
                      {agreements.service && (
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="typo-body-xsmall text-neutral-9 select-none">[필수] 홈페이지 이용약관 동의</span>
                    <input type="checkbox" checked={agreements.service} onChange={() => setAgreements(s => ({ ...s, service: !s.service }))} className="hidden" />
                  </label>
                  <button type="button" onClick={() => setStep('terms-service')} className="p-1 flex items-center justify-center">
                    <Image src="/assets/icons/arrow/filled/Iconex/Filled/Right 2.svg" alt="약관 보기" width={24} height={24} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`relative shrink-0 w-6 h-6 flex items-center justify-center rounded-lg ${agreements.privacy ? 'bg-orange-5' : 'border-2 border-neutral-6'}`}>
                      {agreements.privacy && (
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="typo-body-xsmall text-neutral-8 select-none">[필수] 개인정보 수집·이용 동의</span>
                    <input type="checkbox" checked={agreements.privacy} onChange={() => setAgreements(s => ({ ...s, privacy: !s.privacy }))} className="hidden" />
                  </label>
                  <button type="button" onClick={() => setStep('terms-privacy')} className="p-1 flex items-center justify-center">
                    <Image src="/assets/icons/arrow/filled/Iconex/Filled/Right 2.svg" alt="약관 보기" width={24} height={24} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 pb-8">
              <Button 
                size="l" 
                color="orange" 
                status={allAgreed ? 'default' : 'disabled'}
                disabled={!allAgreed}
                onClick={() => setStep('form')}
              >
                다음
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-[833px] flex-col">
          <input type="hidden" {...register('verificationCode')} />

          <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-[25px]">
              <Subtitle title="회원가입" className="w-full" />

              <div className="space-y-[30px]">
                <div className="space-y-4">
                  <TextField
                    id="name"
                    label="이름"
                    placeholder="홍길동"
                    state={
                      nameLengthInvalid
                        ? 'error'
                        : focusedField === 'name'
                          ? 'focus'
                          : nameHasValue && nameLengthValid
                            ? 'filled'
                            : 'default'
                    }
                    inputProps={{
                      ...nameField,
                      onFocus: () => setFocusedField('name'),
                      onBlur: (e) => {
                        setFocusedField(null);
                        nameField.onBlur(e);
                      },
                    }}
                    caption={nameCaption}
                    captionClassName="text-danger"
                  />

                  <TextField
                    id="phone"
                    label="전화번호"
                    placeholder="010-1234-5678"
                    state={
                      focusedField === 'phone'
                        ? 'focus'
                        : phoneHasValue && phoneValid
                          ? 'filled'
                          : 'default'
                    }
                    inputProps={{
                      ...phoneField,
                      type: 'tel',
                      inputMode: 'numeric',
                      autoComplete: 'tel',
                      onFocus: () => setFocusedField('phone'),
                      onBlur: (e) => {
                        setFocusedField(null);
                        phoneField.onBlur(e);
                      },
                    }}
                  />
                </div>

                <div className="h-px w-full bg-neutral-4" />

                <div className="space-y-4">
                  <div className={emailCaption ? 'flex items-center gap-[10px]' : 'flex items-end gap-[10px]'}>
                    <div className="min-w-0 flex-1">
                      <TextField
                        id="email"
                        type="email"
                        label="아이디 (이메일)"
                        placeholder="example@gmail.com"
                        state={
                          emailHasError
                            ? 'error'
                            : focusedField === 'email'
                              ? 'focus'
                              : emailTrimmed && emailFormatValid
                                ? 'filled'
                                : 'default'
                        }
                        inputProps={{
                          ...emailField,
                          onFocus: () => setFocusedField('email'),
                          onBlur: (e) => {
                            setFocusedField(null);
                            emailField.onBlur(e);
                          },
                        }}
                        caption={emailCaption}
                        captionClassName={emailCaptionClassName}
                      />
                    </div>

                    <Button
                      type="button"
                      size="s"
                      color="black"
                      status={canSendEmail ? 'default' : 'disabled'}
                      onClick={handleEmailCheck}
                      disabled={!canSendEmail}
                      className="h-10 w-[70px] shrink-0 whitespace-nowrap py-0 typo-body-small"
                    >
                      {emailCheckLoading ? '전송 중' : '전송'}
                    </Button>
                  </div>

                  {verificationSent ? (
                      <div
                        className={
                          verificationCaption ? 'flex items-center gap-[10px]' : 'flex items-end gap-[10px]'
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <TextField
                            id="verificationCode"
                            label="인증번호"
                            placeholder="인증번호를 입력해주세요."
                            state={
                              verificationError
                                ? 'error'
                                : focusedField === 'verificationCode'
                                  ? 'focus'
                                  : verifyCodeHasValue && verifyCodeValueValid
                                    ? 'filled'
                                    : 'default'
                            }
                            inputProps={{
                              type: 'text',
                              inputMode: 'numeric',
                              maxLength: 6,
                              value: verificationCode,
                              onFocus: () => setFocusedField('verificationCode'),
                              onBlur: () => setFocusedField(null),
                              onChange: (e) => {
                                const nextCode = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setVerificationCode(nextCode);
                                setVerificationError(null);
                                setVerificationSuccess(false);
                                setValue('verificationCode', nextCode, { shouldValidate: true });
                              },
                            }}
                            caption={verificationCaption}
                            captionClassName={verificationCaptionClassName}
                          />
                        </div>

                        <Button
                          type="button"
                          size="s"
                          color="black"
                          status={canVerifyCode ? 'default' : 'disabled'}
                          onClick={handleVerifyCode}
                          disabled={!canVerifyCode}
                          className="h-10 w-[70px] shrink-0 whitespace-nowrap py-0 typo-body-small"
                        >
                          {verifyLoading ? '확인 중' : '확인'}
                        </Button>
                      </div>
                  ) : null}

                  <TextField
                    id="password"
                    type="password"
                    label="비밀번호"
                    placeholder="비밀번호를 입력해주세요."
                    state={registerPasswordFieldState}
                    inputProps={{
                      ...passwordField,
                      onFocus: () => setFocusedField('password'),
                      onBlur: (e) => {
                        setFocusedField(null);
                        passwordField.onBlur(e);
                      },
                    }}
                    caption={passwordInvalid ? PASSWORD_HINT : undefined}
                    captionClassName={passwordInvalid ? 'text-danger' : undefined}
                  />

                  <TextField
                    id="confirmPassword"
                    type="password"
                    label="비밀번호 확인"
                    placeholder="비밀번호를 다시 입력해주세요."
                    state={registerConfirmPasswordFieldState}
                    inputProps={{
                      ...confirmPasswordField,
                      onFocus: () => setFocusedField('confirmPassword'),
                      onBlur: (e) => {
                        setFocusedField(null);
                        confirmPasswordField.onBlur(e);
                      },
                    }}
                    caption={confirmPasswordCaption}
                    captionClassName={confirmInvalid ? 'text-danger' : undefined}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="l"
              color="orange"
              status={canRegister ? 'default' : 'disabled'}
              disabled={!canRegister}
              className="h-[55px] py-0"
            >
              {isSubmitting ? '가입 중...' : '회원가입'}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
