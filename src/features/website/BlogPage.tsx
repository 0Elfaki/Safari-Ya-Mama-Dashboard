import { Archive, Copy, Newspaper, Plus, Stethoscope, Undo2, UserPen, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/Shell';
import { Chips, Table, Tabs, Td, Th, useTab, useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { FormField, SearchInput, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { archiveAuthor, archivePost, authors as loadAuthors, CATEGORIES, posts as loadPosts, savePost, saveAuthor, unpublishPost, type Author, type Post, type PostDraft } from '@/lib/cms';
import { ago, fmtDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { msg, useT } from '@/lib/i18n';

export type Shown = 'draft' | 'in_review' | 'scheduled' | 'published' | 'unpublished' | 'archived';
export const shownStatus = (p: Pick<Post, 'archived' | 'published' | 'published_at' | 'status'>): Shown =>
  p.archived ? 'archived' : p.published ? (new Date(p.published_at) > new Date() ? 'scheduled' : 'published') : p.status === 'in_review' ? 'in_review' : p.status === 'unpublished' ? 'unpublished' : 'draft';
const LABEL: Record<Shown, string> = { draft: msg('Draft'), in_review: msg('In review'), scheduled: msg('Scheduled'), published: msg('Published'), unpublished: msg('Unpublished'), archived: msg('Archived') };
const TONE: Record<Shown, 'neutral' | 'warning' | 'success' | 'primary'> = { draft: 'neutral', in_review: 'warning', scheduled: 'primary', published: 'success', unpublished: 'neutral', archived: 'neutral' };
export function PostStatus({ p }: { p: Post }) {
  const s = shownStatus(p);
  const t = useT();
  return (
    <span className="flex flex-wrap gap-2">
      <StatusBadge tone={TONE[s]}>{t(LABEL[s])}{s === 'scheduled' ? ` · ${fmtDate(p.published_at)}` : ''}</StatusBadge>
      {p.published && p.has_draft_changes && <StatusBadge tone="warning">{t('Unpublished changes')}</StatusBadge>}
      {p.health_review === 'requested' && <StatusBadge tone="warning" icon={Stethoscope}>{t('Awaiting clinical review')}</StatusBadge>}
      {p.health_review === 'changes_requested' && <StatusBadge tone="danger" icon={Stethoscope}>{t('Reviewer asked for changes')}</StatusBadge>}
      {p.health_review === 'approved' && <StatusBadge tone="success" icon={Stethoscope}>{t('Clinically reviewed')}</StatusBadge>}
    </span>
  );
}

export const emptyDraft = (author = 'content'): PostDraft => ({
  title: '', slug: `draft-${Math.random().toString(36).slice(2, 8)}`, excerpt: '', category: 'Product Updates', author_id: author, published_at: null,
  reading_minutes: null, cover_url: null, cover_small_url: null, cover_alt: null, featured: false, body: [], seo_title: null, seo_description: null,
});
/** The editable copy of a post (older rows may have an empty draft: start from the live fields). */
export function draftOf(p: Post & Partial<PostDraft>): PostDraft {
  const d = p.draft ?? {};
  const base = emptyDraft(p.author_id);
  return {
    ...base, title: p.title, slug: p.slug, excerpt: p.excerpt, category: p.category, author_id: p.author_id, published_at: p.published_at,
    reading_minutes: p.reading_minutes ?? null, cover_url: p.cover_url ?? null, cover_small_url: p.cover_small_url ?? null, cover_alt: p.cover_alt ?? null,
    featured: p.featured, body: (p.body as PostDraft['body']) ?? [], seo_title: p.seo_title ?? null, seo_description: p.seo_description ?? null,
    ...(Object.keys(d).length ? d : {}),
  } as PostDraft;
}

function AuthorsTab() {
  const s = useSession();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(loadAuthors, []);
  const [edit, setEdit] = useState<{ id: string; name: string; role: string; bio: string; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();
  if (loading) return <LoadingState text={t('Loading authors…')} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  const list = (data ?? []).filter((a) => !a.archived);
  return (
    <>
      <div className="mb-4 flex justify-end">{s.can('edit') && <Button icon={Plus} onClick={() => setEdit({ id: '', name: '', role: '', bio: '', isNew: true })}>{t('New author')}</Button>}</div>
      <BaseCard>
        {list.length === 0 ? <EmptyState icon={Users} title={t('No authors yet')} /> : (
          <ul className="divide-y divide-line">
            {list.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1"><b className="block text-ink">{a.name}</b><span className="t-small block">{a.role ?? '—'} · {a.id}</span>{a.bio && <span className="t-caption block">{a.bio}</span>}</span>
                {s.can('edit') && <>
                  <Button size="sm" variant="outline" icon={UserPen} onClick={() => setEdit({ id: a.id, name: a.name, role: a.role ?? '', bio: a.bio ?? '', isNew: false })}>{t('Edit')}</Button>
                  <Button size="sm" variant="ghost" icon={Archive} onClick={async () => { try { await archiveAuthor(a.id); toast(t('Author archived')); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } }}>{t('Archive')}</Button>
                </>}
              </li>
            ))}
          </ul>
        )}
      </BaseCard>
      <AuthorModal value={edit} onClose={() => setEdit(null)} busy={busy} onSave={async (a) => {
        setBusy(true);
        try { await saveAuthor(a); toast(t('Author saved')); setEdit(null); reload(true); } catch (e) { toast((e as Error).message, 'bad'); }
        setBusy(false);
      }} />
    </>
  );
}

export function AuthorModal({ value, onClose, onSave, busy }: { value: { id: string; name: string; role: string; bio: string; isNew: boolean } | null; onClose: () => void; onSave: (a: { id: string; name: string; role: string; bio: string }) => void; busy?: boolean }) {
  const [a, setA] = useState(value);
  const t = useT();
  if (value && (!a || a.id !== value.id || a.isNew !== value.isNew)) setA(value);
  if (!value || !a) return null;
  const id = a.isNew ? (a.id || a.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) : a.id;
  return (
    <Modal open={!!value} onClose={onClose} title={a.isNew ? t('New author') : t('Edit author')} footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button loading={busy} disabled={a.name.trim().length < 2 || !id} onClick={() => onSave({ id, name: a.name, role: a.role, bio: a.bio })}>{t('Save author')}</Button></>}>
      <div className="grid gap-4">
        <FormField label={t('Name')} required><TextInput value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></FormField>
        <FormField label={t('Role')} hint={t('For example: Health education content')}><TextInput value={a.role} onChange={(e) => setA({ ...a, role: e.target.value })} /></FormField>
        <FormField label={t('Short bio')}><TextArea rows={3} value={a.bio} onChange={(e) => setA({ ...a, bio: e.target.value })} /></FormField>
        {a.isNew && <p className="t-caption">{t('Author id: {id}', { id: id || '—' })}</p>}
      </div>
    </Modal>
  );
}

function PostsTab() {
  const s = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(async () => ({ posts: await loadPosts(), authors: await loadAuthors() }), []);
  const [status, setStatus] = useState<'all' | Shown>('all');
  const [cat, setCat] = useState(''), [author, setAuthor] = useState(''), [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const t = useT();
  const posts = data?.posts ?? [];
  const authorName = (id: string) => data?.authors.find((a: Author) => a.id === id)?.name ?? id;
  const list = useMemo(() => posts.filter((p) => {
    const st = shownStatus(p), d = { ...p, ...p.draft } as Post;
    if (status === 'all' ? st === 'archived' : st !== status) return false;
    if (cat && d.category !== cat) return false;
    if (author && d.author_id !== author) return false;
    if (q && !`${d.title} ${d.excerpt}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [posts, status, cat, author, q]);
  const count = (x: Shown) => posts.filter((p) => shownStatus(p) === x).length;

  const create = async (from?: Post) => {
    setBusy('new');
    try {
      const d = from ? { ...draftOf(from as Post & Partial<PostDraft>), title: `${from.title} (copy)`, slug: `${from.slug}-copy-${Math.random().toString(36).slice(2, 5)}`, featured: false, published_at: null } : emptyDraft();
      const r = await savePost(null, d, null);
      nav(`/website/blog/${r.id}`);
    } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  const bulk = async (what: 'unpublish' | 'archive') => {
    if (!confirm(what === 'archive' ? t('Archive {n} posts?', { n: picked.size }) : t('Unpublish {n} posts?', { n: picked.size }))) return;
    setBusy(what);
    try { for (const id of picked) await (what === 'archive' ? archivePost(id, true) : unpublishPost(id)); toast(t('Done')); setPicked(new Set()); reload(true); }
    catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };

  if (loading) return <LoadingState text={t('Loading posts…')} />;
  if (error || !data) return <ErrorState text={error ?? ''} onRetry={() => reload()} />;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Chips label={t('Show posts')} value={status} onChange={(v) => { setStatus(v); setPicked(new Set()); }} options={[
          { value: 'all', label: t('All'), count: posts.filter((p) => !p.archived).length }, { value: 'draft', label: t('Drafts'), count: count('draft') },
          { value: 'in_review', label: t('In review'), count: count('in_review') }, { value: 'scheduled', label: t('Scheduled'), count: count('scheduled') },
          { value: 'published', label: t('Published'), count: count('published') }, { value: 'unpublished', label: t('Unpublished'), count: count('unpublished') },
          ...(s.can('admin') ? [{ value: 'archived' as const, label: t('Archived'), count: count('archived') }] : [])]} />
        {s.can('write') && <Button icon={Plus} loading={busy === 'new'} onClick={() => create()}>{t('New blog post')}</Button>}
      </div>
      <BaseCard className="mb-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <SearchInput value={q} onChange={setQ} placeholder={t('Search titles and excerpts')} label={t('Search posts')} />
          <Select aria-label={t('Category')} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{t('All categories')}</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          <Select aria-label={t('Author')} value={author} onChange={(e) => setAuthor(e.target.value)}><option value="">{t('All authors')}</option>{data.authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        </div>
      </BaseCard>
      {picked.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-2 px-4 py-2">
          <span className="text-small font-semibold text-ink">{t('{n} selected', { n: picked.size })}</span>
          {s.can('edit') && <Button size="sm" variant="outline" icon={Undo2} loading={busy === 'unpublish'} onClick={() => bulk('unpublish')}>{t('Unpublish')}</Button>}
          {s.can('admin') && <Button size="sm" variant="outline" icon={Archive} loading={busy === 'archive'} onClick={() => bulk('archive')}>{t('Archive')}</Button>}
        </div>
      )}
      <BaseCard>
        {list.length === 0 ? <EmptyState icon={Newspaper} title={posts.length ? t('No posts match') : t('No blog posts yet')} text={posts.length ? undefined : t('Posts written here appear on the website blog when published. The posts built into the website stay until a post with the same address replaces them.')}
          action={s.can('write') && !posts.length ? <Button icon={Plus} onClick={() => create()}>{t('Write the first post')}</Button> : undefined} /> : (
          <Table caption={t('Blog posts')}>
            <thead><tr>{s.can('edit') && <Th><span className="sr-only">{t('Select')}</span></Th>}<Th>{t('Title')}</Th><Th>{t('Status')}</Th><Th>{t('Category')}</Th><Th>{t('Author')}</Th><Th>{t('Publish date')}</Th><Th>{t('Last edited')}</Th><Th><span className="sr-only">{t('Actions')}</span></Th></tr></thead>
            <tbody>{list.map((p) => {
              const d = { ...p, ...p.draft } as Post;
              return (
                <tr key={p.id} className="hover:bg-surface-2">
                  {s.can('edit') && <Td><input type="checkbox" className="h-6 w-6 accent-primary" aria-label={t('Select {title}', { title: d.title })} checked={picked.has(p.id)} onChange={(e) => setPicked((x) => { const n = new Set(x); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} /></Td>}
                  <Td><button type="button" onClick={() => nav(`/website/blog/${p.id}`)} className="min-h-11 text-left font-semibold text-primary underline-offset-2 hover:underline">{d.title || t('Untitled')}</button><span className="t-caption block">/{d.slug}</span></Td>
                  <Td><PostStatus p={p} /></Td><Td>{d.category}</Td><Td>{authorName(d.author_id)}</Td>
                  <Td className="whitespace-nowrap">{p.published ? fmtDate(p.published_at) : (p.draft as Partial<PostDraft>).published_at ? fmtDate((p.draft as Partial<PostDraft>).published_at!) : '—'}</Td>
                  <Td className="whitespace-nowrap">{ago(p.draft_updated_at)}</Td>
                  <Td>{s.can('write') && <Button size="sm" variant="ghost" icon={Copy} aria-label={t('Duplicate {title}', { title: d.title })} onClick={() => create(p)}>{t('Duplicate')}</Button>}</Td>
                </tr>
              );
            })}</tbody>
          </Table>
        )}
      </BaseCard>
    </>
  );
}

const TABS = ['posts', 'authors'] as const;
export default function BlogPage() {
  const [tab, setTab] = useTab(TABS, 'posts');
  const t = useT();
  return (
    <>
      <PageHeader title={t('Blog')} subtitle={t("Write, review and publish the website's blog. Posts that mention symptoms or danger signs need a clinical reviewer's approval of the exact version before they go live.")} />
      <Tabs label={t('Blog')} value={tab} onChange={setTab} tabs={[{ value: 'posts', label: t('Posts'), icon: Newspaper }, { value: 'authors', label: t('Authors'), icon: Users }]} />
      {tab === 'posts' ? <PostsTab /> : <AuthorsTab />}
    </>
  );
}
