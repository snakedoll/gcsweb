'use client';

import { useEffect, useState } from 'react';
import TermsDetailLayout from '@/app/terms/TermsDetailLayout';

export default function MembershipTermsPage() {
  const [termsText, setTermsText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch('/api/v1/terms?type=homepage');
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
          setTermsText('약관 내용이 없습니다.');
        }
      } catch (e) {
        setTermsText('약관 내용이 없습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  if (loading) return null;

  return <TermsDetailLayout title="홈페이지 이용약관" text={termsText} />;
}
