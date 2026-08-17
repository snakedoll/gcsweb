'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { NavBar } from '@/components/layout';
import TabBar from '@/components/ui/button/TabBar';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/common';

interface TermCardData {
  id: string;
  mainTitle: string;
  subTitle: string;
  body: string;
}

type TermType = 'homepage' | 'privacy' | 'service';

const TAB_ITEMS = [
  { key: 'homepage', title: '홈페이지 이용약관' },
  { key: 'privacy', title: '개인정보처리방침' },
  { key: 'service', title: '서비스 이용약관' },
];

const INFO_MESSAGES: Record<TermType, string> = {
  homepage: '회원가입 "홈페이지 이용약관" 동의 화면에 업로드됩니다.',
  privacy: '회원가입 "개인정보 수집·이용" 동의 화면과 사이트 풋터 "개인정보처리방침"에 업로드됩니다.',
  service: '사이트 풋터 "이용약관"에 업로드 됩니다.',
};

export default function AdminTermsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TermType>('homepage');
  const [termsData, setTermsData] = useState<Record<TermType, TermCardData[]>>({
    homepage: [{ id: Math.random().toString(36).substring(2, 9), mainTitle: '', subTitle: '', body: '' }],
    privacy: [{ id: Math.random().toString(36).substring(2, 9), mainTitle: '', subTitle: '', body: '' }],
    service: [{ id: Math.random().toString(36).substring(2, 9), mainTitle: '', subTitle: '', body: '' }],
  });
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch all terms on mount
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch('/api/v1/terms');
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          const grouped: Record<TermType, TermCardData[]> = {
            homepage: [],
            privacy: [],
            service: [],
          };
          json.data.forEach((item: any) => {
            if (grouped[item.type as TermType]) {
              grouped[item.type as TermType].push({
                id: item.id,
                mainTitle: item.mainTitle,
                subTitle: item.subTitle || '',
                body: item.body,
              });
            }
          });
          
          // Ensure at least one empty card if none exist for a type
          Object.keys(grouped).forEach((key) => {
            const k = key as TermType;
            if (grouped[k].length === 0) {
              grouped[k].push({ id: Math.random().toString(36).substring(2, 9), mainTitle: '', subTitle: '', body: '' });
            }
          });
          
          setTermsData(grouped);
        }
      } catch (e) {
        console.error('Failed to fetch terms:', e);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchTerms();
  }, []);

  const handleAddCard = () => {
    setTermsData((prev) => ({
      ...prev,
      [activeTab]: [
        ...prev[activeTab],
        { id: Math.random().toString(36).substring(2, 9), mainTitle: '', subTitle: '', body: '' },
      ],
    }));
  };

  const handleRemoveCard = (id: string) => {
    setTermsData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((card) => card.id !== id),
    }));
  };

  const handleChange = (id: string, field: keyof TermCardData, value: string) => {
    setTermsData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((card) =>
        card.id === id ? { ...card, [field]: value } : card
      ),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          terms: termsData[activeTab].map((card) => ({
            mainTitle: card.mainTitle,
            subTitle: card.subTitle,
            body: card.body,
          })),
        }),
      });
      const json = await res.json();
      
      if (json.status === 'success') {
        setShowConfirmModal(false);
        setShowSuccessModal(true);
      } else {
        alert(json.message || '저장에 실패했습니다.');
      }
    } catch (e) {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="약관 관리" onBack={() => router.back()} />
      <TabBar
        items={TAB_ITEMS}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TermType)}
        className="bg-neutral-3"
      />

      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 pt-6 pb-8">
        {/* Info Box */}
        <div className="mb-5 flex gap-2 rounded-[8px] bg-neutral-4 border border-neutral-4 p-4 items-center">
          <Image
            src="/assets/icons/light/info-circle.svg"
            alt="info"
            width={20}
            height={20}
            className="shrink-0"
          />
          <p className="typo-body-xsmall text-neutral-10 tracking-[-0.26px]">{INFO_MESSAGES[activeTab]}</p>
        </div>

        {/* Term Cards */}
        <div className="flex flex-col gap-5">
          {termsData[activeTab].map((card, index) => (
            <div
              key={card.id}
              className="relative flex flex-col gap-4 rounded-[12px] bg-neutral-2 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="typo-body-small-bold text-neutral-12">약관 {index + 1}</span>
                {termsData[activeTab].length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(card.id)}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Image src="/assets/icons/additional/Close.svg" alt="remove" width={24} height={24} />
                  </button>
                )}
              </div>

              {/* Main Title Input */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <span className="typo-body-xsmall-bold text-neutral-12">대제목</span>
                  <span className="text-[#ce1e1b]">*</span>
                </div>
                <input
                  type="text"
                  value={card.mainTitle}
                  onChange={(e) => handleChange(card.id, 'mainTitle', e.target.value)}
                  placeholder="제 1장 총칙"
                  className="h-[43px] w-full rounded-[8px] border border-neutral-6 bg-neutral-1 px-3 typo-body-xsmall text-neutral-12 placeholder:text-neutral-5 focus:border-orange-5 focus:outline-none"
                />
              </div>

              {/* Sub Title Input */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <span className="typo-body-xsmall-bold text-neutral-12">소제목</span>
                </div>
                <input
                  type="text"
                  value={card.subTitle}
                  onChange={(e) => handleChange(card.id, 'subTitle', e.target.value)}
                  placeholder="제 1조 목적"
                  className="h-[43px] w-full rounded-[8px] border border-neutral-6 bg-neutral-1 px-3 typo-body-xsmall text-neutral-12 placeholder:text-neutral-5 focus:border-orange-5 focus:outline-none"
                />
              </div>

              {/* Body Textarea */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <span className="typo-body-xsmall-bold text-neutral-12">본문</span>
                  <span className="text-[#ce1e1b]">*</span>
                </div>
                <textarea
                  value={card.body}
                  onChange={(e) => handleChange(card.id, 'body', e.target.value)}
                  placeholder="본 약관은.."
                  className="min-h-[100px] w-full resize-none rounded-[8px] border border-neutral-6 bg-neutral-1 p-3 typo-body-xsmall text-neutral-12 placeholder:text-neutral-5 focus:border-orange-5 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Card Button */}
        <button
          type="button"
          onClick={handleAddCard}
          className="mt-5 flex h-[47px] w-full items-center justify-center gap-1 rounded-[8px] bg-neutral-4 typo-body-small-bold text-neutral-12 transition-colors active:bg-neutral-5"
        >
          카드 추가 +
        </button>

        {/* Save Button */}
        <div className="mt-auto pt-10">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="flex h-[55px] w-full items-center justify-center rounded-[8px] bg-orange-5 typo-body-small-bold text-neutral-1 transition-colors active:bg-orange-6"
          >
            저장
          </button>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Modal
            title="정말로 수정하시겠습니까?"
            description="변경된 약관 내용이 사이트에 즉시 반영됩니다."
            variant="Default"
            confirmText="확인"
            cancelText="취소"
            onCancel={() => setShowConfirmModal(false)}
            onConfirm={handleSave}
            disabled={loading}
          />
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Modal
            variant="one button"
            title="저장이 완료되었습니다."
            confirmText="확인"
            onConfirm={() => {
              setShowSuccessModal(false);
              // Refresh data to get permanent IDs
              window.location.reload();
            }}
          />
        </div>
      )}

      {isInitialLoading && (
        <div className="fixed inset-0 z-40 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-5"></div>
        </div>
      )}
    </div>
  );
}
