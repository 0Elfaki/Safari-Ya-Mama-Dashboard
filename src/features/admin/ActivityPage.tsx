import { Activity, ScrollText, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Kpi, Table, Tabs, Td, Th, useTab } from '@/components/ui/Bits';
import { BaseCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { staffActivity } from '@/lib/api';
import { ago, fmtDateTime, fmtNum, roleLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { AuditPanel } from './AuditPage';
import { defaultScope, ScopeFilter, type Scope } from './ScopeFilter';

function StaffActivity() {
  const [scope, setScope] = useState<Scope>(defaultScope);
  const { data, loading, error, reload } = useAsync(() => staffActivity(scope.from, scope.to, scope.facility), [scope.from, scope.to, scope.facility]);
  const rows = data ?? [];
  const active = rows.filter((r) => r.logins > 0).length;
  const t = useT();
  return (
    <>
      <p className="t-small mb-4 max-w-prose">{t('Sign-ins and alerts handled per person in the chosen period, worked out from the audit log and alert history.')}</p>
      <BaseCard className="mb-6"><ScopeFilter value={scope} onChange={setScope} /></BaseCard>
      {loading ? <LoadingState text={t('Loading activity…')} /> : error || !data ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={t('People with access')} icon={UsersRound} value={fmtNum(rows.length)} />
            <Kpi label={t('Signed in this period')} icon={Activity} value={fmtNum(active)} sub={rows.length ? t('{pct}% of people', { pct: Math.round((active / rows.length) * 100) }) : undefined} />
            <Kpi label={t('Sign-ins')} icon={Activity} value={fmtNum(rows.reduce((n, r) => n + r.logins, 0))} />
            <Kpi label={t('Alert actions')} icon={Activity} value={fmtNum(rows.reduce((n, r) => n + r.alerts_handled, 0))} sub={t('acknowledged, called, referred, closed')} />
          </div>
          <BaseCard>
            {rows.length === 0 ? <EmptyState icon={Activity} title={t('No staff in this selection')} /> : (
              <Table caption={t('Staff activity')}>
                <thead><tr><Th>{t('Name')}</Th><Th>{t('Role')}</Th><Th>{t('Facilities')}</Th><Th num>{t('Sign-ins')}</Th><Th num>{t('Alerts handled')}</Th><Th>{t('Last action')}</Th><Th>{t('Last sign-in')}</Th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.staff_id}>
                    <Td><b className="whitespace-nowrap">{r.name}</b></Td><Td className="whitespace-nowrap">{t(roleLabel[r.role])}</Td><Td>{r.facilities ?? '—'}</Td>
                    <Td num>{r.logins}</Td><Td num>{r.alerts_handled}</Td><Td className="whitespace-nowrap">{fmtDateTime(r.last_action)}</Td><Td className="whitespace-nowrap">{ago(r.last_sign_in_at)}</Td>
                  </tr>
                ))}</tbody>
              </Table>
            )}
          </BaseCard>
        </>
      )}
    </>
  );
}

const TABS = ['people', 'audit'] as const;
export default function ActivityPage() {
  const [tab, setTab] = useTab(TABS, 'people');
  const t = useT();
  return (
    <>
      <PageHeader title={t('Activity & audit log')} subtitle={t('What staff and admins do in the system: activity per person, and every recorded action.')} />
      <Tabs label={t('Activity views')} value={tab} onChange={setTab} tabs={[{ value: 'people', label: t('Staff activity'), icon: UsersRound }, { value: 'audit', label: t('Audit log'), icon: ScrollText }]} />
      {tab === 'people' ? <StaffActivity /> : <AuditPanel />}
    </>
  );
}
