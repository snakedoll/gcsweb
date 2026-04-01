'use client';

import { NavBar } from '@/components/layout';
import { MenuSection } from '@/components/ui';
import { useUser } from '@/hooks/useUser';
import { signOut } from 'next-auth/react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

async function resizeImageFile(file: File, maxWidth = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = img.width / img.height;
      const width = Math.min(img.width, maxWidth);
      const height = Math.round(width / ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Blob conversion failed'));
        URL.revokeObjectURL(url);
      }, file.type || 'image/jpeg', 0.9);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

interface StatusCardProps {
  href: string;
  iconSrc: string;
  label: string;
  count: number;
}

function StatusCard({ href, iconSrc, label, count }: StatusCardProps) {
  return (
    <Link
      href={href}
      className="flex h-20 w-[109px] flex-col items-center justify-center gap-2 rounded-lg border border-neutral-5 bg-neutral-1"
    >
      <NextImage
        src={iconSrc}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 [filter:brightness(0)_saturate(100%)_invert(61%)_sepia(8%)_saturate(145%)_hue-rotate(336deg)_brightness(91%)_contrast(86%)]"
      />
      <p className="typo-body-xsmall text-neutral-9">
        {label}
        {typeof count === 'number' && count > 0 && <span className="text-orange-5"> {count}</span>}
      </p>
    </Link>
  );
}

