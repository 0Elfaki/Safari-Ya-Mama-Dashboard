import { Archive, BadgeCheck, BarChart3, Eye, EyeOff, Handshake, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { SiteImageField } from '@/components/media/SiteImage';
import { Tabs, useTab, useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { FormField, TextArea, TextInput, Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  archiveImpact, archivePartner, confirmPartner, impactKpis, partners as loadPartners, publishImpact, publishPartner, saveImpact, savePartner, type ImpactKpi, type Partner,
} from '@/lib/cms';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { useT, useTn } from '@/lib/i18n';

type PartnerForm = { id: string | null; name: string; logo_url: string; logo_alt: string; url: string; relationship: string; sort: number };

function PartnersTab() {
  const s = useSession();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(loadPartners, []);
  const [form, setForm] = useState<PartnerForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const t = useT(), tn = useTn();
  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => { setBusy(k); try { await fn(); toast(ok); setForm(null); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } setBusy(null); };
  if (loading) return <LoadingState text={t('Loading partners…')} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  const list = data ?? [];
  return (
    <>
      <p className="t-small mb-4 max-w-prose">{tn('Honesty rule: a partner appears on the website only after an Admin marks the partnership {confirmed} (signed or agreed in writing). Proposed partners stay private. While no partner is shown, the website keeps its built-in partner section.', { confirmed: <b>{t('confirmed')}</b> })}</p>
      <div className="mb-4 flex justify-end">{s.can('edit') && <Button icon={Plus} onClick={() => setForm({ id: null, name: '', logo_url: '', logo_alt: '', url: '', relationship: '', sort: list.length * 10 })}>{t('Add a partner')}</Button>}</div>
      <BaseCard>
        {list.length === 0 ? <EmptyState icon={Handshake} title={t('No partners recorded')} /> : (
          <ul className="divide-y divide-line">
            {list.map((p: Partner) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                {p.logo_url ? <img src={p.logo_url} alt={p.logo_alt ?? ''} className="h-12 w-24 shrink-0 rounded-sm bg-surface-2 object-contain" /> : <span className="h-12 w-24 shrink-0 rounded-sm bg-surface-2" aria-hidden />}
                <span className="min-w-0 flex-1"><b className="block text-ink">{p.name}</b><span className="t-small block truncate">{p.relationship ?? '—'}{p.url ? ` · ${p.url}` : ''}</span></span>
                <span className="flex flex-wrap gap-2">
                  {p.status === 'confirmed' ? <StatusBadge tone="success" icon={BadgeCheck}>{t('Confirmed')}</StatusBadge> : <StatusBadge tone="warning">{t('Proposed')}</StatusBadge>}
                  {p.published ? <StatusBadge tone="success" icon={Eye}>{t('On the website')}</StatusBadge> : <StatusBadge icon={EyeOff}>{t('Not shown')}</StatusBadge>}
                </span>
                <span className="flex flex-wrap gap-1">
                  {s.can('admin') && <Button size="sm" variant="outline" icon={ShieldCheck} loading={busy === `c${p.id}`} onClick={() => { if (p.status === 'confirmed' || confirm(t('Confirm that {name} has agreed in writing to be shown as a partner?', { name: p.name }))) run(`c${p.id}`, () => confirmPartner(p.id, p.status !== 'confirmed'), p.status === 'confirmed' ? t('Marked proposed (and hidden)') : t('Marked confirmed')); }}>{p.status === 'confirmed' ? t('Mark proposed') : t('Confirm')}</Button>}
                  {s.can('edit') && <>
                    <Button size="sm" variant="outline" icon={p.published ? EyeOff : Eye} disabled={p.status !== 'confirmed'} loading={busy === `p${p.id}`} title={p.status !== 'confirmed' ? t('An Admin must confirm the partnership first') : undefined}
                      onClick={() => run(`p${p.id}`, () => publishPartner(p.id, !p.published), p.published ? t('Hidden from the website') : t('Shown on the website'))}>{p.published ? t('Hide') : t('Show')}</Button>
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ id: p.id, name: p.name, logo_url: p.logo_url ?? '', logo_alt: p.logo_alt ?? '', url: p.url ?? '', relationship: p.relationship ?? '', sort: p.sort })}>{t('Edit')}</Button>
                    <Button size="sm" variant="ghost" icon={Archive} onClick={() => { if (confirm(t('Archive {name}?', { name: p.name }))) run(`a${p.id}`, () => archivePartner(p.id), t('Archived')); }}>{t('Archive')}</Button>
                  </>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BaseCard>
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? t('Edit partner') : t('Add a partner')} description={t('Saved as proposed. An Admin confirms it before it can be shown.')}
          footer={<><Button variant="outline" onClick={() => setForm(null)}>{t('Cancel')}</Button><Button loading={busy === 'save'} disabled={form.name.trim().length < 2 || (!!form.url && !/^https:\/\//.test(form.url))} onClick={() => run('save', () => savePartner(form), t('Partner saved'))}>{t('Save')}</Button></>}>
          <div className="grid gap-4">
            <FormField label={t('Name')} required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <SiteImageField label={t('Logo')} value={form.logo_url ? { src: form.logo_url, alt: form.logo_alt } : null} onChange={(p) => setForm({ ...form, logo_url: p?.src ?? '', logo_alt: p?.alt ?? '' })} />
            <FormField label={t('Website')} hint={t('Starts with https://')} error={form.url && !/^https:\/\//.test(form.url) ? t('Use an https:// address') : undefined}><TextInput value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value.trim() })} /></FormField>
            <FormField label={t('Relationship')} hint={t('For example: Technical partner · UNICEF FemTech cohort')}><TextArea rows={2} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></FormField>
            <FormField label={t('Order')} hint={t('Lower numbers come first')}><TextInput inputMode="numeric" value={String(form.sort)} onChange={(e) => setForm({ ...form, sort: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></FormField>
          </div>
        </Modal>
      )}
    </>
  );
}

type KpiForm = { id: string | null; label: string; value: string; unit: string; source: string; is_demo: boolean; sort: number };
function ImpactTab() {
  const s = useSession();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(impactKpis, []);
  const [form, setForm] = useState<KpiForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const t = useT(), tn = useTn();
  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => { setBusy(k); try { await fn(); toast(ok); setForm(null); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } setBusy(null); };
  if (loading) return <LoadingState text={t('Loading figures…')} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  const list = data ?? [];
  return (
    <>
      <p className="t-small mb-4 max-w-prose">{tn("The figures on the website's Impact page. Every figure needs a source. Anything not switched to {real} shows a “Demo” label on the website. Never publish an invented number as real.", { real: <b>{t('Real')}</b> })}</p>
      <div className="mb-4 flex justify-end">{s.can('edit') && <Button icon={Plus} onClick={() => setForm({ id: null, label: '', value: '', unit: '', source: '', is_demo: true, sort: list.length * 10 })}>{t('Add a figure')}</Button>}</div>
      <BaseCard>
        {list.length === 0 ? <EmptyState icon={BarChart3} title={t('No figures yet')} text={t('While none is published, the website keeps its built-in, clearly labelled demo figures.')} /> : (
          <ul className="divide-y divide-line">
            {list.map((k: ImpactKpi) => (
              <li key={k.id} className="flex flex-wrap items-center gap-4 py-3">
                <span className="t-num w-28 shrink-0 font-display text-h3 font-extrabold text-ink">{k.value.toLocaleString('en-GB')}{k.unit ? <span className="text-small font-semibold"> {k.unit}</span> : null}</span>
                <span className="min-w-0 flex-1"><b className="block text-ink">{k.label}</b><span className="t-caption block">{t('Source: {source}', { source: k.source })}</span></span>
                <span className="flex flex-wrap gap-2">{k.is_demo ? <StatusBadge tone="warning">{t('Demo')}</StatusBadge> : <StatusBadge tone="success">{t('Real')}</StatusBadge>}{k.published ? <StatusBadge tone="success" icon={Eye}>{t('On the website')}</StatusBadge> : <StatusBadge icon={EyeOff}>{t('Not shown')}</StatusBadge>}</span>
                {s.can('edit') && <span className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" icon={k.published ? EyeOff : Eye} loading={busy === `p${k.id}`} onClick={() => run(`p${k.id}`, () => publishImpact(k.id, !k.published), k.published ? t('Hidden') : t('Shown on the website'))}>{k.published ? t('Hide') : t('Show')}</Button>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ id: k.id, label: k.label, value: String(k.value), unit: k.unit ?? '', source: k.source, is_demo: k.is_demo, sort: k.sort })}>{t('Edit')}</Button>
                  <Button size="sm" variant="ghost" icon={Archive} onClick={() => { if (confirm(t('Archive “{label}”?', { label: k.label }))) run(`a${k.id}`, () => archiveImpact(k.id), t('Archived')); }}>{t('Archive')}</Button>
                </span>}
              </li>
            ))}
          </ul>
        )}
      </BaseCard>
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? t('Edit figure') : t('Add a figure')}
          footer={<><Button variant="outline" onClick={() => setForm(null)}>{t('Cancel')}</Button><Button loading={busy === 'save'} disabled={form.label.trim().length < 2 || form.source.trim().length < 3 || form.value === '' || Number.isNaN(Number(form.value))}
            onClick={() => run('save', () => saveImpact({ ...form, value: Number(form.value) }), t('Figure saved'))}>{t('Save')}</Button></>}>
          <div className="grid gap-4">
            <FormField label={t('Label')} required hint={t('For example: Mothers using the app')}><TextInput value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('Value')} required><TextInput inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^\d.-]/g, '') })} /></FormField>
              <FormField label={t('Unit')} hint={t('%, mothers, facilities…')}><TextInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></FormField>
            </div>
            <FormField label={t('Source')} required hint={t('Where the number comes from: a report, a dated dashboard export, a study.')}><TextArea rows={2} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></FormField>
            <Toggle label={t('This is a real, verified figure')} description={t('Off = the website shows a “Demo” label next to it.')} checked={!form.is_demo} onChange={(v) => setForm({ ...form, is_demo: !v })} />
          </div>
        </Modal>
      )}
    </>
  );
}

const TABS = ['partners', 'impact'] as const;
export default function PartnersPage() {
  const [tab, setTab] = useTab(TABS, 'partners');
  const t = useT();
  return (
    <>
      <PageHeader title={t('Partners & impact')} subtitle={t('Who works with Safari ya Mama, and the figures the website shows. Both follow the honesty rules.')} />
      <Tabs label={t('Partners and impact')} value={tab} onChange={setTab} tabs={[{ value: 'partners', label: t('Partners'), icon: Handshake }, { value: 'impact', label: t('Impact figures'), icon: BarChart3 }]} />
      {tab === 'partners' ? <PartnersTab /> : <ImpactTab />}
    </>
  );
}
