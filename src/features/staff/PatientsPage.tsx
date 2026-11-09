import { CalendarClock, ChevronRight, HeartPulse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/Shell';
import { LevelBadge } from '@/components/ui/Bits';
import { BaseCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { SearchInput, Select } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { patients } from '@/lib/api';
import { ago, fmtDate, maskPhone, stageText } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { buildRows } from './patientData';

export default function PatientsPage() {
  const { facility } = useSession();
  const fid = facility!.id;
  const t = useT();
  const { data, loading, error, reload } = useAsync(async () => buildRows(await patients(fid)), [fid]);
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('all'), [level, setLevel] = useState('all'), [last, setLast] = useState('all'), [visit, setVisit] = useState('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase(), digits = q.replace(/\D/g, '');
    return (data ?? []).filter((r) =>
      (!needle || r.name.toLowerCase().includes(needle) || (digits.length >= 3 && (r.phone ?? '').replace(/\D/g, '').includes(digits))) &&
      (stage === 'all' || r.stage === stage) &&
      (level === 'all' || (level === 'none' ? !r.last : r.last?.level === level)) &&
      (last === 'all' || (last === '3' ? r.daysSinceCheck === null || r.daysSinceCheck >= 3 : r.daysSinceCheck === null || r.daysSinceCheck >= 7)) &&
      (visit === 'all' || r.overdueVisits > 0));
  }, [data, q, stage, level, last, visit]);

  return (
    <>
      <PageHeader title={t('Patients')} subtitle={t('Every mother who shares her record with {name}. A mother who stops sharing disappears from this list. Phone numbers are masked until you open a record.', { name: facility!.name })} />
      <BaseCard className="mb-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="md:col-span-2 xl:col-span-1"><SearchInput value={q} onChange={setQ} placeholder={t('Name or phone')} label={t('Search patients by name or phone')} /></div>
          <Select aria-label={t('Stage')} value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">{t('Any stage')}</option><option value="pregnant">{t('Pregnant')}</option><option value="baby">{t('With a baby')}</option>
          </Select>
          <Select aria-label={t('Latest level')} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">{t('Any latest level')}</option><option value="red">{t('Red')}</option><option value="amber">{t('Amber')}</option><option value="green">{t('No warning signs')}</option><option value="none">{t('No check-ins')}</option>
          </Select>
          <Select aria-label={t('Last check')} value={last} onChange={(e) => setLast(e.target.value)}>
            <option value="all">{t('Any last check')}</option><option value="3">{t('No check for 3+ days')}</option><option value="7">{t('No check for 7+ days')}</option>
          </Select>
          <Select aria-label={t('Visits')} value={visit} onChange={(e) => setVisit(e.target.value)}>
            <option value="all">{t('Any visits')}</option><option value="overdue">{t('Has an overdue visit')}</option>
          </Select>
        </div>
      </BaseCard>
      {loading ? <LoadingState text={t('Loading patients…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : (
        <BaseCard padded={false}>
          <p className="t-small border-b border-line px-5 py-3" aria-live="polite">{t('{n} of {total} mothers', { n: rows.length, total: data!.length })}</p>
          {rows.length === 0 ? <EmptyState icon={HeartPulse} title={data!.length ? t('No mothers match') : t('No mothers share with this facility yet')} text={data!.length ? t('Change the search or filters.') : t('Mothers appear here when they choose this facility in the app and switch sharing on.')} /> : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link to={`/patients/${r.id}`} className="grid min-w-0 gap-2 px-5 py-4 transition-colors hover:bg-surface-2 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] md:items-center">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{r.name}</span>
                      <span className="t-small block truncate">{maskPhone(r.phone)} · {stageText({ weeks: r.weeks, babyDays: r.babyDays, babyName: r.babyName })}</span>
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      {r.last ? <><LevelBadge level={r.last.level} short /><span className="t-small">{ago(r.last.at)}</span></> : <span className="t-small">{t('No check-ins in 60 days')}</span>}
                      {r.openRed > 0 && <StatusBadge tone="danger">{t('{n} red open', { n: r.openRed })}</StatusBadge>}
                      {r.openAmber > 0 && <StatusBadge tone="warning">{t('{n} amber open', { n: r.openAmber })}</StatusBadge>}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-small text-ink">
                      <CalendarClock className="h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                      {r.next ? <span className="truncate">{r.next.label} · {fmtDate(r.next.due, { day: 'numeric', month: 'short' })}{r.next.overdue && <StatusBadge tone="warning" className="ml-2">{t('Overdue')}</StatusBadge>}</span> : <span className="t-small">{t('No visit scheduled')}</span>}
                    </span>
                    <ChevronRight className="hidden h-5 w-5 text-ink-2 md:block" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BaseCard>
      )}
    </>
  );
}
