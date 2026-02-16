'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavBar } from '@/components/layout';
import { LogoSubtext, Subtitle, TextField } from '@/components/ui';
import { cn } from '@/lib/utils';

type FocusField =
  | 'name'
  | 'phone'
  | 'email'
  | 'verificationCode'
  | 'password'
  | 'confirmPassword'
  | null;

type EmailVerificationState = 'idle' | 'in_use' | 'sent';
type CodeVerificationState = 'idle' | 'invalid' | 'verified';

interface RegisterMemberInfoInput {
  name: string;
  phone: string;
  email: string;
  verificationCode: string;
  password: string;
  confirmPassword: string;
}

interface ApiError {
  status: 'error';
  code: string;
  message: string;
}

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function RegisterMemberInfoPage() {
  const router = useRouter();
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  const [emailVerificationState, setEmailVerificationState] =
    useState<EmailVerificationState>('idle');
  const [codeVerificationState, setCodeVerificationState] =
    useState<CodeVerificationState>('idle');

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailCaption, setEmailCaption] = useState<string | undefined>();
  const [codeCaption, setCodeCaption] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const { register, watch, setValue } = useForm<RegisterMemberInfoInput>({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      verificationCode: '',
      password: '',
      confirmPassword: '',
    },
  });

  const nameValue = watch('name');
  const phoneValue = watch('phone');
  const emailValue = watch('email');
  const verificationCodeValue = watch('verificationCode');
  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  const isCodeSent = emailVerificationState === 'sent';
  const isCodeVerified = codeVerificationState === 'verified';

  const canSendCode =
    emailValue.trim().length > 0 &&
    !isSendingCode &&
    codeVerificationState !== 'verified';

  const canVerifyCode =
    isCodeSent &&
    verificationCodeValue.trim().length > 0 &&
    !isVerifyingCode &&
    codeVerificationState !== 'verified';

  const canRegister =
    nameValue.trim().length > 0 &&
    phoneValue.trim().length > 0 &&
    emailValue.trim().length > 0 &&
    passwordValue.trim().length > 0 &&
    confirmPasswordValue.trim().length > 0 &&
    verificationCodeValue.trim().length > 0 &&
    isCodeVerified &&
    !isSubmitting;

  const getFieldState = (
    field: Exclude<FocusField, null>,
    hasValue: boolean
  ) => {
    if (field === 'email' && emailVerificationState === 'in_use') {
      return 'warning' as const;
    }
    if (
      field === 'verificationCode' &&
      codeVerificationState === 'invalid'
    ) {
      return 'warning' as const;
    }
    if (focusedField === field) return 'focus' as const;
    if (hasValue) return 'filled' as const;
    return 'default' as const;
  };

  const resetApiMessages = () => {
    setFormError(undefined);
  };

  const onSendCode = async () => {
    resetApiMessages();
    setCodeVerificationState('idle');
    setCodeCaption(undefined);

    setIsSendingCode(true);
    try {
      const res = await fetch('/api/v1/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailValue.trim(),
          type: 'register',
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        const code = err?.code;

        if (code === 'EMAIL_EXISTS') {
          setEmailVerificationState('in_use');
          setEmailCaption('사용중인 이메일 입니다.');
          return;
        }

        setEmailVerificationState('idle');
        setEmailCaption(err?.message ?? '인증번호 전송에 실패했습니다.');
        return;
      }

      setEmailVerificationState('sent');
      setEmailCaption('인증번호를 전송했습니다.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const onVerifyCode = async () => {
    resetApiMessages();
    setIsVerifyingCode(true);

    try {
      const res = await fetch('/api/v1/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailValue.trim(),
          code: verificationCodeValue.trim(),
          type: 'register',
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        const code = err?.code;

        if (code === 'INVALID_CODE' || code === 'CODE_EXPIRED') {
          setCodeVerificationState('invalid');
          setCodeCaption(
            code === 'CODE_EXPIRED'
              ? '인증번호가 만료되었습니다.'
              : '인증번호가 올바르지 않습니다.'
          );
          return;
        }

        setCodeVerificationState('idle');
        setCodeCaption(err?.message ?? '인증 확인에 실패했습니다.');
        return;
      }

      setCodeVerificationState('verified');
      setCodeCaption('인증에 성공했습니다.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const onRegister = async () => {
    resetApiMessages();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameValue.trim(),
          phone: normalizePhoneDigits(phoneValue),
          email: emailValue.trim(),
          password: passwordValue,
          confirmPassword: confirmPasswordValue,
          verificationCode: verificationCodeValue.trim(),
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        const code = err?.code;

        if (code === 'EMAIL_EXISTS') {
          setEmailVerificationState('in_use');
          setEmailCaption('사용중인 이메일 입니다.');
        } else if (code === 'INVALID_CODE' || code === 'CODE_EXPIRED') {
          setCodeVerificationState('invalid');
          setCodeCaption(
            code === 'CODE_EXPIRED'
              ? '인증번호가 만료되었습니다.'
              : '인증번호가 올바르지 않습니다.'
          );
        } else {
          setFormError(err?.message ?? '회원가입에 실패했습니다.');
        }
        return;
      }

      router.push('/login?registered=true');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="home" />

      <div className="flex items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <div className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-[25px]">
            <Subtitle title="회원가입" className="w-full" />

            <div className="space-y-[30px]">
              <div className="space-y-[6px]">
                {isCodeSent ? (
                  <p className="text-neutral-8 typo-heading-xxsmall">회원정보</p>
                ) : null}

                <div className="space-y-4">
                  <TextField
                    id="name"
                    label="이름"
                    placeholder="홍길동"
                    state={getFieldState('name', nameValue.trim().length > 0)}
                    inputProps={{
                      ...register('name', {
                        onBlur: () => setFocusedField(null),
                        onChange: resetApiMessages,
                      }),
                      onFocus: () => setFocusedField('name'),
                    }}
                  />

                  <TextField
                    id="phone"
                    label="전화번호"
                    placeholder="010-1234-5678"
                    state={getFieldState('phone', phoneValue.trim().length > 0)}
                    inputProps={{
                      ...register('phone', {
                        onBlur: () => setFocusedField(null),
                        onChange: resetApiMessages,
                      }),
                      onFocus: () => setFocusedField('phone'),
                      onChange: (event) => {
                        setValue(
                          'phone',
                          formatPhoneDisplay(event.target.value),
                          { shouldDirty: true }
                        );
                        resetApiMessages();
                      },
                    }}
                  />
                </div>
              </div>

              <div className="border-t border-neutral-4" />

              <div className="space-y-[6px]">
                {isCodeSent ? (
                  <p className="text-neutral-8 typo-heading-xxsmall">ID/PW</p>
                ) : null}

                <div className="space-y-4">
                  <div className="flex items-end gap-[10px]">
                    <div className="flex-1">
                      <TextField
                        id="email"
                        label="아이디 (이메일)"
                        type="email"
                        placeholder="example@gmail.com"
                        state={getFieldState('email', emailValue.trim().length > 0)}
                        inputProps={{
                          ...register('email', {
                            onBlur: () => setFocusedField(null),
                            onChange: () => {
                              setEmailVerificationState('idle');
                              setEmailCaption(undefined);
                              if (codeVerificationState !== 'idle') {
                                setCodeVerificationState('idle');
                                setCodeCaption(undefined);
                              }
                              resetApiMessages();
                            },
                          }),
                          onFocus: () => setFocusedField('email'),
                        }}
                        rightSlot={
                          emailVerificationState === 'in_use' ? (
                            <Image
                              src="/assets/icons/icon-danger.svg"
                              alt=""
                              width={20}
                              height={20}
                            />
                          ) : undefined
                        }
                        caption={emailCaption}
                        captionClassName={cn(
                          'typo-body-xsmall',
                          emailVerificationState === 'in_use'
                            ? 'text-danger'
                            : 'text-orange-5'
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!canSendCode}
                      onClick={onSendCode}
                      className={cn(
                        'h-[45px] min-w-[66px] rounded-lg px-4 text-neutral-2 typo-body-small-bold',
                        canSendCode ? 'bg-neutral-10' : 'bg-neutral-6'
                      )}
                    >
                      {isSendingCode ? '전송중' : '전송'}
                    </button>
                  </div>

                  {isCodeSent ? (
                    <div className="flex items-end gap-[10px]">
                      <div className="flex-1">
                        <TextField
                          id="verificationCode"
                          label="인증번호"
                          placeholder="인증번호를 입력해주세요."
                          state={getFieldState(
                            'verificationCode',
                            verificationCodeValue.trim().length > 0
                          )}
                          inputProps={{
                            ...register('verificationCode', {
                              onBlur: () => setFocusedField(null),
                              onChange: () => {
                                if (codeVerificationState !== 'idle') {
                                  setCodeVerificationState('idle');
                                  setCodeCaption(undefined);
                                }
                                resetApiMessages();
                              },
                            }),
                            onFocus: () => setFocusedField('verificationCode'),
                          }}
                          rightSlot={
                            codeVerificationState === 'invalid' ? (
                              <Image
                                src="/assets/icons/icon-danger.svg"
                                alt=""
                                width={20}
                                height={20}
                              />
                            ) : undefined
                          }
                          caption={codeCaption}
                          captionClassName={cn(
                            'typo-body-xsmall',
                            codeVerificationState === 'invalid'
                              ? 'text-danger'
                              : 'text-orange-5'
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!canVerifyCode}
                        onClick={onVerifyCode}
                        className={cn(
                          'h-[45px] min-w-[66px] rounded-lg px-4 text-neutral-2 typo-body-small-bold',
                          canVerifyCode ? 'bg-neutral-10' : 'bg-neutral-6'
                        )}
                      >
                        {isVerifyingCode ? '확인중' : '확인'}
                      </button>
                    </div>
                  ) : null}

                  <TextField
                    id="password"
                    label="비밀번호"
                    type="password"
                    placeholder="비밀번호를 입력해주세요."
                    state={getFieldState(
                      'password',
                      passwordValue.trim().length > 0
                    )}
                    inputProps={{
                      ...register('password', {
                        onBlur: () => setFocusedField(null),
                        onChange: resetApiMessages,
                      }),
                      onFocus: () => setFocusedField('password'),
                    }}
                  />

                  <TextField
                    id="confirmPassword"
                    label="비밀번호 확인"
                    type="password"
                    placeholder={
                      isCodeSent
                        ? '비밀번호를 다시 입력해주세요.'
                        : '비밀번호를 입력해주세요.'
                    }
                    state={getFieldState(
                      'confirmPassword',
                      confirmPasswordValue.trim().length > 0
                    )}
                    inputProps={{
                      ...register('confirmPassword', {
                        onBlur: () => setFocusedField(null),
                        onChange: resetApiMessages,
                      }),
                      onFocus: () => setFocusedField('confirmPassword'),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            {formError ? (
              <p className="mb-2 text-center typo-body-xsmall text-danger">
                {formError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canRegister}
              onClick={onRegister}
              className={cn(
                'h-[55px] w-full rounded-lg text-neutral-2 transition-colors typo-body-small-bold',
                canRegister ? 'bg-orange-5' : 'bg-orange-3'
              )}
            >
              {isSubmitting ? '가입중' : '회원가입'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
