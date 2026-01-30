import { Resend } from 'resend';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn('RESEND_API_KEY is not set. Email functionality will not work.');
      throw new Error('RESEND_API_KEY is not set');
    }

    const { data, error } = await resend.emails.send({
      from: from || process.env.EMAIL_FROM || 'noreply@example.com',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error('이메일 발송에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  verificationCode: (code: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF6F22;">GCS 인증번호</h1>
      <p>아래 인증번호를 입력해주세요:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</span>
      </div>
      <p style="color: #666;">이 인증번호는 10분간 유효합니다.</p>
    </div>
  `,
  
  passwordReset: (resetUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF6F22;">비밀번호 재설정</h1>
      <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #FF6F22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          비밀번호 재설정
        </a>
      </div>
      <p style="color: #666;">이 링크는 1시간 동안 유효합니다.</p>
    </div>
  `,
};
