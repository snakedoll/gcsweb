import { useRef, useState } from 'react';
import type { SalesManagementService } from '@/lib/services/sales-management-service';
import type { SalesStore, StoreFormInput } from '@/types/sales-management';

type IdentifierStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

const initialInput: StoreFormInput = { name: '', storeIdentifier: '' };

function validateStoreInput(input: StoreFormInput, v2: boolean) {
  const errors: Partial<Record<keyof StoreFormInput, string>> = {};

  if (input.name.trim().length < 2) {
    errors.name = '상점명은 2자 이상 입력해주세요.';
  }

  if (!(v2 ? /^[a-z0-9]{4,20}$/ : /^[a-z0-9-]{3,20}$/).test(input.storeIdentifier)) {
    errors.storeIdentifier = v2 ? '영문 소문자와 숫자로 4~20자 입력해주세요.' : '영문 소문자, 숫자, 하이픈으로 3~20자 입력해주세요.';
  }

  return errors;
}

export function useStoreForm(service: Pick<SalesManagementService, 'checkStoreIdentifier' | 'saveStore'>,
  initialStore: SalesStore | null = null, v2 = false, onSaved?: (store: SalesStore) => void) {
  const [input, setInput] = useState<StoreFormInput>(initialStore ? { name: initialStore.name, storeIdentifier: initialStore.storeIdentifier } : initialInput);
  const [errors, setErrors] = useState<Partial<Record<keyof StoreFormInput, string>>>({});
  const [identifierStatus, setIdentifierStatus] = useState<IdentifierStatus>(initialStore ? 'available' : 'idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredStore, setRegisteredStore] = useState<SalesStore | null>(initialStore);
  const version = useRef(0);
  const busy = useRef(false);

  const updateInput = (field: keyof StoreFormInput, value: string) => {
    const nextValue = field === 'storeIdentifier' ? value.toLowerCase() : value;

    setInput((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
    if (field === 'storeIdentifier') {
      version.current += 1;
      setIdentifierStatus(nextValue === registeredStore?.storeIdentifier ? 'available' : 'idle');
    }
  };

  const checkIdentifier = async () => {
    const identifierError = validateStoreInput(input, v2).storeIdentifier;
    if (identifierError) {
      setErrors((current) => ({ ...current, storeIdentifier: identifierError }));
      return;
    }

    const checkedVersion = version.current;
    setErrors(current => ({ ...current, storeIdentifier: undefined }));
    setIdentifierStatus('checking');
    setSubmitError(null);

    try {
      const isAvailable = await service.checkStoreIdentifier(input.storeIdentifier);
      if (version.current !== checkedVersion) return;
      setIdentifierStatus(isAvailable ? 'available' : 'unavailable');
      if (!isAvailable) {
        setErrors((current) => ({ ...current, storeIdentifier: '이미 사용 중인 상점 아이디입니다.' }));
      }
    } catch (error) {
      if (version.current !== checkedVersion) return;
      setIdentifierStatus('error');
      setErrors((current) => ({
        ...current,
        storeIdentifier:
          error instanceof Error ? error.message : '아이디 확인 중 오류가 발생했습니다.',
      }));
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    const nextErrors = validateStoreInput(input, v2);
    if (identifierStatus !== 'available') {
      nextErrors.storeIdentifier ??= '상점 아이디 중복 확인을 해주세요.';
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    busy.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await service.saveStore(input);
      setRegisteredStore(saved);
      onSaved?.(saved);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '상점 등록에 실패했습니다.');
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  };

  return { input, errors, identifierStatus, submitError, isSubmitting, registeredStore, setRegisteredStore, updateInput, checkIdentifier, submit };
}
