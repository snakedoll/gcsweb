'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavBar } from '@/components/layout';
import { LoginSupportLinks, LogoSubtext, Subtitle, TextField } from '@/components/ui';
import { cn } from '@/lib/utils';

type ForgotIdUiState = 'default' | 'failure' | 'success';

interface ForgotIdInput {
  name: string;
  phone: string;
}

export default function ForgotIdPage() {
  const router = useRouter();
  const [uiState, setUiState] = useState<ForgotIdUiState>('default');
  const [foundEmail, setFoundEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'phone' | null>(null);

  const { register, handleSubmit, watch, setValue } = useForm<ForgotIdInput>({
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const nameValue = watch('name');
  const phoneValue = watch('phone');
  const hasAllFields = nameValue.trim().length > 0 && phoneValue.trim().length > 0;

  const isFailureState = uiState === 'failure';
  const isSuccessState = uiState === 'success';

  const getFieldState = (field: 'name' | 'phone', hasValue: boolean) => {
    if (focusedField === field) return 'focus' as const;
    if (hasValue) return 'filled' as const;
    return 'default' as const;
  };

  const onSubmit = async (data: ForgotIdInput) => {
    const normalizedName = data.name.trim();
    const normalizedPhone = data.phone.trim();
    if (!normalizedName || !normalizedPhone) return;

    setLoading(true);
    setUiState('default');
    try {
      const res = await fetch('/api/v1/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, phone: normalizedPhone }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) {
        setUiState('failure');
        return;
      }
      setFoundEmail(result?.data?.email ?? '');
      setUiState('success');
    } catch {
      setUiState('failure');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = () => {
    if (uiState !== 'default') {
      setUiState('default');
    }
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="home" />

      <div className="flex items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-white px-4 pb-7 pt-[38px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-9">
            <Subtitle title="아이디 찾기" className="w-full" />

            {isSuccessState ? (
              <TextField
                id="found-email"
                label="아이디 (이메일)"
                state="filled"
                inputProps={{ value: foundEmail, readOnly: true }}
              />
            ) : (
              <div className="space-y-4">
                <TextField
                  id="name"
                  label="이름"
                  placeholder="홍길동"
                  state={getFieldState('name', nameValue.trim().length > 0)}
                  inputProps={{
                    ...register('name', {
                      onBlur: () => setFocusedField(null),
                      onChange: handleInputChange,
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
                    }),
                    onFocus: () => setFocusedField('phone'),
                    onChange: (event) => {
                      const formattedPhone = formatPhoneNumber(event.target.value);
                      setValue('phone', formattedPhone, { shouldDirty: true });
                      handleInputChange();
                    },
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            {isFailureState ? (
              <p className="w-full text-center typo-body-xsmall text-orange-5">해당하는 아이디를 찾을 수 없습니다.</p>
            ) : null}

            <div className="flex w-full flex-col items-center gap-3">
              <button
                type={isSuccessState ? 'button' : 'submit'}
                onClick={isSuccessState ? () => router.push('/login') : undefined}
                disabled={(!isSuccessState && !hasAllFields) || loading}
                className={cn(
                  'h-[55px] w-full rounded-lg text-neutral-2 transition-colors typo-body-small-bold',
                  hasAllFields || isSuccessState ? 'bg-orange-5' : 'bg-orange-3'
                )}
              >
                {loading ? '찾는 중...' : '아이디 찾기'}
              </button>

              {!isSuccessState ? (
                <div className={cn('flex items-center justify-center gap-2 typo-body-xsmall')}>
                  <p className="text-neutral-8">아직 계정이 없으신가요?</p>
                  <Link href="/register" className={cn('typo-body-xsmall-bold', 'text-orange-4')}>
                    회원가입
                  </Link>
                </div>
              ) : null}
            </div>

            <LoginSupportLinks variant="forgot_pw" />
          </div>
        </form>
      </div>
    </div>
  );
}
