'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await res.json().catch(() => null);
      
      if (!res.ok) {
        setError(result?.message || result?.error || '회원가입에 실패했습니다.');
        return;
      }
      
      router.push('/login?registered=true');
    } catch {
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">회원가입</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="example@email.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            {...register('nickname')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="닉네임 입력"
          />
          {errors.nickname && (
            <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            이름
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="홍길동"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="010-1234-5678"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="8자 이상 입력"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="비밀번호 재입력"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#FF6F22] to-[#EE4A08] text-white py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? '가입 중...' : '회원가입'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">또는</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={() => signIn('kakao', { callbackUrl: '/' })}
        className="w-full bg-[#FEE500] text-[#191600] py-2 rounded-md hover:opacity-90 transition-opacity font-medium"
      >
        카카오로 간편가입
      </button>
      
      <div className="mt-4 text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-orange-500 hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
