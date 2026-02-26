'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import StepProgress from '@/components/ui/admin/product/StepProgress';
import SearchselectDropdown from '@/components/ui/common/SearchselectDropdown';
import TextField from '@/components/ui/common/TextField';

type ProductType = 0 | 1 | 2;

type RegisterRequestItem = {
  requestId: string;
  teamId: string;
  teamName: string;
  type: ProductType;
  name: string;
  description: string;
};

type RegisterRequestListResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    requests?: RegisterRequestItem[];
  };
};

type FormFieldState = 'default' | 'focus' | 'filled' | 'error';
type TeamDropdownVariant = 'Default' | 'searching' | 'empty';

const TEAM_NAME_MAX = 17;
const PRODUCT_NAME_MAX = 13;
const PRODUCT_DESC_MAX = 17;

const TEAM_OPTIONS = ['염사모', 'MUA', 'HUSH', '그린무브', '커피지구단'];

function ChevronDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="#999694"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function limitCaption(length: number, max: number) {
  return `${length}/${max}`;
}

export default function AdminRegisterRequestStep1PartialPage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? '');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const [teamQuery, setTeamQuery] = useState('');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'team' | 'name' | 'description' | null>(null);

  const teamFieldWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/admin/product/request/register/list', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as RegisterRequestListResponse;

        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message ?? '등록 요청 정보를 불러오지 못했습니다.');
        }

        const item = (json.data?.requests ?? []).find((row) => row.requestId === requestId);

        if (!cancelled) {
          if (item) {
            setTeamName(item.teamName ?? '');
            setProductName(item.name ?? '');
            setProductDescription(item.description ?? '');
          }
          setLoadError(item ? null : '등록 요청 정보를 찾을 수 없습니다.');
        }
      } catch (error: any) {
        console.error(error);
        if (!cancelled) setLoadError(error?.message ?? '등록 요청 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!teamFieldWrapRef.current) return;
      if (!teamFieldWrapRef.current.contains(event.target as Node)) {
        setTeamDropdownOpen(false);
        setFocusedField((prev) => (prev === 'team' ? null : prev));
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  const teamError = teamName.length > TEAM_NAME_MAX;
  const nameError = productName.length > PRODUCT_NAME_MAX;
  const descriptionError = productDescription.length > PRODUCT_DESC_MAX;

  const filteredTeamOptions = useMemo(() => {
    const keyword = teamQuery.trim().toLowerCase();
    if (!keyword) return TEAM_OPTIONS;
    return TEAM_OPTIONS.filter((team) => team.toLowerCase().includes(keyword));
  }, [teamQuery]);

  const teamDropdownVariant: TeamDropdownVariant = !teamQuery.trim()
    ? 'Default'
    : filteredTeamOptions.length > 0
      ? 'searching'
      : 'empty';

  const teamTextFieldState: FormFieldState = teamError
    ? 'error'
    : focusedField === 'team'
      ? 'focus'
      : teamName.trim()
        ? 'filled'
        : 'default';
  const nameTextFieldState: FormFieldState = nameError
    ? 'error'
    : focusedField === 'name'
      ? 'focus'
      : productName.trim()
        ? 'filled'
        : 'default';
  const descriptionTextFieldState: FormFieldState = descriptionError
    ? 'error'
    : focusedField === 'description'
      ? 'focus'
      : productDescription.trim()
        ? 'filled'
        : 'default';

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col justify-between bg-neutral-3">
        <div className="flex flex-col">
          <NavBar variant="title-back" title="새 상품 등록" />

          <div className="flex items-center justify-center px-[148px] py-[14px]">
            <div className="flex items-center gap-[14px]">
              <StepProgress status="current" />
              <StepProgress status="skipped" />
              <StepProgress status="upcoming" />
            </div>
          </div>

          <div className="px-4">
            {loading ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-neutral-8">등록 요청 정보를 불러오는 중...</p>
              </div>
            ) : loadError ? (
              <div className="py-8 text-center">
                <p className="typo-body-small text-danger">{loadError}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div ref={teamFieldWrapRef} className="relative">
                  <TextField
                    id="register-request-team"
                    label="판매팀"
                    showStar
                    state={teamTextFieldState}
                    inputProps={{
                      value: teamName,
                      onFocus: () => {
                        setFocusedField('team');
                        setTeamDropdownOpen(true);
                      },
                      onBlur: () => {
                        // blur close는 바깥 클릭 핸들러에서 처리. 항목 클릭 시 blur가 먼저 발생해도 선택 가능하도록 유지
                      },
                      onChange: (e) => {
                        const nextValue = e.target.value;
                        setTeamName(nextValue);
                        setTeamQuery(nextValue);
                        setFocusedField('team');
                        setTeamDropdownOpen(true);
                      },
                    }}
                    rightSlot={<ChevronDownIcon />}
                    caption={limitCaption(teamName.length, TEAM_NAME_MAX)}
                    captionClassName={cn('text-right', teamError ? 'text-danger' : 'text-neutral-8')}
                  />

                  {teamDropdownOpen ? (
                    <div className="absolute left-0 top-[74px] z-10">
                      <SearchselectDropdown
                        className="w-[343px] shadow-[0_2px_8px_rgba(47,40,36,0.08)]"
                        variant={teamDropdownVariant}
                        placeholder="판매팀 검색"
                        query={teamQuery}
                        items={filteredTeamOptions}
                        emptyText="검색 결과가 없습니다."
                        onItemClick={(item) => {
                          setTeamName(item);
                          setTeamQuery(item);
                          setTeamDropdownOpen(false);
                          setFocusedField(null);
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <TextField
                  id="register-request-name"
                  label="상품명"
                  showStar
                  state={nameTextFieldState}
                  inputProps={{
                    value: productName,
                    onFocus: () => setFocusedField('name'),
                    onBlur: () => setFocusedField((prev) => (prev === 'name' ? null : prev)),
                    onChange: (e) => setProductName(e.target.value),
                  }}
                  caption={limitCaption(productName.length, PRODUCT_NAME_MAX)}
                  captionClassName={cn('text-right', nameError ? 'text-danger' : 'text-neutral-8')}
                />

                <TextField
                  id="register-request-description"
                  label="상품 설명"
                  showStar
                  state={descriptionTextFieldState}
                  inputProps={{
                    value: productDescription,
                    onFocus: () => setFocusedField('description'),
                    onBlur: () => setFocusedField((prev) => (prev === 'description' ? null : prev)),
                    onChange: (e) => setProductDescription(e.target.value),
                  }}
                  caption={limitCaption(productDescription.length, PRODUCT_DESC_MAX)}
                  captionClassName={cn('text-right', descriptionError ? 'text-danger' : 'text-neutral-8')}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-8 pt-[17px]">
          <button
            type="button"
            onClick={() => router.push(`/admin/product/request/register/${requestId}/step-2`)}
            className="flex w-full items-center justify-center rounded-lg bg-orange-5 p-4"
          >
            <span className="typo-body-small-bold text-neutral-2">다음</span>
          </button>
        </div>
      </div>
    </div>
  );
}
