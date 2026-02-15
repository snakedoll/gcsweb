'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { Checkbox, LoginSupportLinks, TextField } from '@/components/ui';
import { typography } from '@/lib/styles/typography';
import { cn } from '@/lib/utils';

type LoginUiState = 'default' | 'warning' | 'blocked';

export default function LoginPage() {
  const router = useRouter();
  const [loginUiState, setLoginUiState] = useState<LoginUiState>('default');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const emailValue = watch('email');
  const passwordValue = watch('password');
  const hasCredentials = emailValue.trim().length > 0 && passwordValue.trim().length > 0;
  const isWarningState = loginUiState === 'warning';
  const isBlockedState = loginUiState === 'blocked';
  const isErrorLikeState = isWarningState || isBlockedState;

  const onSubmit = async (data: LoginInput) => {
    if (isBlockedState) return;

    setLoginUiState('default');

    const loginResponse = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const loginResult = await loginResponse.json().catch(() => null);

    if (!loginResponse.ok) {
      const code = loginResult?.code as string | undefined;
      if (code === 'ACCOUNT_LOCKED') {
        setLoginUiState('blocked');
        setRememberEmail(true);
        return;
      }

      setLoginUiState('warning');
      setRememberEmail(true);
      return;
    }

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setLoginUiState('warning');
      setRememberEmail(true);
      return;
    }

    router.push('/');
    router.refresh();
  };

  const getFieldState = (field: 'email' | 'password', hasValue: boolean) => {
    if (isWarningState) return 'warning' as const;
    if (isBlockedState) return 'blocked' as const;
    if (focusedField === field) return 'focus' as const;
    if (hasValue) return 'filled' as const;
    return 'default' as const;
  };

  return (
    <div className="w-full max-w-[375px]">
      <div className="border-b border-neutral-4 px-4 pb-[10px] pt-[10px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-6 w-3 items-center justify-center"
          aria-label="뒤로가기"
        >
          <Image src="/assets/icons/icon-back.svg" alt="" width={12} height={24} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 pb-7 pt-7">
        <Image src="/assets/logos/logo-gcs.svg" alt="GCS 로고" width={103} height={37} priority />
        <p className={cn(typography.bodyXSmall, 'text-orange-5')}>Graphic Communication Science</p>
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-5">
              <h1 className={cn('text-center text-neutral-10', typography.headingSmall)}>로그인</h1>
              <button
                type="button"
                onClick={() => signIn('kakao', { callbackUrl: '/' })}
                className={cn(
                  'flex h-[45px] w-full items-center justify-center gap-2 rounded-lg bg-[#fee500] text-[#191600]',
                  typography.bodySmallBold
                )}
              >
                <Image src="/assets/icons/icon-kakao-symbol.svg" alt="" width={18} height={17} />
                카카오 로그인
              </button>
            </div>

            <div className="border-t border-neutral-4" />

            <div className="space-y-4">
              <TextField
                id="email"
                type="email"
                label="아이디(이메일)"
                placeholder="example@gmail.com"
                state={getFieldState('email', emailValue.trim().length > 0)}
                inputProps={{
                  ...register('email', {
                    onBlur: () => setFocusedField(null),
                    onChange: () => {
                      if (loginUiState === 'warning') setLoginUiState('default');
                    },
                  }),
                  onFocus: () => setFocusedField('email'),
                  disabled: isBlockedState,
                }}
                rightSlot={
                  isWarningState ? (
                    <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                  ) : undefined
                }
                caption={isWarningState ? '아이디 또는 비밀번호가 일치하지 않습니다. (/5)' : isBlockedState ? '잠시 후 다시 시도해주세요.' : undefined}
                captionClassName={cn(typography.bodyXSmall, isWarningState ? 'text-danger' : 'text-orange-5')}
              />

              <TextField
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="비밀번호"
                placeholder="비밀번호를 입력해주세요."
                state={getFieldState('password', passwordValue.trim().length > 0)}
                inputProps={{
                  ...register('password', {
                    onBlur: () => setFocusedField(null),
                    onChange: () => {
                      if (loginUiState === 'warning') setLoginUiState('default');
                    },
                  }),
                  onFocus: () => setFocusedField('password'),
                  disabled: isBlockedState,
                }}
                rightSlot={
                  isWarningState ? (
                    <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      disabled={isBlockedState}
                    >
                      <Image
                        src={isBlockedState ? '/assets/icons/icon-eye-dark.svg' : '/assets/icons/icon-eye.svg'}
                        alt=""
                        width={20}
                        height={20}
                      />
                    </button>
                  )
                }
                caption={isWarningState ? '아이디 또는 비밀번호가 일치하지 않습니다. (/5)' : isBlockedState ? '잠시 후 다시 시도해주세요.' : undefined}
                captionClassName={cn(typography.bodyXSmall, isWarningState ? 'text-danger' : 'text-orange-5')}
              />
            </div>

            <Checkbox
              checked={rememberEmail}
              onChange={setRememberEmail}
              label="아이디 기억하기"
            />
          </div>

          <div className="space-y-3 pt-8">
            <button
              type="submit"
              disabled={isSubmitting || !hasCredentials || isErrorLikeState}
              className={[
                cn('h-[55px] w-full rounded-lg text-neutral-2 transition-colors', typography.bodySmallBold),
                hasCredentials && !isErrorLikeState ? 'bg-orange-5' : 'bg-orange-3',
              ].join(' ')}
            >
              {isSubmitting ? '로그인 중...' : hasCredentials ? '로그인' : '이메일로 로그인'}
            </button>

            <div className={cn('flex items-center justify-center gap-2', typography.bodyXSmall)}>
              <p className="text-neutral-8">아직 계정이 없으신가요?</p>
              <Link href="/register" className={cn(typography.bodyXSmallBold, 'text-orange-4')}>
                회원가입
              </Link>
            </div>

            <LoginSupportLinks />
          </div>
        </form>
      </div>
    </div>
  );
}
