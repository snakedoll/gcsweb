'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';

type SalesRow = {
  day: number;
  periodLabel: string;
  date: string;
  salesAmount: number;
  cumulativeSalesAmount: number;
};

type SalesResponse = {
  status: 'success' | 'error';
  data?: {
    startDate: string;
    days: number;
    rows: SalesRow[];
  };
};

type StockRow = {
  qrItemId: string;
  initStock: number;
  stock: number;
  initStockMinusStock: number;
  currentStock: number;
};

type StockResponse = {
  status: 'success' | 'error';
  data?: {
    rows: StockRow[];
  };
};

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR');
}

function SalesHeader() {
  return (
    <div className="flex w-full items-center rounded-tl-[8px] rounded-tr-[9px] bg-[#3F3835]">
      <div className="w-[106px] px-3 pb-2 pt-4">
        <p className="typo-body-xsmall-bold text-white">기간</p>
      </div>
      <div className="w-[110px] px-2 pb-2 pt-4">
        <p className="typo-body-xsmall-bold text-white">매출액</p>
      </div>
      <div className="w-[110px] px-3 pb-2 pt-4">
        <p className="typo-body-xsmall-bold text-white">누적 매출액</p>
      </div>
    </div>
  );
}

function SalesRowItem({ row }: { row: SalesRow }) {
  const shouldHideCumulative = row.day === 4 && row.salesAmount === 0;

  return (
    <div className="flex w-full items-center border-b border-t border-[#DDDCDB] bg-white">
      <div className="w-[106px] p-3">
        <p className="typo-body-xsmall text-black">{row.periodLabel}</p>
      </div>
      <div className="w-[110px] px-2 py-3">
        <p className="typo-body-xsmall text-black">{formatAmount(row.salesAmount)}</p>
      </div>
      <div className="w-[110px] px-2 py-3">
        <p className="typo-body-xsmall text-black">
          {shouldHideCumulative ? '-' : formatAmount(row.cumulativeSalesAmount)}
        </p>
      </div>
    </div>
  );
}

function StockHeader() {
  return (
    <div className="flex w-full items-center rounded-tl-[8px] rounded-tr-[9px] bg-[#3F3835]">
      <div className="w-[106px] px-3 pb-2 pt-4">
        <p className="typo-body-xsmall-bold text-white">상품명</p>
      </div>
      <div className="w-[55px] px-2 pb-2 pt-4 text-center">
        <p className="typo-body-xsmall-bold text-white">초기재고</p>
      </div>
      <div className="w-[55px] px-2 pb-2 pt-4 text-center">
        <p className="typo-body-xsmall-bold text-white">현재고</p>
      </div>
      <div className="w-[55px] px-2 pb-2 pt-4 text-center">
        <p className="typo-body-xsmall-bold text-white">주문수</p>
      </div>
      <div className="w-[72px] px-2 pb-2 pt-4 text-center">
        <p className="typo-body-xsmall-bold text-white">품절시도수</p>
      </div>
    </div>
  );
}

function StockRowItem({ row }: { row: StockRow }) {
  return (
    <div className="flex w-full items-stretch border-b border-t border-[#DDDCDB] bg-white">
      <div className="w-[106px] p-3">
        <p className="break-all whitespace-normal typo-body-xsmall text-black">
          {row.qrItemId}
        </p>
      </div>
      <div className="w-[55px] px-2 py-3">
        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-center typo-body-xsmall text-black">
          {row.initStock}
        </p>
      </div>
      <div className="w-[55px] px-2 py-3">
        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-center typo-body-xsmall text-black">
          {row.stock}
        </p>
      </div>
      <div className="w-[55px] px-2 py-3">
        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-center typo-body-xsmall text-black">
          {row.initStockMinusStock}
        </p>
      </div>
      <div className="w-[72px] px-2 py-3">
        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-center typo-body-xsmall text-black">
          {row.currentStock}
        </p>
      </div>
    </div>
  );
}

export default function AdminDataPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [salesRes, stockRes] = await Promise.all([
          fetch('/api/v1/admin/data/sales?days=4', { cache: 'no-store' }),
          fetch('/api/v1/admin/data/stock', { cache: 'no-store' }),
        ]);

        const salesJson = (await salesRes.json()) as SalesResponse;
        const stockJson = (await stockRes.json()) as StockResponse;

        if (salesJson.status === 'success' && Array.isArray(salesJson.data?.rows)) {
          setSalesRows(salesJson.data.rows);
        } else {
          setSalesRows([]);
        }

        if (stockJson.status === 'success' && Array.isArray(stockJson.data?.rows)) {
          setStockRows(stockJson.data.rows);
        } else {
          setStockRows([]);
        }
      } catch (error) {
        console.error('Failed to fetch admin data page resources:', error);
        setSalesRows([]);
        setStockRows([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const hasSalesRows = useMemo(() => salesRows.length > 0, [salesRows]);
  const hasStockRows = useMemo(() => stockRows.length > 0, [stockRows]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <div className="mx-auto flex w-full max-w-[375px] flex-1 flex-col bg-neutral-3">
        <NavBar variant="title-back" title="데이터" onBack={() => router.push('/admin')} />

        <div className="flex flex-col gap-6 px-4 py-6">
          <section className="flex w-full flex-col">
            <SalesHeader />
            {loading ? (
              <div className="border-b border-[#DDDCDB] bg-white px-3 py-6 text-center typo-body-xsmall text-neutral-7">
                불러오는 중...
              </div>
            ) : hasSalesRows ? (
              salesRows.map((row) => <SalesRowItem key={`${row.periodLabel}-${row.date}`} row={row} />)
            ) : (
              <div className="border-b border-[#DDDCDB] bg-white px-3 py-6 text-center typo-body-xsmall text-neutral-7">
                데이터가 없습니다.
              </div>
            )}
          </section>

          <section className="flex w-full flex-col">
            <StockHeader />
            {loading ? (
              <div className="border-b border-[#DDDCDB] bg-white px-3 py-6 text-center typo-body-xsmall text-neutral-7">
                불러오는 중...
              </div>
            ) : hasStockRows ? (
              stockRows.map((row) => <StockRowItem key={row.qrItemId} row={row} />)
            ) : (
              <div className="border-b border-[#DDDCDB] bg-white px-3 py-6 text-center typo-body-xsmall text-neutral-7">
                데이터가 없습니다.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

