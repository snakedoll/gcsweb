'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>
      
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
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="비밀번호 입력"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#FF6F22] to-[#EE4A08] text-white py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
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
        카카오로 계속하기
      </button>
      
      <div className="mt-4 text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link href="/register" className="text-orange-500 hover:underline">
          회원가입
        </Link>
      </div>
    </div>
  );
}
