'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import { Button, LoginSupportLinks, LogoSubtext, Subtitle, TextField } from '@/components/ui';

const VERIFY_EXPIRE_SEC = 10 * 60;
const DEFAULT_TIME_TEXT = '5:00';
const SEND_FAILED_MESSAGE = '인증번호 전송에 실패했습니다.';
const TOO_MANY_REQUESTS_MESSAGE = '잠시 후 다시 시도해주세요.';
const EMAIL_NOT_FOUND_MESSAGE = '가입한 이메일이 없습니다.';
const EMAIL_SENT_MESSAGE = '인증번호가 전송되었습니다.';
const VERIFY_ERROR_MESSAGE = '인증번호가 올바르지 않습니다.';
const VERIFY_SUCCESS_MESSAGE = '인증번호가 확인되었습니다.';

type FocusField = 'email' | 'code' | null;

function formatRemainTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function isEmailFormat(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [remainingSec, setRemainingSec] = useState(VERIFY_EXPIRE_SEC);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const emailTrimmed = email.trim();
  const emailHasValue = emailTrimmed.length > 0;
  const emailFormatValid = isEmailFormat(email);
  const emailHasError = Boolean(emailError);

  const codeHasValue = verificationCode.length > 0;
  const codeValid = /^\d{6}$/.test(verificationCode);
  const codeHasError = Boolean(verificationError);

  const emailCaption = emailError ?? (verificationSent ? EMAIL_SENT_MESSAGE : undefined);
  const emailCaptionClassName = emailError ? 'text-danger' : verificationSent ? 'text-orange-5' : undefined;

  const verificationCaption = verificationError ?? (verificationSuccess ? VERIFY_SUCCESS_MESSAGE : undefined);
  const verificationCaptionClassName = verificationError ? 'text-danger' : verificationSuccess ? 'text-orange-5' : undefined;

  const codeTimeText = verificationSent ? formatRemainTime(Math.max(remainingSec, 0)) : DEFAULT_TIME_TEXT;

  const canSendCode = emailFormatValid && !sendLoading && !emailHasError && !verificationSent;
  const canVerifyCode =
    verificationSent &&
    !verificationSuccess &&
    codeValid &&
    !verifyLoading &&
    !codeHasError &&
    remainingSec > 0;
  const canProceed = verificationSuccess && !navigating;

  const resetVerificationState = () => {
    setVerificationSent(false);
    setVerificationSuccess(false);
    setVerificationError(null);
    setVerificationCode('');
    setRemainingSec(VERIFY_EXPIRE_SEC);
    setResetToken(null);
  };

  useEffect(() => {
    if (!verificationSent || verificationSuccess || remainingSec <= 0) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [verificationSent, verificationSuccess, remainingSec]);

  const handleSendCode = async () => {
    if (!emailFormatValid) return;

    setEmailError(null);
    setVerificationError(null);
    setVerificationSuccess(false);
    setResetToken(null);
    setSendLoading(true);

    try {
      const res = await fetch('/api/v1/auth/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed, type: 'reset-password' }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.code === 'EMAIL_NOT_FOUND') {
          setEmailError(EMAIL_NOT_FOUND_MESSAGE);
        } else if (data?.code === 'TOO_MANY_REQUESTS') {
          setEmailError(TOO_MANY_REQUESTS_MESSAGE);
        } else {
          setEmailError(SEND_FAILED_MESSAGE);
          console.error('Forgot password verification send failed', data);
        }
        return;
      }

      setVerificationSent(true);
      setVerificationSuccess(false);
      setVerificationError(null);
      setVerificationCode('');
      setRemainingSec(VERIFY_EXPIRE_SEC);
      setResetToken(null);
    } catch (error) {
      console.error('Forgot password verification send request failed', error);
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationSent || !emailFormatValid || !codeValid || remainingSec <= 0) return;

    setVerificationError(null);
    setVerifyLoading(true);

    try {
      const res = await fetch('/api/v1/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed, code: verificationCode, type: 'reset-password' }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setVerificationSuccess(false);
        setResetToken(null);
        setVerificationError(VERIFY_ERROR_MESSAGE);
        return;
      }

      setVerificationSuccess(true);
      setVerificationError(null);
      setResetToken(data?.data?.resetToken ?? null);
    } catch (error) {
      console.error('Forgot password verification check failed', error);
      setVerificationSuccess(false);
      setResetToken(null);
      setVerificationError(VERIFY_ERROR_MESSAGE);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!canProceed) return;

    setNavigating(true);
    try {
      if (resetToken) {
        router.push(`/forgot-password/reset-password?token=${resetToken}`);
        return;
      }

      router.push(`/forgot-password/reset-password?email=${encodeURIComponent(emailTrimmed)}`);
    } finally {
      setNavigating(false);
    }
  };

  const emailState =
    emailHasError ? 'error' : focusedField === 'email' ? 'focus' : emailHasValue && emailFormatValid ? 'filled' : 'default';

  const verificationState = codeHasError
    ? 'error'
    : focusedField === 'code'
      ? 'focus'
      : verificationSuccess
        ? 'filled'
        : verificationSent && !codeHasValue
          ? 'time'
          : codeHasValue && codeValid
            ? 'filled'
            : 'time';

  const showCodeRowButton = verificationSent;
  const showCodeTimer =
    !verificationError &&
    !verificationSuccess &&
    ((verificationState !== 'time' && verificationSent && remainingSec > 0) || !verificationSent);

  return (
    <div className="w-full max-w-[375px]">
      <NavBar variant="home" />

      <div className="flex flex-col items-center justify-center pb-7 pt-7">
        <LogoSubtext />
      </div>

      <div className="rounded-t-[12px] bg-neutral-1 px-4 pb-[38px] pt-[38px]">
        <div className="flex min-h-[533px] flex-col justify-between">
          <div className="space-y-[25px]">
            <Subtitle title="비밀번호 찾기" className="w-full" />

            <div className="space-y-4">
              <div className={emailCaption ? 'flex items-center gap-[10px]' : 'flex items-end gap-[10px]'}>
                <div className="min-w-0 flex-1">
                  <TextField
                    id="forgot-email"
                    type="email"
                    label="아이디 (이메일)"
                    placeholder="example@gmail.com"
                    state={emailState}
                    inputProps={{
                      value: email,
                      autoComplete: 'email',
                      onChange: (e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                        if (verificationSent || verificationSuccess || verificationCode || verificationError || resetToken) {
                          resetVerificationState();
                        }
                      },
                      onFocus: () => setFocusedField('email'),
                      onBlur: () => setFocusedField(null),
                    }}
                    caption={emailCaption}
                    captionClassName={emailCaptionClassName}
                  />
                </div>

                <Button
                  type="button"
                  size="s"
                  color="black"
                  status={canSendCode ? 'default' : 'disabled'}
                  onClick={handleSendCode}
                  disabled={!canSendCode}
                  className="h-10 w-[70px] shrink-0 whitespace-nowrap py-0 typo-body-small"
                >
                  {sendLoading ? '전송 중' : '전송'}
                </Button>
              </div>

              {showCodeRowButton ? (
                <div className={verificationCaption ? 'flex items-center gap-[10px]' : 'flex items-end gap-[10px]'}>
                  <div className="min-w-0 flex-1">
                    <TextField
                      id="forgot-code"
                      label="인증번호"
                      placeholder="인증번호를 입력해주세요."
                      state={verificationState}
                      timeText={codeTimeText}
                      rightSlot={
                        showCodeTimer ? <span className="typo-body-xsmall text-neutral-7">{codeTimeText}</span> : undefined
                      }
                      inputProps={{
                        value: verificationCode,
                        type: 'text',
                        inputMode: 'numeric',
                        maxLength: 6,
                        onChange: (e) => {
                          const nextCode = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(nextCode);
                          setVerificationError(null);
                          setVerificationSuccess(false);
                          setResetToken(null);
                        },
                        onFocus: () => setFocusedField('code'),
                        onBlur: () => setFocusedField(null),
                      }}
                      caption={verificationCaption}
                      captionClassName={verificationCaptionClassName}
                    />
                  </div>

                  <Button
                    type="button"
                    size="s"
                    color="black"
                    status={canVerifyCode ? 'default' : 'disabled'}
                    onClick={handleVerifyCode}
                    disabled={!canVerifyCode}
                    className="h-10 w-[70px] shrink-0 whitespace-nowrap py-0 typo-body-small"
                  >
                    {verifyLoading ? '확인 중' : '확인'}
                  </Button>
                </div>
              ) : (
                <TextField
                  id="forgot-code"
                  label="인증번호"
                  placeholder="인증번호를 입력해주세요."
                  state="time"
                  timeText={DEFAULT_TIME_TEXT}
                  inputProps={{
                    value: verificationCode,
                    type: 'text',
                    inputMode: 'numeric',
                    maxLength: 6,
                    onChange: (e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6)),
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                type="button"
                size="l"
                color="orange"
                status={canProceed ? 'default' : 'disabled'}
                onClick={handleProceed}
                disabled={!canProceed}
                className="h-[55px] py-0"
              >
                비밀번호 찾기
              </Button>

              <div className="flex items-center justify-center gap-2 typo-body-xsmall">
                <p className="text-neutral-8">아직 계정이 없으신가요?</p>
                <Link href="/register" className="typo-body-xsmall-bold text-orange-4">
                  회원가입
                </Link>
              </div>
            </div>

            <LoginSupportLinks variant="forgot_id" />
          </div>
        </div>
      </div>
    </div>
  );
}
