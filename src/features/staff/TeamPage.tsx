import { Settings2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { InviteModal, ManageModal, PersonStatus, canManage } from '@/features/admin/peopleShared';
import { people } from '@/lib/api';
import { ago, roleLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import type { Person } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

export default function TeamPage() {
  const s = useSession();
  const fac = s.facility!;
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => people(fac.id), [fac.id]);
  const [invite, setInvite] = useState(false);
  const [manage, setManage] = useState<Person | null>(null);
  const mine = s.facilities.map((f) => f.id);

  return (
    <>
      <PageHeader title={t('Team')} subtitle={t('Health workers and admins at {name}. You can add, deactivate and reset health workers for this facility. Facility admin accounts are managed by the super admin.', { name: fac.name })}
        actions={<Button icon={UserPlus} onClick={() => setInvite(true)}>{t('Add health worker')}</Button>} />
      {loading ? <LoadingState text={t('Loading team…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : (
        <BaseCard padded={false}>
          {data!.length === 0 ? <EmptyState icon={Users} title={t('Nobody is assigned here yet')} /> : (
            <ul className="divide-y divide-line">
              {data!.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <span className="block truncate font-semibold text-ink">{p.display_name}{p.id === s.userId ? ` ${t('(you)')}` : ''}</span>
                    <span className="t-small block truncate">{t(roleLabel[p.role])} · {p.email} · {t('last sign-in {when}', { when: ago(p.last_sign_in_at) })}</span>
                  </span>
                  <PersonStatus p={p} />
                  {canManage(s.role, s.userId, mine, p) && <Button size="sm" variant="outline" icon={Settings2} onClick={() => setManage(p)}>{t('Manage')}</Button>}
                </li>
              ))}
            </ul>
          )}
        </BaseCard>
      )}
      <InviteModal open={invite} onClose={() => setInvite(false)} roles={['health_worker']} facilities={[fac]} fixedFacility={fac} onDone={() => reload(true)} />
      <ManageModal person={manage && data ? data.find((p) => p.id === manage.id) ?? null : null} onClose={() => setManage(null)} onDone={() => reload(true)} facilities={[fac]} me={s.role} scopeFacility={fac} />
    </>
  );
}
