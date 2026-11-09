import Blockquote from '@tiptap/extension-blockquote';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { BubbleMenu, EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import clsx from 'clsx';
import {
  Archive, ArrowLeft, Bold, CheckCircle2, Circle, Eye, Heading2, Heading3, History, Italic, Link2, List, MessageSquareQuote, Pilcrow, Save, Send, Smartphone,
  Stethoscope, Undo2, UserPlus, XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { SiteImageField, FRAMES } from '@/components/media/SiteImage';
import { useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { FormField, Select, TextArea, TextInput, Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { blocksToDoc, bodyLinks, bodyWords, docToBlocks, type PMNode } from '@/lib/blogBody';
import {
  archivePost, authors as loadAuthors, CATEGORIES, post as loadPost, posts as loadPosts, previewToken, publishPost, restorePost, reviewPost, saveAuthor, savePost,
  submitPost, unpublishPost, WEBSITE_URL, type Author, type Category, type Post, type PostDraft,
} from '@/lib/cms';
import { fmtDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { useAutosave } from '@/lib/useAutosave';
import { AuthorModal, draftOf, PostStatus, shownStatus } from './BlogPage';
import { EditingNow, RevisionsModal, SaveIndicator } from './shared';
import { usePresence } from '@/lib/usePresence';
import { checkLinks } from '@/lib/care';
import { msg, tr, useT } from '@/lib/i18n';

// Same idea as the server's blog_needs_review(): the server decides, this only warns early.
const HEALTH = /(bleed|blood|fever|pain|headache|convuls|fits|seizure|swell|vision|breath|vomit|diarrh|rash|jaundice|discharge|faint|danger sign|dose|dosage|pregnan|pre-?eclampsia|miscarriage)/i;
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

const QuoteWithSource = Blockquote.extend({
  addAttributes() {
    return { source: { default: '', parseHTML: (el) => el.getAttribute('data-source') ?? '', renderHTML: (a) => (a.source ? { 'data-source': a.source } : {}) } };
  },
});

// ───────── toolbar, bubble menu and "/" menu
type Cmd = { key: string; label: string; icon: typeof Bold; run: (e: Editor) => void; active: (e: Editor) => boolean };
const BLOCKS: Cmd[] = [
  { key: 'p', label: msg('Paragraph'), icon: Pilcrow, run: (e) => e.chain().focus().setParagraph().run(), active: (e) => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('blockquote') },
  { key: 'h2', label: msg('Heading'), icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
  { key: 'h3', label: msg('Sub-heading'), icon: Heading3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
  { key: 'ul', label: msg('Bulleted list'), icon: List, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
  { key: 'quote', label: msg('Quote'), icon: MessageSquareQuote, run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
];
function setLink(e: Editor) {
  const prev = e.getAttributes('link').href as string | undefined;
  const url = window.prompt(tr('Link address (https://… or a page of the site such as /about). Leave empty to remove the link.'), prev ?? 'https://');
  if (url === null) return;
  if (!url.trim() || url.trim() === 'https://') { e.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
  if (!/^(https?:\/\/[^\s]+|\/[^\s]*)$/.test(url.trim())) { alert(tr('Use a full address starting with https:// or a site page starting with /')); return; }
  e.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
}
function TB({ on, label, icon: Icon, onClick }: { on?: boolean; label: string; icon: typeof Bold; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} title={label} aria-label={label} onMouseDown={(ev) => ev.preventDefault()} onClick={onClick}
      className={clsx('inline-flex h-11 w-11 items-center justify-center rounded-md', on ? 'bg-primary text-white' : 'text-ink hover:bg-primary-soft')}>
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
function Toolbar({ editor }: { editor: Editor }) {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); editor.on('transaction', f); return () => { editor.off('transaction', f); }; }, [editor]);
  const inQuote = editor.isActive('blockquote');
  const t = useT();
  return (
    <div className="sticky top-16 z-10 -mx-5 mb-4 flex flex-wrap items-center gap-1 border-b border-line bg-surface px-4 py-1 sm:-mx-6" role="toolbar" aria-label={t('Formatting')}>
      {BLOCKS.map((b) => <TB key={b.key} label={t(b.label)} icon={b.icon} on={b.active(editor)} onClick={() => b.run(editor)} />)}
      <span className="mx-1 h-6 w-px bg-line" aria-hidden />
      <TB label={t('Bold')} icon={Bold} on={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <TB label={t('Italic')} icon={Italic} on={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <TB label={t('Link')} icon={Link2} on={editor.isActive('link')} onClick={() => setLink(editor)} />
      {inQuote && (
        <label className="ml-2 flex min-w-0 flex-1 items-center gap-2 text-small font-semibold text-ink">
          <span className="shrink-0">{t('Quote source')}</span>
          <input value={String(editor.getAttributes('blockquote').source ?? '')} placeholder={t('Who said it, or where it was published (required)')}
            onChange={(ev) => editor.chain().updateAttributes('blockquote', { source: ev.target.value }).run()}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line px-3 text-small" />
        </label>
      )}
    </div>
  );
}
/** Type "/" at the start of an empty line to choose a block. */
function SlashMenu({ editor }: { editor: Editor }) {
  const [state, setState] = useState<{ q: string; top: number; left: number } | null>(null);
  const [idx, setIdx] = useState(0);
  const t = useT();
  const items = state ? BLOCKS.filter((b) => t(b.label).toLowerCase().includes(state.q.toLowerCase())) : [];
  useEffect(() => {
    const check = () => {
      const { $from, empty } = editor.state.selection;
      const text = $from.parent.textContent;
      if (empty && $from.parent.type.name === 'paragraph' && /^\/\w*$/.test(text) && $from.parentOffset === text.length) {
        const c = editor.view.coordsAtPos($from.pos);
        setState({ q: text.slice(1), top: c.bottom + window.scrollY + 4, left: c.left + window.scrollX });
      } else setState(null);
    };
    editor.on('transaction', check);
    return () => { editor.off('transaction', check); };
  }, [editor]);
  useEffect(() => setIdx(0), [state?.q]);
  const apply = useCallback((b: Cmd) => {
    const { $from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: $from.start(), to: $from.end() }).run();
    b.run(editor); setState(null);
  }, [editor]);
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (!items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % items.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i - 1 + items.length) % items.length); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); apply(items[idx]); }
      else if (e.key === 'Escape') setState(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state, items, idx, apply]);
  if (!state || !items.length) return null;
  return (
    <ul role="listbox" aria-label={t('Insert a block')} className="absolute z-20 w-56 rounded-md border border-line bg-surface p-1 shadow-raised" style={{ top: state.top, left: state.left }}>
      {items.map((b, i) => (
        <li key={b.key} role="option" aria-selected={i === idx}>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); apply(b); }} className={clsx('flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-small font-semibold', i === idx ? 'bg-primary-soft text-primary' : 'text-ink')}>
            <b.icon className="h-4 w-4" aria-hidden />{t(b.label)}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ───────── side panel bits
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-line bg-surface p-4 shadow-card"><h2 className="t-label mb-3">{title}</h2><div className="grid gap-4">{children}</div></section>;
}
function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  const t = useT();
  return <li className="flex items-start gap-2 text-small">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />}<span className={ok ? 'text-ink' : 'font-semibold text-ink'}>{children}<span className="sr-only">{ok ? ` ${t('(done)')}` : ` ${t('(to do)')}`}</span></span></li>;
}

function ReviewModal({ open, onClose, decision, needName, onDone }: { open: boolean; onClose: () => void; decision: 'approved' | 'changes_requested'; needName: boolean; onDone: (note: string, by: string) => Promise<void> }) {
  const [note, setNote] = useState(''), [by, setBy] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={decision === 'approved' ? t('Approve this version') : t('Ask for changes')}
      description={decision === 'approved' ? t('Your approval covers exactly this version. Any later change to the text needs a new review.') : t('The author sees your note in the editor.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button icon={Stethoscope} loading={busy} disabled={(decision === 'changes_requested' && note.trim().length < 3) || (decision === 'approved' && needName && by.trim().length < 3)}
        onClick={async () => { setBusy(true); setErr(null); try { await onDone(note.trim(), by.trim()); onClose(); } catch (e) { setErr((e as Error).message); } setBusy(false); }}>{decision === 'approved' ? t('Approve') : t('Send back')}</Button></>}>
      <div className="grid gap-4">
        {decision === 'approved' && needName && <FormField label={t('Reviewed by (role and cadre)')} required hint={t('For example: Registered midwife, Sample District.')}><TextInput value={by} onChange={(e) => setBy(e.target.value)} /></FormField>}
        <FormField label={decision === 'approved' ? t('Note (optional)') : t('What needs to change')} required={decision === 'changes_requested'}><TextArea rows={4} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

function SearchPreview({ title, description, slug, image }: { title: string; description: string; slug: string; image: string | null }) {
  const host = WEBSITE_URL.replace(/^https?:\/\//, '');
  const t = useT();
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-line p-3">
        <p className="t-caption">Google</p>
        <p className="t-caption truncate text-ink-2">{host} › blog › {slug}</p>
        <p className="truncate text-body font-semibold text-primary">{title || t('Post title')}</p>
        <p className="line-clamp-2 text-small text-ink-2">{description || t('The excerpt is used when there is no description.')}</p>
      </div>
      <div className="overflow-hidden rounded-md border border-line">
        <p className="t-caption px-3 pt-2">{t('WhatsApp / LinkedIn share')}</p>
        {image ? <img src={image} alt="" className="mt-2 aspect-[1376/768] w-full object-cover" /> : <div className="mt-2 aspect-[1376/768] w-full bg-surface-2" aria-hidden />}
        <div className="bg-surface-2 p-3"><p className="truncate text-small font-semibold text-ink">{title || t('Post title')}</p><p className="line-clamp-2 t-caption">{description}</p><p className="t-caption">{host}</p></div>
      </div>
    </div>
  );
}

// ───────── the editor page
export default function PostEditorPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(async () => ({ post: await loadPost(id), authors: await loadAuthors(), all: await loadPosts() }), [id]);
  const t = useT();
  if (loading) return <LoadingState text={t('Opening the post…')} />;
  if (error || !data) return <ErrorState text={error ?? ''} onRetry={() => reload()} />;
  if (!data.post) return <ErrorState title={t('Post not found')} text={t('It may have been archived.')} />;
  return <PostEditor key={data.post.id + data.post.draft_updated_at} post={data.post} authors={data.authors} others={data.all.filter((p) => p.id !== id)} onReload={() => reload(true)} />;
}

function PostEditor({ post, authors, others, onReload }: { post: Post; authors: Author[]; others: Post[]; onReload: () => void }) {
  const s = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const mine = post.created_by === s.userId;
  const canWrite = s.can('edit') || (s.role === 'author' && mine);
  const [d, setD] = useState<PostDraft>(() => draftOf(post as Post & Partial<PostDraft>));
  const [base, setBase] = useState({ json: JSON.stringify(draftOf(post as Post & Partial<PostDraft>)), at: post.draft_updated_at });
  const [slugTouched, setSlugTouched] = useState(!!post.published || !d.slug.startsWith('draft-'));
  const [authorList, setAuthorList] = useState(authors.filter((a) => !a.archived));
  const [newAuthor, setNewAuthor] = useState(false);
  const [history, setHistory] = useState(false);
  const [review, setReview] = useState<'approved' | 'changes_requested' | null>(null);
  const [honest, setHonest] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const editingNow = usePresence(`post:${post.id}`);
  const [links, setLinks] = useState<{ key: string; bad: { url: string; note: string }[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const t = useT();
  const set = (p: Partial<PostDraft>) => setD((x) => ({ ...x, ...p }));

  const editor = useEditor({
    editable: canWrite,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, blockquote: false, codeBlock: false, code: false, horizontalRule: false, strike: false, orderedList: false }),
      QuoteWithSource,
      Link.configure({ openOnClick: false, autolink: false, protocols: ['https', 'http'] }),
      Placeholder.configure({ placeholder: ({ node }) => (node.type.name === 'heading' ? tr('Heading') : tr('Write here. Type / for headings, lists and quotes.')) }),
    ],
    content: blocksToDoc(d.body) as object,
    onUpdate: ({ editor: e }) => setD((x) => ({ ...x, body: docToBlocks(e.getJSON() as PMNode) })),
    editorProps: { attributes: { class: 'post-body min-h-[24rem] outline-none', 'aria-label': t('Post text'), role: 'textbox', 'aria-multiline': 'true' } },
  });
  useEffect(() => { editor?.setEditable(canWrite); }, [editor, canWrite]);

  // title → address, until someone edits the address
  useEffect(() => { if (!slugTouched && d.title.trim()) set({ slug: slugify(d.title) || d.slug }); }, [d.title, slugTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(d) !== base.json;
  const save = async () => {
    try {
      const r = await savePost(post.id, d, base.at);
      setBase({ json: JSON.stringify(d), at: r.draft_updated_at });
    } catch (e) {
      if ((e as { code?: string }).code === '40001') setConflict((e as Error).message);
      throw e;
    }
  };
  const auto = useAutosave(dirty && canWrite && !conflict, save, { enabled: canWrite });
  const run = async (k: string, fn: () => Promise<unknown>, ok: string, reload = true) => {
    setBusy(k);
    try { if (dirty) await save(); await fn(); toast(ok); if (reload) onReload(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };

  const words = bodyWords(d.body);
  const autoMinutes = Math.max(1, Math.round(words / 200));
  const healthText = `${d.title} ${d.excerpt} ${d.body.map((b) => (b.type === 'ul' ? b.items.join(' ') : b.text)).join(' ')}`;
  const health = HEALTH.test(healthText) || d.category === 'Maternal Health';
  const allLinks = [...new Set(bodyLinks(d.body))];
  const linkKey = allLinks.join(' ');
  const badLinks = allLinks.filter((u) => !/^(https?:\/\/[^\s]+\.[^\s]+|\/[a-z0-9/_#?=&.-]*)$/i.test(u));
  const checks = [
    { ok: d.title.trim().length >= 3, text: t('Title') },
    { ok: d.excerpt.trim().length >= 40, text: t('Excerpt ({n} characters; aim for 140–220)', { n: d.excerpt.length }) },
    { ok: !!d.category && !!d.author_id && authorList.some((a) => a.id === d.author_id), text: t('Category and author') },
    { ok: !d.cover_url || !!d.cover_alt?.trim(), text: t('The cover picture has alt text') },
    { ok: d.body.length > 0, text: t('The post has text') },
    { ok: !d.body.some((b) => (b.type === 'h2' || b.type === 'h3') && !b.text.trim()), text: t('No empty headings') },
    { ok: !d.body.some((b) => b.type === 'quote' && !b.source?.trim()), text: t('Every quote has its source') },
    { ok: badLinks.length === 0, text: badLinks.length ? t('Links look wrong: {links}', { links: badLinks.join(', ') }) : t('Links are full https:// addresses or site pages') },
    { ok: linkKey === '' || (links?.key === linkKey && links.bad.length === 0), text: linkKey === '' ? t('No links to check') : links?.key !== linkKey ? t('Links checked (press “Check links”)') : links.bad.length ? t('Links that do not work: {links}', { links: links.bad.map((b) => `${b.url} (${b.note})`).join(', ') }) : t('Every link works') },
    { ok: honest, text: t('Honesty check: no invented figures, quotes, stories or partners; samples are labelled') },
  ];
  const reviewNeeded = post.health_review === 'requested' || post.health_review === 'changes_requested';
  const ready = checks.every((c) => c.ok) && !reviewNeeded;
  const status = shownStatus(post);
  const future = !!d.published_at && new Date(d.published_at) > new Date();
  const featuredOther = others.find((p) => p.featured && p.published && !p.archived);

  const preview = async (phone = false) => {
    const w = phone ? window.open('about:blank', 'sym-phone', 'width=420,height=860') : window.open('about:blank', '_blank');
    try { if (dirty) await save(); const tok = await previewToken(); const url = `${WEBSITE_URL}/blog/preview/${post.id}?preview=${tok}`; if (w) w.location.href = url; } catch (e) { w?.close(); toast((e as Error).message, 'bad'); }
  };
  const publish = () => {
    if (d.featured && featuredOther && !confirm(t('"{title}" is the featured post now. Feature this one instead?', { title: featuredOther.title }))) return;
    if (post.published && d.slug !== post.slug && !confirm(t('You changed the web address of a live post. Links to the old address will stop working. Continue?'))) return;
    run('pub', () => publishPost(post.id), future ? t('Scheduled for {date}', { date: fmtDate(d.published_at) }) : post.published ? t('Live post updated') : t('Published on the website'));
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => { if (!dirty || confirm(t('Leave without saving your changes?'))) nav('/website/blog'); }} className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> {t('All posts')}</button>
        <div className="flex flex-wrap items-center gap-2">
          <PostStatus p={post} />
          {canWrite && <SaveIndicator state={auto.state} dirty={dirty} error={auto.error} onRetry={auto.retry} />}
        </div>
      </div>
      <EditingNow names={editingNow} />
      {conflict && <ErrorState className="mb-4" title={t('Someone else changed this post')} text={<>{conflict} <Button size="sm" variant="outline" className="ml-2" onClick={() => { setConflict(null); onReload(); }}>{t('Reload (your unsaved changes are lost)')}</Button></>} />}
      {post.review_note && post.health_review === 'changes_requested' && <ErrorState className="mb-4" title={t('The clinical reviewer asked for changes')} text={post.review_note} />}
      {!canWrite && <p className="mb-4 rounded-md border border-line bg-surface-2 px-4 py-3 text-small text-ink">{s.role === 'author' ? t('Authors can edit only their own posts.') : t('You can read this post but not change it.')}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <BaseCard className="min-w-0 self-start">
          <h1 className="sr-only">{t('Edit blog post: {title}', { title: d.title || t('Untitled') })}</h1>
          <label className="sr-only" htmlFor="post-title">{t('Title')}</label>
          <textarea id="post-title" rows={1} value={d.title} readOnly={!canWrite} placeholder={t('Post title')} onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
            className="block w-full resize-none border-0 bg-transparent font-display text-h1 font-extrabold text-ink outline-none placeholder:text-ink-2/60" />
          <div className="mt-2">
            <label className="sr-only" htmlFor="post-excerpt">{t('Excerpt')}</label>
            <textarea id="post-excerpt" rows={2} value={d.excerpt} readOnly={!canWrite} maxLength={400} placeholder={t('Excerpt: one or two sentences that make people want to read on')}
              onChange={(e) => set({ excerpt: e.target.value })} className="block w-full resize-y rounded-md border border-line bg-surface-2 px-3 py-2 text-body text-ink outline-none focus:border-primary" />
            <p className={clsx('t-caption mt-1', d.excerpt.length > 0 && (d.excerpt.length < 140 || d.excerpt.length > 220) && 'text-warning')}>{t('{n} characters · aim for 140–220', { n: d.excerpt.length })}</p>
          </div>
          {health && <p className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small text-ink"><Stethoscope className="h-5 w-5 shrink-0 text-warning" aria-hidden /> {t('Clinical review recommended: this post talks about health. Posts that mention symptoms or danger signs can only be published after a clinical reviewer approves this exact version.')}</p>}
          <div className="mt-6">
            {editor && canWrite && <Toolbar editor={editor} />}
            {editor && canWrite && (
              <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex rounded-md border border-line bg-surface p-1 shadow-raised">
                <TB label={t('Bold')} icon={Bold} on={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
                <TB label={t('Italic')} icon={Italic} on={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
                <TB label={t('Link')} icon={Link2} on={editor.isActive('link')} onClick={() => setLink(editor)} />
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
            {editor && canWrite && <SlashMenu editor={editor} />}
          </div>
          <p className="t-caption mt-4">{t('{words} words · about {n} min to read', { words, n: autoMinutes })}</p>
        </BaseCard>

        <aside className="grid min-w-0 content-start gap-4" aria-label={t('Post settings')}>
          <Panel title={t('Publish')}>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={Eye} onClick={() => preview(false)}>{t('Preview')}</Button>
              <Button size="sm" variant="outline" icon={Smartphone} onClick={() => preview(true)}>{t('Phone view')}</Button>
              <Button size="sm" variant="ghost" icon={History} onClick={() => setHistory(true)}>{t('History')}</Button>
            </div>
            {canWrite && <Button size="sm" variant="outline" icon={Save} disabled={!dirty} loading={auto.state === 'saving'} onClick={auto.saveNow}>{t('Save now (Ctrl+S)')}</Button>}
            {s.can('edit') && (
              <>
                <FormField label={t('Publish date and time')} hint={t('Leave empty or choose now to publish at once; a future time schedules the post.')}>
                  <TextInput type="datetime-local" value={toLocal(d.published_at)} disabled={!canWrite} onChange={(e) => set({ published_at: fromLocal(e.target.value) })} />
                </FormField>
                <Button icon={Send} loading={busy === 'pub'} disabled={!ready} onClick={publish} title={ready ? undefined : t('Finish the checklist below first')}>
                  {future ? t('Schedule') : post.published ? t('Update live post') : t('Publish')}
                </Button>
                {post.published && <Button variant="outline" icon={Undo2} loading={busy === 'unpub'} onClick={() => { if (confirm(t('Take this post off the website?'))) run('unpub', () => unpublishPost(post.id), t('Taken off the website')); }}>{t('Unpublish')}</Button>}
              </>
            )}
            {s.role === 'author' && mine && (status === 'draft' || status === 'unpublished') && <Button icon={Send} loading={busy === 'submit'} onClick={() => run('submit', () => submitPost(post.id), t('Sent to the editors for review'))}>{t('Submit for review')}</Button>}
            {canWrite && health && post.health_review === 'not_needed' && <Button variant="outline" icon={Stethoscope} loading={busy === 'req'} onClick={() => run('req', () => reviewPost(post.id, 'requested', null, null), t('Sent to the clinical reviewers'))}>{t('Ask for clinical review')}</Button>}
            {s.can('review') && post.health_review !== 'not_needed' && post.health_review !== 'approved' && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={Stethoscope} onClick={() => setReview('approved')}>{t('Approve')}</Button>
                <Button size="sm" variant="outline" onClick={() => setReview('changes_requested')}>{t('Ask for changes')}</Button>
              </div>
            )}
            {post.health_review === 'approved' && post.reviewed_by && <p className="t-caption">{post.reviewed_on ? t('Clinically reviewed by {name}, {date}.', { name: post.reviewed_by, date: fmtDate(post.reviewed_on) }) : t('Clinically reviewed by {name}.', { name: post.reviewed_by })}</p>}
            {s.can('admin') && <Button size="sm" variant="ghost" icon={Archive} onClick={() => { if (confirm(t('Archive this post? It leaves the website and the list.'))) run('arch', () => archivePost(post.id, true), t('Post archived'), false).then(() => nav('/website/blog')); }}>{t('Archive')}</Button>}
          </Panel>

          <Panel title={t('Checklist before publishing')}>
            {linkKey !== '' && <Button size="sm" variant="outline" loading={checking} onClick={async () => {
              setChecking(true);
              try { const r = await checkLinks(allLinks); setLinks({ key: linkKey, bad: r.filter((x) => !x.ok) }); } catch (e) { toast((e as Error).message, 'bad'); }
              setChecking(false);
            }}>{t('Check links')}</Button>}
            <ul className="grid gap-2">{checks.map((c) => <Check key={c.text} ok={c.ok}>{c.text}</Check>)}{reviewNeeded && <Check ok={false}>{t('Clinical review of this version')}</Check>}</ul>
            {canWrite && <label className="flex min-h-11 items-start gap-3 text-small text-ink"><input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-primary" checked={honest} onChange={(e) => setHonest(e.target.checked)} />{t('I checked the honesty rules: every number and quote has a source, samples say so, and no clinic, ministry or partner is said to use or endorse the app unless an Admin recorded it.')}</label>}
          </Panel>

          <Panel title={t('Post settings')}>
            <FormField label={t('Web address')} hint={post.published ? t('Changing the address of a live post breaks old links.') : `${WEBSITE_URL.replace(/^https?:\/\//, '')}/blog/${d.slug}`}
              error={d.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug) ? t('Lower-case letters, digits and single hyphens') : others.some((p) => p.slug === d.slug) ? t('Another post uses this address') : undefined}>
              <TextInput value={d.slug} disabled={!canWrite} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }); }} />
            </FormField>
            <FormField label={t('Category')}><Select value={d.category} disabled={!canWrite} onChange={(e) => set({ category: e.target.value as Category })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></FormField>
            <div className="grid gap-2">
              <FormField label={t('Author')}><Select value={d.author_id} disabled={!canWrite} onChange={(e) => set({ author_id: e.target.value })}>{authorList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></FormField>
              {s.can('edit') && <Button size="sm" variant="ghost" icon={UserPlus} className="justify-self-start" onClick={() => setNewAuthor(true)}>{t('Add an author')}</Button>}
            </div>
            <SiteImageField label={t('Cover picture')} frame={FRAMES.blogCover} disabled={!canWrite} hint={t('Required alt text. Illustrations start with “Illustration:”.')}
              value={d.cover_url ? { src: d.cover_url, alt: d.cover_alt ?? '', ...(d.cover_small_url ? { small: d.cover_small_url } : {}) } : null}
              onChange={(p) => set({ cover_url: p?.src ?? null, cover_small_url: p?.small ?? null, cover_alt: p?.alt ?? null })} />
            <Toggle label={t('Featured post')} description={featuredOther && !d.featured ? t('Now featured: {title}', { title: featuredOther.title }) : t('Shown first on the blog. Only one post is featured.')} checked={d.featured} onChange={(v) => canWrite && set({ featured: v })} />
            <FormField label={t('Reading time (minutes)')} hint={d.reading_minutes ? t('Set by hand') : t('Worked out from the text: {n} min', { n: autoMinutes })}>
              <div className="flex gap-2">
                <TextInput inputMode="numeric" value={d.reading_minutes ? String(d.reading_minutes) : ''} placeholder={String(autoMinutes)} disabled={!canWrite} onChange={(e) => set({ reading_minutes: e.target.value ? Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 1) : null })} />
                {d.reading_minutes && canWrite && <Button size="sm" variant="ghost" onClick={() => set({ reading_minutes: null })}>{t('Auto')}</Button>}
              </div>
            </FormField>
          </Panel>

          <Panel title={t('Search and sharing')}>
            <FormField label={t('Search title')} hint={t('{n}/70 · empty = the post title', { n: (d.seo_title ?? '').length })}><TextInput maxLength={70} value={d.seo_title ?? ''} disabled={!canWrite} onChange={(e) => set({ seo_title: e.target.value || null })} /></FormField>
            <FormField label={t('Search description')} hint={t('{n}/200 · empty = the excerpt', { n: (d.seo_description ?? '').length })}><TextArea rows={3} maxLength={200} value={d.seo_description ?? ''} disabled={!canWrite} onChange={(e) => set({ seo_description: e.target.value || null })} /></FormField>
            <SearchPreview title={d.seo_title || d.title} description={d.seo_description || d.excerpt} slug={d.slug} image={d.cover_small_url ?? d.cover_url} />
          </Panel>
          <p className="t-caption flex items-center gap-2"><Circle className="h-3 w-3" aria-hidden /> {t('Saved automatically every 10 seconds while you write.')}</p>
        </aside>
      </div>

      <AuthorModal value={newAuthor ? { id: '', name: '', role: '', bio: '', isNew: true } : null} onClose={() => setNewAuthor(false)}
        onSave={async (a) => { try { await saveAuthor(a); setAuthorList(await loadAuthors().then((l) => l.filter((x) => !x.archived))); set({ author_id: a.id }); setNewAuthor(false); toast(t('Author added')); } catch (e) { toast((e as Error).message, 'bad'); } }} />
      <RevisionsModal open={history} onClose={() => setHistory(false)} table="blog_posts" rowId={post.id}
        describe={(r) => { const x = (r.snapshot as { draft?: Partial<PostDraft> }).draft; return x ? `${x.title ?? ''} · ${t('{n} blocks', { n: (x.body ?? []).length })}` : ''; }}
        onRestore={async (r) => { await restorePost(post.id, r.id); onReload(); }} />
      <ReviewModal open={!!review} onClose={() => setReview(null)} decision={review ?? 'approved'} needName={s.role !== 'clinical_reviewer'}
        onDone={async (note, by) => { await reviewPost(post.id, review!, note || null, by || null); toast(review === 'approved' ? t('Approved') : t('Sent back to the author')); onReload(); }} />
    </>
  );
}


