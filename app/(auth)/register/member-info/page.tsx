'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavBar } from '@/components/layout';
import { LogoSubtext, Subtitle, TextField } from '@/components/ui';
import { cn } from '@/lib/utils';

interface RegisterMemberInfoInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterMemberInfoPage() {
  const [focusedField, setFocusedField] = useState<
    'name' | 'phone' | 'email' | 'password' | 'confirmPassword' | null
  >(null);

  const { register, watch, setValue } = useForm<RegisterMemberInfoInput>({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const nameValue = watch('name');
  const phoneValue = watch('phone');
  const emailValue = watch('email');
  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  const isFormFilled =
    nameValue.trim().length > 0 &&
    phoneValue.trim().length > 0 &&
    emailValue.trim().length > 0 &&
    passwordValue.trim().length > 0 &&
    confirmPasswordValue.trim().length > 0;

  const getFieldState = (
    field: 'name' | 'phone' | 'email' | 'password' | 'confirmPassword',
    hasValue: boolean
  ) => {
    if (focusedField === field) return 'focus' as const;
    if (hasValue) return 'filled' as const;
    return 'default' as const;
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
        <div className="flex min-h-[570px] flex-col justify-between">
          <div className="space-y-[25px]">
            <Subtitle title="회원가입" className="w-full" />

            <div className="space-y-[30px]">
              <div className="space-y-4">
                <TextField
                  id="name"
                  label="이름"
                  placeholder="홍길동"
                  state={getFieldState('name', nameValue.trim().length > 0)}
                  inputProps={{
                    ...register('name', { onBlur: () => setFocusedField(null) }),
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
                      setValue('phone', formatPhoneNumber(event.target.value), {
                        shouldDirty: true,
                      });
                    },
                  }}
                />
              </div>

              <div className="border-t border-neutral-4" />

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
                        ...register('email', { onBlur: () => setFocusedField(null) }),
                        onFocus: () => setFocusedField('email'),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="h-[45px] min-w-[74px] rounded-lg bg-neutral-10 px-4 text-neutral-2 typo-body-small-bold"
                  >
                    전송
                  </button>
                </div>

                <TextField
                  id="password"
                  label="비밀번호"
                  type="password"
                  placeholder="비밀번호를 입력해주세요."
                  state={getFieldState('password', passwordValue.trim().length > 0)}
                  inputProps={{
                    ...register('password', { onBlur: () => setFocusedField(null) }),
                    onFocus: () => setFocusedField('password'),
                  }}
                />

                <TextField
                  id="confirmPassword"
                  label="비밀번호 확인"
                  type="password"
                  placeholder="비밀번호를 입력해주세요."
                  state={getFieldState(
                    'confirmPassword',
                    confirmPasswordValue.trim().length > 0
                  )}
                  inputProps={{
                    ...register('confirmPassword', {
                      onBlur: () => setFocusedField(null),
                    }),
                    onFocus: () => setFocusedField('confirmPassword'),
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!isFormFilled}
            className={cn(
              'h-[55px] w-full rounded-lg text-neutral-2 transition-colors typo-body-small-bold',
              isFormFilled ? 'bg-orange-5' : 'bg-orange-3'
            )}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
