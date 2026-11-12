'use client';

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ProfileVariant = 'default' | 'major' | 'general';

interface ProfileAvatarProps {
  className?: string;
  /** default: 선택 안 됨, major/general: 선택된 상태(주황 테두리 + 이름표 고정) */
  variant?: ProfileVariant;
  name?: string;
  major?: string;
  /** 이름표 문구. 없으면 variant에 따라 `이름 / 전공` 또는 `이름` */
  label?: string;
  imageSrc?: string | null;
  imageAlt?: string;
  /** 넘기면 버튼으로 렌더링한다. */
  onClick?: () => void;
}

const DEFAULT_PROFILE_IMAGE = '/assets/images/profile_image.png';
const AVATAR_SIZE = 47;
/** 이름표가 영역 가장자리에서 띄울 최소 간격 */
const EDGE_GAP = 16;
/** 이름표가 넘지 않을 영역. 가장 가까운 조상에 이 속성이 없으면 화면 너비 기준. */
export const PROFILE_BOUNDS_ATTR = 'data-profile-bounds';
/** 바깥 클릭 판별용으로 아바타 루트에 붙는 속성 */
export const PROFILE_AVATAR_ATTR = 'data-profile-avatar';

export default function ProfileAvatar({
  className,
  variant = 'default',
  name = '',
  major,
  label,
  imageSrc,
  imageAlt,
  onClick,
}: ProfileAvatarProps) {
  const selected = variant !== 'default';
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  const badgeText = label ?? (variant === 'major' && major ? `${name} / ${major}` : name);

  const rootRef = useRef<HTMLElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const [shift, setShift] = useState(0);

  // 이름표는 아바타 가운데 기준이라 줄 끝 아바타에서는 영역 밖으로 나간다. 넘치는 만큼 안쪽으로 민다.
  const measure = useCallback(() => {
    const root = rootRef.current;
    const badge = badgeRef.current;
    if (!root || !badge) return;
    const rootRect = root.getBoundingClientRect();
    const boundsEl = root.closest(`[${PROFILE_BOUNDS_ATTR}]`);
    const boundsRect = boundsEl?.getBoundingClientRect();
    const minLeft = (boundsRect?.left ?? 0) + EDGE_GAP;
    const maxRight = (boundsRect?.right ?? window.innerWidth) - EDGE_GAP;
    const width = badge.offsetWidth;
    const left = rootRect.left + AVATAR_SIZE / 2 - width / 2;
    const right = left + width;
    if (left < minLeft) setShift(minLeft - left);
    else if (right > maxRight) setShift(maxRight - right);
    else setShift(0);
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, badgeText, measure]);

  // 마우스일 때만 호버로 이름표를 보인다(터치는 탭 = 선택으로 처리).
  const hoverHandlers = {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHovered(true);
    },
    onPointerLeave: () => setHovered(false),
  };

  const content = (
    <>
      <div
        className={cn(
          'relative h-[47px] w-[47px] overflow-hidden rounded-full',
          active && 'ring-2 ring-orange-5 ring-offset-0'
        )}
      >
        <Image
          src={imageSrc || DEFAULT_PROFILE_IMAGE}
          alt={imageAlt ?? `${name} 프로필 이미지`}
          fill
          unoptimized
          sizes="47px"
          className="object-cover"
        />
      </div>

      {active && badgeText ? (
        <div
          ref={badgeRef}
          className={cn(
            'absolute left-1/2 top-[53px] flex h-[26px] items-center justify-center rounded-[8px] border border-orange-3 bg-neutral-2 px-[10px] py-1',
            hovered && !selected ? 'z-20' : 'z-10'
          )}
          style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
        >
          <span className="whitespace-nowrap text-[11px] leading-[1.5] text-neutral-10">{badgeText}</span>
        </div>
      ) : null}
    </>
  );

  const rootClassName = cn('relative inline-block h-[47px] w-[47px] shrink-0 overflow-visible', className);
  const rootProps = { [PROFILE_AVATAR_ATTR]: '', className: rootClassName, ...hoverHandlers };

  if (onClick) {
    return (
      <button
        ref={(el) => {
          rootRef.current = el;
        }}
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={`${name} 프로필 ${selected ? '닫기' : '보기'}`}
        {...rootProps}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
      }}
      {...rootProps}
    >
      {content}
    </div>
  );
}
