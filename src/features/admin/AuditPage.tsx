import { Lock, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Table, Td, Th } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { FormField, Select, TextInput } from '@/components/ui/FormField';
import { audit, auditActions, facilities as loadFacilities, people } from '@/lib/api';
import { fmtDateTime, roleLabel } from '@/lib/format';
import type { AuditRow } from '@/lib/types';
import { msg, tr, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

const ACTION: Record<string, string> = {
  staff_sign_in: msg('Signed in (staff)'), staff_sign_in_refused: msg('Sign-in refused: wrong facility'), admin_sign_in: msg('Signed in (admin)'), view_mother: msg('Opened a record'),
  view_risk_queue: msg('Viewed the risk ranking'), alert_status: msg('Changed an alert'), alert_assign: msg('Assigned an alert'), open_note_share: msg("Opened a Doctor's Note"),
  verify_record_proof: msg('Checked a record QR'), delete_request: msg('Mother asked to delete her data'), facility_create: msg('Created a facility'), facility_update: msg('Edited a facility'),
  facility_deactivate: msg('Deactivated a facility'), facility_reactivate: msg('Reactivated a facility'), district_save: msg('Saved a district'), staff_assign: msg('Gave facility access'),
  staff_unassign: msg('Removed facility access'), role_change: msg('Changed a role'), account_create: msg('Created an account'), account_resend_invite: msg('Re-sent an invite'),
  account_reset_password: msg('Reset a password'), account_deactivate: msg('Deactivated an account'), account_reactivate: msg('Reactivated an account'),
  lesson_publish: msg('Published a lesson'), lesson_unpublish: msg('Unpublished a lesson'), lesson_retire: msg('Retired a lesson'), lesson_restore: msg('Restored a lesson version'),
  site_content_save: msg('Saved a website page draft'), site_content_publish: msg('Published a website page'), site_content_unpublish: msg('Unpublished a website page'),
  site_content_restore: msg('Restored a website page version'), site_content_archive: msg('Archived a website page'), site_content_unarchive: msg('Unarchived a website page'),
  app_content_save: msg('Saved app content'), app_content_publish: msg('Published app content'), app_content_unpublish: msg('Unpublished app content'),
  app_content_restore: msg('Restored app content'), app_content_archive: msg('Archived app content'), app_content_unarchive: msg('Unarchived app content'),
  content_create: msg('Created website content'), content_save: msg('Saved website content'), content_publish: msg('Published website content'),
  content_unpublish: msg('Took website content offline'), content_archive: msg('Archived website content'), content_unarchive: msg('Unarchived website content'),
  content_submit: msg('Sent a post for review'), content_review: msg('Clinically reviewed a post'), content_restore: msg('Restored a version'),
  content_reorder: msg('Reordered page sections'), content_import: msg("Imported the website's built-in sections"), partner_confirm: msg('Confirmed a partnership'),
  contact_status: msg('Handled a contact message'),
};
const TABLE: Record<string, string> = { blog_posts: msg('Blog post'), blog_authors: msg('Blog author'), site_sections: msg('Page section'), site_settings: msg('Website settings'),
  seo_pages: msg('SEO'), media: msg('Picture'), partners: msg('Partner'), impact_kpis: msg('Impact figure'), contact_messages: msg('Contact message') };
const label = (a: string) => (ACTION[a] ? tr(ACTION[a]) : a.replace(/_/g, ' '));
const detail = (d: Record<string, unknown>) => Object.entries(d).filter(([k]) => !['facility_id', 'facility', 'target', 'row_id'].includes(k)).map(([k, v]) => [k, k === 'table' ? (TABLE[String(v)] ? tr(TABLE[String(v)]) : v) : v] as const).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');

/** The audit log viewer (a tab of Activity & audit log). */
export function AuditPanel() {
  const [f, setF] = useState({ from: '', to: '', actor: '', action: '', facility: '' });
  const opts = useAsync(async () => ({ actions: await auditActions(), people: await people(null), facilities: await loadFacilities() }), []);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [more, setMore] = useState(true);
  // local days → exact instants, so "today" means the viewer's today
  const args = { from: f.from ? new Date(`${f.from}T00:00:00`).toISOString() : null, to: f.to ? new Date(`${f.to}T23:59:59.999`).toISOString() : null, actor: f.actor, action: f.action, facility: f.facility };
  const first = useAsync(() => audit({ ...args, limit: 100 }), [f.from, f.to, f.actor, f.action, f.facility]);
  useEffect(() => { if (first.data) { setRows(first.data); setMore(first.data.length === 100); } }, [first.data]);
  const [busy, setBusy] = useState(false);
  const loadOlder = async () => {
    setBusy(true);
    const next = await audit({ ...args, before: rows[rows.length - 1]?.id, limit: 100 }).catch(() => []);
    setRows((r) => [...r, ...next]); setMore(next.length === 100); setBusy(false);
  };
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const t = useT();

  return (
    <>
      <p className="t-small mb-4 max-w-prose">{t('Who did what, and when. Read-only and append-only: nobody can change or delete an entry, not even the super admin. Mothers appear only as a short code.')}</p>
      <BaseCard className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <FormField label={t('From')}><TextInput type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} /></FormField>
          <FormField label={t('To')}><TextInput type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} /></FormField>
          <FormField label={t('Who')}><Select value={f.actor} onChange={(e) => set({ actor: e.target.value })}><option value="">{t('Anyone')}</option>{(opts.data?.people ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></FormField>
          <FormField label={t('Action')}><Select value={f.action} onChange={(e) => set({ action: e.target.value })}><option value="">{t('Any action')}</option>{(opts.data?.actions ?? []).map((a) => <option key={a.action} value={a.action}>{label(a.action)} ({a.n})</option>)}</Select></FormField>
          <FormField label={t('Facility')}><Select value={f.facility} onChange={(e) => set({ facility: e.target.value })}><option value="">{t('Any facility')}</option>{(opts.data?.facilities ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormField>
        </div>
      </BaseCard>
      {first.loading ? <LoadingState text={t('Loading the audit log…')} /> : first.error ? <ErrorState text={first.error} onRetry={() => first.reload()} /> : (
        <BaseCard>
          <p className="t-small mb-4 flex items-center gap-2"><Lock className="h-4 w-4" aria-hidden /> {t('{n} entries shown, newest first.', { n: rows.length })}</p>
          {rows.length === 0 ? <EmptyState icon={ScrollText} title={t('No entries match')} /> : (
            <>
              <Table caption={t('Audit log entries')}>
                <thead><tr><Th>{t('When')}</Th><Th>{t('Who')}</Th><Th>{t('What')}</Th><Th>{t('Facility')}</Th><Th>{t('About')}</Th><Th>{t('Details')}</Th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap">{fmtDateTime(r.at)}</Td>
                    <Td><b className="block whitespace-nowrap">{r.actor_name ?? t('System')}</b><span className="t-caption">{r.actor_role ? t(roleLabel[r.actor_role]) : ''}</span></Td>
                    <Td>{label(r.action)}</Td><Td>{r.facility_name ?? '—'}</Td><Td className="whitespace-nowrap">{r.subject ?? '—'}</Td>
                    <Td className="t-caption max-w-80 break-words">{detail(r.details) || '—'}</Td>
                  </tr>
                ))}</tbody>
              </Table>
              {more && <Button variant="outline" className="mt-4" loading={busy} onClick={loadOlder}>{t('Load older entries')}</Button>}
            </>
          )}
        </BaseCard>
      )}
    </>
  );
}
