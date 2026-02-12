'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { LoginSupportLinks, RememberIdCheckbox } from '@/components/ui';

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

  const getInputClasses = (field: 'email' | 'password', hasValue: boolean) => {
    if (isWarningState) {
      return [
        'h-[45px] w-full rounded-lg border border-[#ce1e1b] bg-[#fdfdfd] px-3 text-[13px] text-[#3f3835] outline-none',
      ].join(' ');
    }

    if (isBlockedState) {
      return [
        'h-[45px] w-full rounded-lg border border-[#c7c5c4] bg-[#f6f6f5] px-3 text-[13px] text-[#999694] outline-none',
      ].join(' ');
    }

    const isFocused = focusedField === field;
    const borderColor = isFocused ? 'border-[#f6874c]' : hasValue ? 'border-[#c7c5c4]' : 'border-[#f1f1f1]';
    const textColor = hasValue ? 'text-[#2f2824]' : 'text-[#999694]';

    return [
      'h-[45px] w-full rounded-lg bg-[#fdfdfd] px-3 text-[13px] outline-none placeholder:text-[#999694]',
      borderColor,
      textColor,
    ].join(' ');
  };

  return (
    <div className="w-full max-w-[375px] bg-[#f6f6f5]">
      <div className="border-b border-[#f1f1f1] bg-[#f6f6f5] px-4 pb-[10px] pt-[10px]">
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
        <p className="text-[13px] text-[#f6874c]">Graphic Communication Science</p>
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-5">
              <h1 className="text-center text-[19px] font-bold text-[#443e3c]">로그인</h1>
              <button
                type="button"
                onClick={() => signIn('kakao', { callbackUrl: '/' })}
                className="flex h-[45px] w-full items-center justify-center gap-2 rounded-lg bg-[#fee500] text-[15px] font-semibold text-[#191600]"
              >
                <Image src="/assets/icons/icon-kakao-symbol.svg" alt="" width={18} height={17} />
                카카오 로그인
              </button>
            </div>

            <div className="border-t border-[#f1f1f1]" />

            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className={isWarningState ? 'block text-[15px] font-bold text-[#ce1e1b]' : 'block text-[15px] font-bold text-[#3f3835]'}
                >
                  아이디(이메일)
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    onBlur: () => setFocusedField(null),
                  })}
                  onFocus={() => setFocusedField('email')}
                  disabled={isBlockedState}
                  className={getInputClasses('email', emailValue.trim().length > 0)}
                  placeholder="example@gmail.com"
                />
                {isWarningState && (
                  <p className="text-[13px] text-[#ce1e1b]">Caption</p>
                )}
                {isBlockedState && (
                  <p className="text-[13px] text-[#f6874c]">잠시 후 다시 시도해주세요.</p>
                )}
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className={isWarningState ? 'block text-[15px] font-bold text-[#ce1e1b]' : 'block text-[15px] font-bold text-[#3f3835]'}
                >
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      onBlur: () => setFocusedField(null),
                    })}
                    onFocus={() => setFocusedField('password')}
                    disabled={isBlockedState}
                    className={getInputClasses('password', passwordValue.trim().length > 0) + ' pr-10'}
                    placeholder="비밀번호를 입력해주세요."
                  />
                  {isWarningState ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Image src="/assets/icons/icon-danger.svg" alt="" width={20} height={20} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
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
                  )}
                </div>
                {isWarningState && (
                  <p className="text-[13px] text-[#ce1e1b]">Caption</p>
                )}
                {isBlockedState && (
                  <p className="text-[13px] text-[#f6874c]">잠시 후 다시 시도해주세요.</p>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <RememberIdCheckbox checked={rememberEmail} onChange={setRememberEmail} />
          </div>

          <div className="space-y-3 pt-8">
            <button
              type="submit"
              disabled={isSubmitting || !hasCredentials || isErrorLikeState}
              className={[
                'h-[55px] w-full rounded-lg text-[15px] font-bold text-[#fdfdfd] transition-colors',
                hasCredentials && !isErrorLikeState ? 'bg-[#f6874c]' : 'bg-[#fac0a1]',
              ].join(' ')}
            >
              {isSubmitting ? '로그인 중...' : hasCredentials ? '로그인' : '이메일로 로그인'}
            </button>

            <div className="flex items-center justify-center gap-2 text-[13px]">
              <p className="text-[#6c6764]">아직 계정이 없으신가요?</p>
              <Link href="/register" className="font-semibold text-[#ff7e38]">
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
