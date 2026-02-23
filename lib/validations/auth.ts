import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d]+$/, '비밀번호는 영문과 숫자를 포함해야 합니다.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, '이메일을 입력해주세요.')
      .email('올바른 이메일 형식이 아닙니다.'),
    name: z
      .string()
      .min(2, '이름은 2자 이상이어야 합니다.')
      .max(50, '이름은 50자 이하여야 합니다.'),
    phone: z
      .string()
      .min(9, '전화번호를 입력해주세요.')
      .max(20, '전화번호 형식이 올바르지 않습니다.')
      .regex(/^[0-9+\-()\s]+$/, '전화번호 형식이 올바르지 않습니다.'),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d]+$/,
        '비밀번호는 영문과 숫자를 포함해야 합니다.'
      ),
    confirmPassword: z.string(),
    verificationCode: z
      .string()
      .min(1, '인증번호를 입력해주세요.')
      .regex(/^\d{6}$/, '인증번호는 숫자 6자리여야 합니다.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
