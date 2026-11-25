'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/button/Button';
import { getAnalyticsDayButtons, type ProductAnalyticsService } from '@/lib/services/product-analytics-service';
import type { ProductAnalyticsEventDraft, ProductAnalyticsGroup, ProductAnalyticsReport } from '@/types/product-analytics';
import { useProductAnalyticsService } from '../SalesManagementV2Provider';
import { LandingDialog } from '../VisitorQrDialog';
import styles from './analytics.module.css';

const groupLabels: Record<ProductAnalyticsGroup, { control: string; column: string }> = {
  product: { control: '상품별', column: '상품명' },
  option: { control: '옵션별', column: '옵션명' },
  category: { control: '카테고리별', column: '카테고리' },
};
const numberFormat = new Intl.NumberFormat('ko-KR');
const weekdayFormat = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' });
const defaultYear = '2026';
const pageSize = 10;

function dayLabel(date: string) {
  const weekday = weekdayFormat.format(new Date(`${date}T00:00:00Z`));
  return `${date.slice(5).replace('-', '.')} (${weekday})`;
}

export default function ProductAnalyticsPage() {
  const service = useProductAnalyticsService();
  return <ProductAnalyticsScreen service={service} />;
}

export function ProductAnalyticsScreen({ service }: { service: ProductAnalyticsService }) {
  const [events, setEvents] = useState(() => service.listEvents());
  const [year, setYear] = useState(defaultYear);
  const [eventId, setEventId] = useState('');
  const [day, setDay] = useState('');
  const [group, setGroup] = useState<ProductAnalyticsGroup>('product');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [addingEvent, setAddingEvent] = useState(false);
  const years = [...new Set([defaultYear, '2025', ...events.map(event => event.startDate.slice(0, 4))])].sort().reverse();
  const yearEvents = events.filter(event => event.startDate.startsWith(year));
  const selectedEvent = yearEvents.find(event => event.id === eventId) ?? yearEvents[0];
  const days = selectedEvent ? getAnalyticsDayButtons(selectedEvent) : [];
  const range = day ? { startDate: day, endDate: day } : selectedEvent;
  const report = range ? service.getReport(range, group) : undefined;

  function resetDay() {
    setDay('');
    setVisibleCount(pageSize);
  }

  function addEvent(draft: ProductAnalyticsEventDraft) {
    const event = service.addEvent(draft);
    setEvents(service.listEvents());
    setYear(event.startDate.slice(0, 4));
    setEventId(event.id);
    resetDay();
    setAddingEvent(false);
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/sales-management/v2" aria-label="판매 관리 홈으로">
        <Image src="/assets/sales-management/v2/products/back.svg" alt="" width={28} height={28} />
      </Link>
      <h1>데이터 관리</h1>
      <select aria-label="행사 연도" className={styles.year} value={year} onChange={event => {
        setYear(event.target.value);
        setEventId('');
        resetDay();
      }}>
        {years.map(value => <option value={value} key={value}>{value}년도</option>)}
      </select>
    </header>
    <main className={styles.main}>
      <div className={styles.sections}>
        <button type="button" disabled>매출 분석</button>
        <h2>상품 분석</h2>
      </div>
      {selectedEvent && report ? <>
        <div className={styles.filters}>
          <div className={styles.days} role="group" aria-label="행사 날짜">
            <Button type="button" size="s" color={day ? 'white' : 'orange'} status={day ? 'default' : 'activated'}
              aria-pressed={!day} onClick={resetDay}>전체</Button>
            {!days.length && <input type="date" className={styles.dayInput} aria-label="행사 날짜 선택"
              value={day} min={selectedEvent.startDate} max={selectedEvent.endDate} onChange={event => {
                if (!event.currentTarget.validity.valid) return;
                setDay(event.target.value);
                setVisibleCount(pageSize);
              }} />}
            {days.map(date => <Button key={date} type="button" size="s" color={day === date ? 'orange' : 'white'}
              status={day === date ? 'activated' : 'default'} aria-pressed={day === date} onClick={() => {
                setDay(date);
                setVisibleCount(pageSize);
              }}>{dayLabel(date)}</Button>)}
          </div>
          {(yearEvents.length > 1 || year !== defaultYear) && <select className={styles.eventSelect} aria-label="행사 선택"
            value={selectedEvent.id} onChange={event => { setEventId(event.target.value); resetDay(); }}>
            {yearEvents.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>}
          <button className={styles.addEvent} aria-label="행사 추가하기" type="button" onClick={() => setAddingEvent(true)}>
            <Image src="/assets/sales-management/v2/analytics/plus.svg" alt="" width={30} height={30} />
          </button>
        </div>
        <div className={styles.reports}>
          <section className={styles.report} aria-labelledby="product-report-title">
            <div className={styles.reportHeading}>
              <h3 id="product-report-title">상품 및 카테고리 분석</h3>
              <div className={styles.groups} role="group" aria-label="상품 분석 기준">
                {(Object.keys(groupLabels) as ProductAnalyticsGroup[]).map(value =>
                  <button key={value} type="button" aria-pressed={group === value} onClick={() => {
                    setGroup(value);
                    setVisibleCount(pageSize);
                  }}>{groupLabels[value].control}</button>)}
              </div>
            </div>
            {report.rows.length ? <>
              <ProductReportTable report={report} group={group} visibleCount={visibleCount} />
              <p className={styles.note}>판매량 내림차순 → 동률이면 순매출 내림차순 · 판매량 0 이하 항목 제외 · 매출 비중은 전체 순매출 기준</p>
              {visibleCount < report.rows.length && <Button type="button" size="s" color="white" className={styles.more}
                onClick={() => setVisibleCount(count => count + pageSize)}>더보기 ({report.rows.length - visibleCount}개)</Button>}
            </> : <p className={styles.noData} role="status">선택한 기간에 판매 데이터가 없어요.</p>}
          </section>
          <BundleReport report={report} />
        </div>
      </> : <section className={styles.empty}>
        <div className={styles.calendarBox} aria-hidden="true">
          <span className={styles.calendar}><span /></span>
        </div>
        <h3>데이터를 조회하고 싶은 행사를 추가해주세요</h3>
        <p>기간을 설정해 행사를 추가하면 매출 현황을 확인할 수 있어요</p>
        <Button type="button" color="orange" size="m" onClick={() => setAddingEvent(true)}>행사 추가하기</Button>
      </section>}
    </main>
    {addingEvent && <EventDialog onDismiss={() => setAddingEvent(false)} onAdd={addEvent} />}
  </div>;
}

function ProductReportTable({ report, group, visibleCount }: {
  report: ProductAnalyticsReport; group: ProductAnalyticsGroup; visibleCount: number;
}) {
  return <div className={styles.tableScroll} role="region" aria-labelledby="product-report-title" tabIndex={0}>
    <table className={styles.productTable} aria-labelledby="product-report-title">
      <thead><tr><th scope="col">순위</th><th scope="col">{groupLabels[group].column}</th><th scope="col">판매량</th>
        <th scope="col">순매출</th><th scope="col">할인액</th><th scope="col">매출 비중</th></tr></thead>
      <tbody>
        {report.rows.slice(0, visibleCount).map((row, index) => <tr key={row.name}>
          <td><span className={styles.rank} data-best={index === 0}>{index + 1}</span></td>
          <th scope="row">{row.name}{index === 0 && <span className={styles.best}>BEST</span>}</th>
          <td><span className={styles.quantity}>
            <span className={styles.barTrack} aria-hidden="true">
              <span style={{ width: `${row.quantity * 100 / report.rows[0].quantity}%` }} />
            </span>{numberFormat.format(row.quantity)}개
          </span></td>
          <td>{numberFormat.format(row.netSales)}원</td>
          <td>{numberFormat.format(row.discount ? -row.discount : 0)}원</td>
          <td>{row.share.toFixed(1)}%</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function BundleReport({ report }: { report: ProductAnalyticsReport }) {
  return <section className={styles.report} aria-labelledby="bundle-report-title">
    <div className={styles.reportHeading}>
      <h3 id="bundle-report-title">많이 팔린 조합 상품</h3>
      <p className={styles.note}>같은 주문에 함께 담긴 상품 쌍 · 주문 건수 기준 Top 10</p>
    </div>
    {report.bundles.length ? <table className={styles.bundles} aria-labelledby="bundle-report-title">
      <thead><tr><th scope="col">순위</th><th scope="col">상품 조합</th><th scope="col">함께 주문된 건수</th></tr></thead>
      <tbody>{report.bundles.map(({ names, orders, rank }) => <tr key={names.join('/')}>
        <td><span className={styles.rank}>{rank}</span></td>
        <th scope="row"><span className={styles.bundleNames}><span>{names[0]}</span> + <span>{names[1]}</span></span></th>
        <td>{numberFormat.format(orders)}건</td>
      </tr>)}</tbody>
    </table> : <p className={styles.noData}>함께 판매된 상품 조합이 없어요.</p>}
  </section>;
}

function EventDialog({ onDismiss, onAdd }: {
  onDismiss: () => void; onAdd: (draft: ProductAnalyticsEventDraft) => void;
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const dateOrderInvalid = !!(startDate && endDate && startDate > endDate);
  const canSubmit = !!(name.trim() && startDate && endDate && !dateOrderInvalid);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onAdd({ name: name.trim(), startDate, endDate });
  }

  return <LandingDialog label="행사를 추가해주세요" className={styles.eventDialog} onDismiss={onDismiss}>
    <form onSubmit={submit}>
      <h2>행사를 추가해주세요</h2>
      <label>행사명<input value={name} onChange={event => setName(event.target.value)}
        placeholder="행사명을 입력해주세요" maxLength={80} required /></label>
      <div className={styles.eventDates}>
        <label>시작일<input type="date" required value={startDate} max={endDate || '9999-12-31'}
          onChange={event => setStartDate(event.target.value)} /></label>
        <label>종료일<input type="date" required value={endDate} min={startDate || undefined} max="9999-12-31"
          aria-invalid={dateOrderInvalid || undefined} aria-describedby={dateOrderInvalid ? 'analytics-date-error' : undefined}
          onChange={event => setEndDate(event.target.value)} /></label>
      </div>
      {dateOrderInvalid && <p id="analytics-date-error" role="alert">종료일은 시작일 이후로 선택해주세요.</p>}
      <div className={styles.dialogActions}>
        <Button type="button" size="m" color="white" onClick={onDismiss}>취소</Button>
        <Button type="submit" size="m" color="orange" status={canSubmit ? 'default' : 'disabled'}>추가</Button>
      </div>
    </form>
  </LandingDialog>;
}
