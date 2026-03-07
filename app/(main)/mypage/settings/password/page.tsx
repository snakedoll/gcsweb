'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Image from 'next/image';
import { Modal, TextField } from '@/components/ui/common';

export default function PasswordChangePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPwdError, setCurrentPwdError] = useState('');

  // Step 2
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPwdError, setNewPwdError] = useState('');
  const [confirmPwdError, setConfirmPwdError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;
  const isNewPwdValid = passwordRegex.test(newPassword);
  const isConfirmPwdValid = newPassword !== '' && newPassword === confirmPassword;

  const handleNextStep = async () => {
    if (step === 1) {
      if (!currentPassword) return;
      setLoading(true);
      setCurrentPwdError('');
      
      try {
        const res = await fetch('/api/v1/mypage/password', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword }),
        });
        const json = await res.json();
        
        if (json.status === 'success') {
          setStep(2);
        } else {
          setCurrentPwdError('비밀번호가 일치하지 않습니다.');
        }
      } catch (e) {
        setCurrentPwdError('서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    } else {
      // Final Submit
      if (!newPassword || !confirmPassword) return;
      
      setNewPwdError('');
      setConfirmPwdError('');

      // Validation
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;
      if (!passwordRegex.test(newPassword)) {
        setNewPwdError('8자 이상 영문, 숫자 조합');
        return;
      }

      if (newPassword !== confirmPassword) {
        setConfirmPwdError('비밀번호가 일치하지 않습니다.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/v1/mypage/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const json = await res.json();
        
        if (json.status === 'success') {
          setShowSuccessModal(true);
        } else {
          setNewPwdError(json.message || '변경에 실패했습니다.');
        }
      } catch (e) {
        setNewPwdError('서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar 
        variant="title-back" 
        title="비밀번호 변경" 
        onBack={() => step === 2 ? setStep(1) : router.back()} 
      />
      
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 pt-6 pb-[32px]">
        {step === 1 ? (
          <TextField
            id="current-password"
            label="현재 비밀번호"
            type="password"
            state={currentPwdError ? 'error' : 'default'}
            placeholder="비밀번호를 입력해주세요."
            inputProps={{
              value: currentPassword,
              onChange: (e) => setCurrentPassword(e.target.value),
            }}
            caption={currentPwdError}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <TextField
              id="new-password"
              label="새 비밀번호"
              type="password"
              state={isNewPwdValid ? 'success' : (newPassword || newPwdError) ? 'error' : 'default'}
              placeholder="비밀번호를 입력해주세요."
              inputProps={{
                value: newPassword,
                onChange: (e) => {
                  setNewPassword(e.target.value);
                  setNewPwdError('');
                },
              }}
              caption={(newPassword && !isNewPwdValid) || newPwdError ? '8자 이상 영문, 숫자 조합' : undefined}
            />

            <TextField
              id="confirm-password"
              label="비밀번호 확인"
              type="password"
              state={isConfirmPwdValid ? 'success' : (confirmPassword || confirmPwdError) ? 'error' : 'default'}
              placeholder="비밀번호를 다시 입력해주세요."
              inputProps={{
                value: confirmPassword,
                onChange: (e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmPwdError('');
                },
              }}
              caption={(confirmPassword && !isConfirmPwdValid) || confirmPwdError ? '비밀번호가 일치하지 않습니다.' : undefined}
              captionClassName="typo-body-xxsmall"
            />
          </div>
        )}

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleNextStep}
            disabled={loading || (step === 1 ? !currentPassword : (!newPassword || !confirmPassword))}
            className={`flex h-[55px] w-full items-center justify-center rounded-[8px] typo-body-small-bold transition-colors ${
              (step === 1 ? currentPassword : (newPassword && confirmPassword)) 
                ? 'bg-orange-5 text-neutral-1 active:bg-orange-6' 
                : 'bg-orange-3 text-neutral-2 cursor-not-allowed'
            }`}
          >
            {loading ? '처리 중...' : '다음'}
          </button>
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Modal
            variant="one button"
            title="비밀번호가 변경되었습니다."
            confirmText="확인"
            onConfirm={() => router.replace('/mypage/settings')}
          />
        </div>
      )}
    </div>
  );
}
