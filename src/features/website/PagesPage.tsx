import clsx from 'clsx';
import { ArrowDown, ArrowLeft, ArrowUp, Download, Eye, EyeOff, FileText, Globe, History, Pencil, RotateCcw, Save, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { useToast } from '@/components/ui/Bits';
import { Button, IconButton } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import defaults from '@/data/site-defaults.json';
import { importSections, publishPage, publishSection, reorderSections, resetSection, restoreSection, saveSection, sections as loadSections, WEBSITE_URL, type Section } from '@/lib/cms';
import { ago } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { useAutosave } from '@/lib/useAutosave';
import { SchemaForm } from './SchemaForm';
import { EditingNow, RevisionsModal, SaveIndicator, usePreview } from './shared';
import { usePresence } from '@/lib/usePresence';
import { useT, useTn } from '@/lib/i18n';

interface DefPage { page: string; label: string; path: string; sections: { key: string; label: string; data: Record<string, unknown> }[] }
const PAGES = (defaults as { pages: DefPage[] }).pages;
const OPTIONS = ((defaults as { fieldOptions?: Record<string, string[]> }).fieldOptions ?? {});
const builtIn = () => PAGES.flatMap((p) => p.sections.map((s, i) => ({ page: p.page, key: s.key, label: s.label, sort: (i + 1) * 10, data: s.data })));

function SectionStatus({ s }: { s: Section }) {
  const t = useT();
  return (
    <span className="flex flex-wrap gap-2">
      {!s.draft_visible && <StatusBadge icon={EyeOff}>{t('Hidden')}</StatusBadge>}
      {s.published ? (s.has_changes ? <StatusBadge tone="warning">{t('Live · unpublished changes')}</StatusBadge> : <StatusBadge tone="success">{t('Live · v{n}', { n: s.version })}</StatusBadge>)
        : s.has_changes ? <StatusBadge tone="warning">{t('Draft, not on the website yet')}</StatusBadge> : <StatusBadge>{t("Website's built-in text")}</StatusBadge>}
    </span>
  );
}

function SectionEditor({ section, path, onBack, onChanged }: { section: Section; path: string; onBack: () => void; onChanged: () => void }) {
  const toast = useToast();
  const t = useT();
  const s = useSession();
  const preview = usePreview();
  const canEdit = s.can('edit');
  const [draft, setDraft] = useState<Record<string, unknown>>(section.draft);
  const [visible, setVisible] = useState(section.draft_visible);
  const [base, setBase] = useState({ json: JSON.stringify(section.draft), visible: section.draft_visible, at: section.updated_at });
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const others = usePresence(`section:${section.id}`);
  useEffect(() => { setDraft(section.draft); setVisible(section.draft_visible); setBase({ json: JSON.stringify(section.draft), visible: section.draft_visible, at: section.updated_at }); }, [section.id, section.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== base.json || visible !== base.visible;
  const save = async () => {
    const at = await saveSection(section.id, draft, visible, base.at);
    setBase({ json: JSON.stringify(draft), visible, at });
  };
  const auto = useAutosave(dirty && canEdit, save, { enabled: canEdit });
  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(k);
    try { await fn(); toast(ok); onChanged(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };

  return (
    <>
      <button type="button" onClick={() => { if (!dirty || confirm(t('Leave without saving your changes?'))) onBack(); }} className="mb-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> {t('All sections of this page')}</button>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="t-label">{PAGES.find((p) => p.page === section.page)?.label ?? section.page}</p>
          <h1 className="t-h1">{section.label || section.section_key}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3"><SectionStatus s={section} />{canEdit && <SaveIndicator state={auto.state} dirty={dirty} error={auto.error} onRetry={auto.retry} />}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Eye} onClick={async () => { if (dirty) await auto.saveNow(); preview(path); }}>{t('Preview')}</Button>
          {canEdit && <>
            <Button variant="outline" icon={Save} loading={auto.state === 'saving'} disabled={!dirty} onClick={auto.saveNow}>{t('Save draft')}</Button>
            <Button icon={Send} loading={busy === 'pub'} disabled={!section.has_changes && !dirty} onClick={() => run('pub', async () => { if (dirty) await save(); await publishSection(section.id); }, t('Published: the website shows it on the next page load'))}>{t('Publish')}</Button>
          </>}
          <Button variant="ghost" icon={History} onClick={() => setHistory(true)}>{t('History')}</Button>
          {canEdit && <Button variant="ghost" icon={RotateCcw} loading={busy === 'reset'} onClick={() => { if (confirm(t("Put the website's built-in version of this section into the draft? Publish afterwards to make it live."))) run('reset', () => resetSection(section.id), t('Built-in version restored into the draft')); }}>{t('Reset to built-in')}</Button>}
        </div>
      </header>
      <EditingNow names={others} />
      {auto.state === 'error' && auto.error && <ErrorState className="mb-4" title={t('Your changes are not saved')} text={auto.error} onRetry={auto.retry} />}
      <BaseCard>
        <div className="mb-2 max-w-prose"><Toggle2 checked={visible} disabled={!canEdit} onChange={setVisible} /></div>
        <SchemaForm value={draft} onChange={setDraft} options={OPTIONS} disabled={!canEdit} />
      </BaseCard>
      <RevisionsModal open={history} onClose={() => setHistory(false)} table="site_sections" rowId={section.id}
        describe={(r) => ((r.snapshot as { visible?: boolean }).visible === false ? t('Hidden') : t('Shown'))}
        onRestore={async (r) => { await restoreSection(section.id, r.id); onChanged(); }} />
    </>
  );
}

function Toggle2({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const t = useT();
  return (
    <label className="inline-flex min-h-11 items-center gap-3 text-small font-semibold text-ink">
      <input type="checkbox" className="h-6 w-6 accent-primary" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {t('Show this section on the website')}
    </label>
  );
}

export default function PagesPage() {
  const s = useSession();
  const toast = useToast();
  const preview = usePreview();
  const canEdit = s.can('edit');
  const { data, loading, error, reload } = useAsync(loadSections, []);
  const [page, setPage] = useState(PAGES[0]?.page ?? 'home');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const all = data ?? [];
  const pages = useMemo(() => {
    const extra = [...new Set(all.map((x) => x.page))].filter((p) => !PAGES.some((d) => d.page === p)).map((p) => ({ page: p, label: p, path: `/${p}`, sections: [] }));
    return [...PAGES, ...extra];
  }, [all]);
  const cur = pages.find((p) => p.page === page) ?? pages[0];
  const list = all.filter((x) => x.page === cur?.page).sort((a, b) => a.draft_sort - b.draft_sort);
  const missing = builtIn().filter((d) => !all.some((x) => x.page === d.page && x.section_key === d.key));
  const changed = list.filter((x) => x.has_changes).length;
  const editingSection = all.find((x) => x.id === editing);
  const t = useT(), tn = useTn();

  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(k);
    try { await fn(); toast(ok); await reload(true); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  const move = (i: number, d: -1 | 1) => {
    const ids = list.map((x) => x.id); const j = i + d;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(`m${i}`, () => reorderSections(cur.page, ids), t('Order changed (publish the page to make it live)'));
  };

  if (loading) return <LoadingState text={t("Loading the website's pages…")} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  if (editingSection) return <SectionEditor section={editingSection} path={cur?.path ?? '/'} onBack={() => setEditing(null)} onChanged={() => reload(true)} />;

  return (
    <>
      <PageHeader title={t('Website pages')} subtitle={<>{tn('Every page of {site}, section by section. Edit a section, preview it on the real website, then publish. The website updates on the next page load.', { site: <a className="inline-block min-h-6 font-semibold text-primary underline" href={WEBSITE_URL} target="_blank" rel="noreferrer">{WEBSITE_URL.replace(/^https?:\/\//, '')}</a> })}</>}
        actions={canEdit && missing.length > 0 ? <Button icon={Download} loading={busy === 'import'} onClick={() => run('import', () => importSections(builtIn()), t('{n} sections imported from the website', { n: missing.length }))}>{t('Import {n} sections from the website', { n: missing.length })}</Button> : undefined} />
      {PAGES.length === 0 && <ErrorState className="mb-6" title={t("The website's section list is not in this build")} text={t('Run npm run sync:site in the dashboard folder (it copies site-defaults.json from the website), then build again.')} />}
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={t('Website pages')} className="min-w-0">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {pages.map((p) => {
              const n = all.filter((x) => x.page === p.page && x.has_changes).length;
              return (
                <li key={p.page} className="shrink-0">
                  <button type="button" aria-current={p.page === cur?.page ? 'page' : undefined} onClick={() => setPage(p.page)}
                    className={clsx('flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-small font-semibold',
                      p.page === cur?.page ? 'bg-primary text-white' : 'bg-surface text-ink hover:bg-primary-soft')}>
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" aria-hidden />{p.label}</span>
                    {n > 0 && <span className={clsx('t-num rounded-full px-2 text-caption', p.page === cur?.page ? 'bg-white/20' : 'bg-warning-soft text-warning')} title={t('Sections with unpublished changes')}>{n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">
          {cur && (
            <BaseCard>
              <CardHeader icon={Globe} title={cur.label} subtitle={`${cur.path} · ${t('{n} sections', { n: list.length })}${changed ? ` · ${t('{n} with unpublished changes', { n: changed })}` : ''}`} />
              <div className="-mt-2 mb-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" icon={Eye} onClick={() => preview(cur.path)}>{t('Preview page')}</Button>
                {canEdit && <Button size="sm" icon={Send} disabled={!changed} loading={busy === 'pubpage'} onClick={() => run('pubpage', () => publishPage(cur.page), t('Page published'))}>{t('Publish page')}{changed ? ` (${changed})` : ''}</Button>}
              </div>
              {list.length === 0 ? (
                <EmptyState icon={FileText} title={t('No sections here yet')} text={missing.some((m) => m.page === cur.page) ? t("Import the website's sections to start editing them.") : t('This page has no editable sections.')} />
              ) : (
                <ol className="divide-y divide-line">
                  {list.map((x, i) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="t-num inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-small font-bold text-ink-2" aria-hidden>{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block truncate font-semibold', x.draft_visible ? 'text-ink' : 'text-ink-2 line-through')}>{x.label || x.section_key}</span>
                        <span className="t-caption block">{x.published_at ? t('Published {when}', { when: ago(x.published_at) }) : t('Never published')} · {t('edited {when}', { when: ago(x.updated_at) })}</span>
                      </span>
                      <SectionStatus s={x} />
                      <span className="flex items-center gap-1">
                        {canEdit && <>
                          <IconButton icon={ArrowUp} label={t('Move {name} up', { name: x.label })} disabled={i === 0 || !!busy} onClick={() => move(i, -1)} />
                          <IconButton icon={ArrowDown} label={t('Move {name} down', { name: x.label })} disabled={i === list.length - 1 || !!busy} onClick={() => move(i, 1)} />
                          <IconButton icon={x.draft_visible ? EyeOff : Eye} label={x.draft_visible ? t('Hide {name}', { name: x.label }) : t('Show {name}', { name: x.label })} disabled={!!busy}
                            onClick={() => run(`v${x.id}`, () => saveSection(x.id, x.draft, !x.draft_visible, x.updated_at), x.draft_visible ? t('Hidden (publish to make it live)') : t('Shown (publish to make it live)'))} />
                        </>}
                        <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(x.id)}>{canEdit ? t('Edit') : t('View')}</Button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </BaseCard>
          )}
        </div>
      </div>
    </>
  );
}
