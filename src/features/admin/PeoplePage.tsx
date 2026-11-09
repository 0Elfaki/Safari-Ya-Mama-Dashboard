import { Settings2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Table, Td, Th } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { SearchInput, Select } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { facilities as loadFacilities, people } from '@/lib/api';
import { ago, roleLabel } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Person, Role } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { InviteModal, ManageModal, PersonStatus, canManage, creatableRoles } from './peopleShared';

export default function PeoplePage() {
  const s = useSession();
  const t = useT();
  const { data, loading, error, reload } = useAsync(async () => {
    const [p, f] = await Promise.all([people(null), loadFacilities()]);
    return { p, f: f.filter((x) => x.active).map((x) => ({ id: x.id, name: x.name })) };
  }, []);
  const [q, setQ] = useState(''), [role, setRole] = useState(''), [fac, setFac] = useState(''), [status, setStatus] = useState('');
  const [invite, setInvite] = useState(false);
  const [manage, setManage] = useState<string | null>(null);

  const rows = useMemo(() => (data?.p ?? []).filter((p) =>
    (!q || `${p.display_name} ${p.email}`.toLowerCase().includes(q.toLowerCase())) && (!role || p.role === role) &&
    (!fac || p.facilities.some((f) => f.id === fac && f.active)) &&
    (!status || (status === 'off' ? p.banned : status === 'invited' ? !p.confirmed && !p.banned : p.confirmed && !p.banned))), [data, q, role, fac, status]);

  return (
    <>
      <PageHeader title={t('People')} subtitle={s.isSuper ? t('Every staff, admin and website-team account. You can create any account, change roles and deactivate anyone except yourself.') : t('Every staff, admin and website-team account. Admins add and manage health workers and the website team; admin and facility admin accounts are managed by the super admin.')}
        actions={<Button icon={UserPlus} onClick={() => setInvite(true)}>{s.isAdmin ? t('Add person') : t('Add health worker')}</Button>} />
      <BaseCard className="mb-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={q} onChange={setQ} placeholder={t('Name or email')} label={t('Search people')} />
          <Select aria-label={t('Role')} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">{t('All roles')}</option>{(['health_worker', 'facility_admin', 'programme_admin', 'super_admin', 'editor', 'author', 'clinical_reviewer', 'viewer'] as Role[]).map((r) => <option key={r} value={r}>{t(roleLabel[r])}</option>)}
          </Select>
          <Select aria-label={t('Facility')} value={fac} onChange={(e) => setFac(e.target.value)}>
            <option value="">{t('All facilities')}</option>{(data?.f ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select aria-label={t('Status')} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('Any status')}</option><option value="active">{t('Active')}</option><option value="invited">{t('Invite not accepted')}</option><option value="off">{t('Deactivated')}</option>
          </Select>
        </div>
      </BaseCard>
      {loading ? <LoadingState text={t('Loading people…')} /> : error || !data ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : (
        <BaseCard>
          {rows.length === 0 ? <EmptyState icon={Users} title={data.p.length ? t('Nobody matches') : t('No staff accounts yet')} text={data.p.length ? undefined : t('Add the first facility admin or health worker.')} /> : (
            <Table caption={t('Staff and admin accounts')}>
              <thead><tr><Th>{t('Name')}</Th><Th>{t('Role')}</Th><Th>{t('Facilities')}</Th><Th>{t('Status')}</Th><Th>{t('Last sign-in')}</Th><Th><span className="sr-only">{t('Actions')}</span></Th></tr></thead>
              <tbody>
                {rows.map((p: Person) => (
                  <tr key={p.id}>
                    <Td><b className="block whitespace-nowrap">{p.display_name}{p.id === s.userId ? ` (${t('you')})` : ''}</b><span className="t-caption">{p.email}</span></Td>
                    <Td><span className="block whitespace-nowrap">{t(roleLabel[p.role])}</span>{!['health_worker', 'facility_admin'].includes(p.role) && (p.mfa ? <StatusBadge tone="success" icon={ShieldCheck} className="mt-1">{t('Two-step')}</StatusBadge> : <StatusBadge tone="warning" className="mt-1">{t('No two-step yet')}</StatusBadge>)}</Td>
                    <Td>{p.facilities.filter((f) => f.active).map((f) => f.name).join(', ') || <span className="t-caption">{t('All (admin)')}</span>}</Td>
                    <Td><PersonStatus p={p} /></Td>
                    <Td className="whitespace-nowrap">{ago(p.last_sign_in_at)}</Td>
                    <Td>{canManage(s.role, s.userId, [], p) && <Button size="sm" variant="outline" icon={Settings2} onClick={() => setManage(p.id)}>{t('Manage')}</Button>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </BaseCard>
      )}
      <InviteModal open={invite} onClose={() => setInvite(false)} roles={creatableRoles(s.role)} facilities={data?.f ?? []} onDone={() => reload(true)} />
      <ManageModal person={data?.p.find((p) => p.id === manage) ?? null} onClose={() => setManage(null)} onDone={() => reload(true)} facilities={data?.f ?? []} me={s.role} />
    </>
  );
}
