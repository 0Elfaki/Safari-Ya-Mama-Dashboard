import { Megaphone, Save, Search, Send, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { SiteImageField } from '@/components/media/SiteImage';
import { Tabs, useTab, useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { FormField, TextArea, TextInput, Toggle } from '@/components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import defaults from '@/data/site-defaults.json';
import { saveSeo, saveSetting, seoPages, settings as loadSettings, type SeoPage, type Setting } from '@/lib/cms';
import { ago } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { humanize, SchemaForm } from './SchemaForm';
import { msg, useT } from '@/lib/i18n';

const DEF = defaults as { pages: { page: string; label: string; path: string }[]; settings?: Record<string, Record<string, unknown>>; fieldOptions?: Record<string, string[]> };
const GROUPS: { key: string; title: string; text: string; admin?: boolean }[] = [
  { key: 'banner', title: msg('Site-wide banner'), text: msg('An announcement or maintenance message at the top of every page.'), admin: true },
  { key: 'site', title: msg('Site'), text: msg('Site name, contact email and default language.'), admin: true },
  { key: 'social', title: msg('Social links'), text: msg('Links in the footer and on the contact page.') },
  { key: 'footer', title: msg('Footer'), text: msg('The footer text and links.') },
];

function SettingCard({ group, row, onChanged }: { group: (typeof GROUPS)[number]; row?: Setting; onChanged: () => void }) {
  const s = useSession();
  const toast = useToast();
  const canEdit = group.admin ? s.can('admin') : s.can('edit');
  const start = (row?.draft && Object.keys(row.draft).length ? row.draft : row?.value) ?? DEF.settings?.[group.key] ?? {};
  const [v, setV] = useState<Record<string, unknown>>(start);
  useEffect(() => setV(start), [row?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState<string | null>(null);
  const t = useT();
  const run = async (k: string, publish: boolean) => {
    setBusy(k);
    try { await saveSetting(group.key, v, publish); toast(publish ? t('Published') : t('Draft saved')); onChanged(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  return (
    <BaseCard>
      <CardHeader icon={group.key === 'banner' ? Megaphone : Settings2} title={t(group.title)} subtitle={t(group.text)}
        badge={row?.value ? (row.has_changes ? <StatusBadge tone="warning">{t('Live · unpublished changes')}</StatusBadge> : <StatusBadge tone="success">{t('Live')}</StatusBadge>) : <StatusBadge>{t("Website's built-in settings")}</StatusBadge>} />
      {Object.keys(v).length === 0 ? <p className="t-small">{t('The website has no editable fields here yet.')}</p> : <SchemaForm value={v} onChange={setV} options={DEF.fieldOptions} disabled={!canEdit} />}
      {canEdit && <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" icon={Save} loading={busy === 'save'} onClick={() => run('save', false)}>{t('Save draft')}</Button>
        <Button icon={Send} loading={busy === 'pub'} onClick={() => run('pub', true)}>{t('Publish')}</Button>
      </div>}
      {row && <p className="t-caption mt-2">{t('Last change {when}', { when: ago(row.updated_at) })}</p>}
    </BaseCard>
  );
}

function SeoRow({ path, label, row, onChanged }: { path: string; label: string; row?: SeoPage; onChanged: () => void }) {
  const s = useSession();
  const toast = useToast();
  const [f, setF] = useState({ title: row?.title ?? '', description: row?.description ?? '', image: row?.share_image_url ?? '', noindex: row?.noindex ?? false });
  const [busy, setBusy] = useState(false);
  const t = useT();
  const can = s.can('edit');
  return (
    <BaseCard>
      <CardHeader icon={Search} title={label} subtitle={path} badge={row ? <StatusBadge tone="success">{t('Custom')}</StatusBadge> : <StatusBadge>{t('Website default')}</StatusBadge>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <FormField label={t('Title')} hint={`${f.title.length}/70`}><TextInput maxLength={70} value={f.title} disabled={!can} onChange={(e) => setF({ ...f, title: e.target.value })} /></FormField>
          <FormField label={t('Description')} hint={`${f.description.length}/200`}><TextArea rows={3} maxLength={200} value={f.description} disabled={!can} onChange={(e) => setF({ ...f, description: e.target.value })} /></FormField>
          <Toggle label={t('Hide from search engines')} description={t('Adds noindex to this page.')} checked={f.noindex} onChange={(x) => can && setF({ ...f, noindex: x })} />
        </div>
        <SiteImageField label={t('Share picture')} disabled={!can} hint={t('Shown when the page is shared on WhatsApp, LinkedIn or X.')} value={f.image ? { src: f.image, alt: '' } : null} onChange={(p) => setF({ ...f, image: p?.src ?? '' })} />
      </div>
      {can && <Button className="mt-4" icon={Save} loading={busy} onClick={async () => { setBusy(true); try { await saveSeo({ path, ...f }); toast(t('Saved and live')); onChanged(); } catch (e) { toast((e as Error).message, 'bad'); } setBusy(false); }}>{t('Save')}</Button>}
    </BaseCard>
  );
}

const TABS = ['settings', 'seo'] as const;
export default function SettingsPage() {
  const [tab, setTab] = useTab(TABS, 'settings');
  const { data, loading, error, reload } = useAsync(async () => ({ settings: await loadSettings(), seo: await seoPages() }), []);
  const t = useT();
  return (
    <>
      <PageHeader title={t('SEO & settings')} subtitle={t('Site-wide settings, the announcement banner, and how each page appears in search results and when shared.')} />
      <Tabs label={t('Settings')} value={tab} onChange={setTab} tabs={[{ value: 'settings', label: t('Settings & banner'), icon: Settings2 }, { value: 'seo', label: t('SEO per page'), icon: Search }]} />
      {loading ? <LoadingState text={t('Loading…')} /> : error || !data ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : tab === 'settings' ? (
        <div className="grid gap-6">{GROUPS.map((g) => <SettingCard key={g.key} group={g} row={data.settings.find((x) => x.key === g.key)} onChanged={() => reload(true)} />)}</div>
      ) : DEF.pages.length === 0 ? <EmptyState icon={Search} title={t('No pages known yet')} text={t('Run npm run sync:site in the dashboard folder.')} /> : (
        <div className="grid gap-6">
          {[...DEF.pages.map((p) => ({ path: p.path, label: p.label })), { path: '/blog', label: t('Blog list') }].filter((x, i, a) => a.findIndex((y) => y.path === x.path) === i)
            .map((p) => <SeoRow key={p.path} path={p.path} label={p.label ?? humanize(p.path)} row={data.seo.find((x) => x.path === p.path)} onChanged={() => reload(true)} />)}
        </div>
      )}
    </>
  );
}
