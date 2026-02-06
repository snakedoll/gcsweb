type EmailSender = { email: string; name?: string };

function parseSender(value: string): EmailSender {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1]?.trim().replace(/^"(.+)"$/, '$1');
    const email = match[2]?.trim();
    return { email, name: name || undefined };
  }
  return { email: trimmed };
}

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const defaultFrom =
    process.env.BREVO_FROM_EMAIL ||
    // Backward-compat for a common typo seen in env setups
    process.env.BREVO_FROM_EMAL ||
    process.env.EMAIL_FROM;

  return { apiKey, defaultFrom };
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  try {
    const { apiKey, defaultFrom } = getBrevoConfig();
    if (!apiKey) {
      console.warn('BREVO_API_KEY is not set. Email functionality will not work.');
      throw new Error('BREVO_API_KEY is not set');
    }

    const fromValue = from || defaultFrom || 'noreply@example.com';
    const sender = parseSender(fromValue);
    const senderWithName = { name: sender.name || 'GCS', email: sender.email };

    const toList = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: senderWithName,
        to: toList,
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Failed to send email:', response.status, errorText);
      throw new Error('이메일 발송에 실패했습니다.');
    }

    const data = await response.json().catch(() => null);
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