export default function MypagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, profile, isLoading, isAuthenticated, update } = useUser();
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [scrapsCount, setScrapsCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // 마이페이지 전용 정보(카운트 등) API 호출
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const fetchMypageInfo = async () => {
      try {
        const res = await fetch('/api/v1/mypage/info', { cache: 'no-store' });
        if (res.status === 401) {
          signOut({ callbackUrl: '/login' });
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            setNotificationCount(json.data.notificationCount || 0);
            setLikesCount(json.data.likeCount || 0);
            setScrapsCount(json.data.scrapCount || 0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch mypage info:', err);
      }
    };

    fetchMypageInfo();
  }, [isAuthenticated, isLoading]);

  // Handle file selection directly (no preview modal)
  useEffect(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.profile-image-input'));
    if (inputs.length === 0) return;

    const handler = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0] ?? null;
      if (!file) return;

      // Start upload immediately
      try {
        const resizedBlob = await resizeImageFile(file, 1024);
        const formData = new FormData();
        formData.append('image', new File([resizedBlob], file.name, { type: file.type }));

        const uploadRes = await fetch('/api/v1/images?usage=PROFILE', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const json = await uploadRes.json().catch(() => ({}));
          alert(json?.message || '이미지 업로드에 실패했습니다.');
          return;
        }

        const uploadJson = await uploadRes.json();
        const imageUrl = uploadJson?.data?.imageUrl;
        if (!imageUrl) {
          alert('업로드한 이미지 URL을 받아오지 못했습니다.');
          return;
        }

        const res = await fetch('/api/v1/mypage/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImageUrl: imageUrl }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alert(json?.message || '프로필 이미지 업데이트에 실패했습니다.');
          return;
        }

        // React Query 캐시 초기화 및 UI 즉시 업데이트 
        await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
        if (update) {
          await update();
        }
        router.refresh();
      } catch (err) {
        console.error(err);
        alert('업로드 중 오류가 발생했습니다.');
      }
      target.value = '';
    };

    for (const input of inputs) input.addEventListener('change', handler);
    return () => {
      for (const input of inputs) input.removeEventListener('change', handler);
    };
  }, [router, queryClient, update]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p className="typo-body-xsmall text-neutral-7">로딩 중...</p>
      </div>
    );
  }

  const displayName = profile?.name ?? profile?.nickname ?? profile?.email ?? '사용자';
  const roleLabel = profile?.memberType === 2 || profile?.role === 'admin'
    ? '관리자'
    : profile?.memberType === 1
      ? '전공 회원'
      : '일반 회원';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-[375px] flex-1 px-4 pt-6">
        <section className="mb-5">
          <div className="flex items-center gap-6 px-2">
            <div className="relative h-[100px] w-[100px]">
              <div className="relative h-[100px] w-[100px] overflow-hidden rounded-full bg-neutral-4">
                {profile?.profileImage ? (
                  <NextImage src={profile.profileImage} alt="프로필" fill unoptimized className="object-cover" sizes="100px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <NextImage src="/assets/images/profile_image.png" alt="" fill className="object-cover" sizes="100px" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden profile-image-input"
                id="profile-image-input-library"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden profile-image-input"
                id="profile-image-input-camera"
              />
              <input
                type="file"
                accept="*/*"
                className="hidden profile-image-input"
                id="profile-image-input-file"
              />

              <button
                type="button"
                aria-label="프로필 이미지 변경"
                onClick={() => setShowImagePicker(true)}
                className="absolute inset-0 w-full h-full rounded-full border-none"
              >
                <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-neutral-3 bg-neutral-12">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path d="M10.1416 2.25C11.0414 2.2501 11.8544 2.78635 12.209 3.61328L12.4414 4.15527C12.6284 4.59156 13.0576 4.87483 13.5322 4.875C15.171 4.875 16.5 6.20396 16.5 7.84277V11.625C16.5 13.6961 14.8211 15.375 12.75 15.375H5.25C3.17893 15.375 1.5 13.6961 1.5 11.625V7.84277C1.5 6.20396 2.82896 4.875 4.46777 4.875C4.94241 4.87483 5.37161 4.59156 5.55859 4.15527L5.79102 3.61328C6.14565 2.78635 6.95861 2.2501 7.8584 2.25H10.1416ZM9 6.5625C7.4467 6.5625 6.1875 7.8217 6.1875 9.375C6.1875 10.9283 7.4467 12.1875 9 12.1875C10.5533 12.1875 11.8125 10.9283 11.8125 9.375C11.8125 7.8217 10.5533 6.5625 9 6.5625ZM9 7.6875C9.93198 7.6875 10.6875 8.44302 10.6875 9.375C10.6875 10.307 9.93198 11.0625 9 11.0625C8.06802 11.0625 7.3125 10.307 7.3125 9.375C7.3125 8.44302 8.06802 7.6875 9 7.6875Z" fill="#FDFDFD" />
                  </svg>
                </span>
              </button>

              {/* Action sheet for choosing source (Figma-style) */}
              {showImagePicker && (
                <div className="fixed inset-0 flex items-end justify-center">
                  <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowImagePicker(false)} />

                  <div className="w-full max-w-md px-4 pb-6 relative z-50">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg relative z-50">
                      <button
                        className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                        onClick={() => {
                          setShowImagePicker(false);
                          document.getElementById('profile-image-input-library')?.click();
                        }}
                      >사진 보관함</button>
                      <div className="h-px bg-neutral-4" />

                      <button
                        className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                        onClick={() => {
                          setShowImagePicker(false);
                          document.getElementById('profile-image-input-camera')?.click();
                        }}
                      >사진 찍기</button>
                      <div className="h-px bg-neutral-4" />

                      <button
                        className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                        onClick={() => {
                          setShowImagePicker(false);
                          document.getElementById('profile-image-input-file')?.click();
                        }}
                      >파일 선택</button>
                    </div>

                    <div className="mt-3 bg-white rounded-xl overflow-hidden shadow-lg relative z-50">
                      <button
                        className="w-full py-4 text-center text-neutral-7 bg-white"
                        onClick={() => setShowImagePicker(false)}
                      >취소하기</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="typo-heading-medium text-neutral-12">{displayName}</p>
              <p className="typo-body-small text-neutral-7">{roleLabel}</p>
            </div>
          </div>
        </section>

        <section className="mb-3 flex items-center justify-center gap-[7px]">
          <StatusCard href="/mypage/notifications" iconSrc="/assets/icons/icon-bell.svg" label="알림" count={notificationCount} />
          <StatusCard href="/mypage/likes" iconSrc="/assets/icons/icon-heart.svg" label="찜한 상품" count={likesCount} />
          <StatusCard href="/mypage/scraps" iconSrc="/assets/icons/icon-bookmark.svg" label="스크랩" count={scrapsCount} />
        </section>

        <div className="space-y-3">
          <MenuSection
            title="나의 쇼핑 정보"
            items={[
              { label: '주문 내역', href: '/mypage/orders' },
              { label: '상품 리뷰', href: '/mypage/reviews' },
            ]}
          />
          <MenuSection
            title="나의 판매 정보"
            items={[
              { label: '내가 등록한 상품', href: '/mypage/my-products' },
              { label: '나의 판매 활동', href: '/mypage/sales' },
            ]}
          />
          <MenuSection title="고객센터" items={[{ label: '문의하기', href: '/mypage/inquiries' }]} />
        </div>
      </main>
    </div>
  );
}
