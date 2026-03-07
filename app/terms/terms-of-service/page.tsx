'use client';

import { useEffect, useState } from 'react';
import TermsDetailLayout from '@/app/terms/TermsDetailLayout';

export default function TermsOfServicePage() {
  const [termsText, setTermsText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch('/api/v1/terms?type=service');
        const json = await res.json();
        if (json.status === 'success' && json.data.length > 0) {
          const joined = json.data
            .map((item: any) => {
              const parts = [];
              if (item.mainTitle) parts.push(item.mainTitle);
              if (item.subTitle) parts.push(item.subTitle);
              if (item.body) parts.push(item.body);
              return parts.join('\n');
            })
            .join('\n\n');
          setTermsText(joined);
        } else {
          setTermsText(DEFAULT_SERVICE_TERMS);
        }
      } catch (e) {
        setTermsText(DEFAULT_SERVICE_TERMS);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  if (loading) return null;

  return <TermsDetailLayout title="서비스 이용약관" text={termsText} />;
}

const DEFAULT_SERVICE_TERMS = `제1장 총칙

제1조 목적
본 약관은 서비스 이용과 관련한 제반 사항을 규정함을 목적으로 합니다.`;
