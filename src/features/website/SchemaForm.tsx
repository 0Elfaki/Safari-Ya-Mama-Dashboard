// Builds an edit form from a section's content (plain JSON from the website's site-defaults.json).
// Field kinds come from the value and the field's name (the naming rules agreed with the website):
//   picture objects {src, alt} or names ending in image/picture/screenshot/logo/cover/photo/illustration
//   links: names ending in href/link/url · long text: lead/body/text/description/answer/note/quote/summary/bio/intro
//   icon: a lucide icon name · fixed choices: fieldOptions[name]
// Lists of items can be added to, removed from and reordered.
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SiteImageField, type Picture } from '@/components/media/SiteImage';
import { Button, IconButton } from '@/components/ui/Button';
import { FormField, Select, TextArea, TextInput, Toggle } from '@/components/ui/FormField';
import { msg, tr, useT } from '@/lib/i18n';

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

const PICTURE = /(image|picture|screenshot|logo|cover|photo|illustration)$/i;
const LINK = /(href|link|url)$/i;
const LONG = /(^|_)(lead|body|text|description|answer|note|quote|summary|bio|intro)$|(Lead|Body|Text|Description|Answer|Note|Quote|Summary|Bio|Intro)$/;
const ICONS = ['ShieldCheck', 'HeartPulse', 'Baby', 'Stethoscope', 'Bell', 'BookOpen', 'MessageCircle', 'Smartphone', 'Users', 'Sparkles', 'Calendar', 'MapPin', 'Phone', 'Heart', 'Activity', 'Lock', 'Globe', 'CheckCircle2', 'AlertTriangle', 'Lightbulb', 'Mic', 'WifiOff', 'Languages', 'ClipboardList', 'Brain'];

/** Field names in the website's site-defaults.json (humanized), so the form labels can be shown in Kiswahili. */
export const FIELD_LABELS = [
  msg('Eyebrow'), msg('Title'), msg('Lead'), msg('Primary label'), msg('Primarylink'), msg('Secondary label'), msg('Secondarylink'), msg('Facts'),
  msg('Icon'), msg('Label'), msg('Hero image'), msg('Src'), msg('Small'), msg('Alt'), msg('Phone screenshot'), msg('Chat label'),
  msg('Chat question'), msg('Chat answer strong'), msg('Chat answer'), msg('Image'), msg('Timeline title'), msg('Timeline note'),
  msg('Symptom week'), msg('Symptom title'), msg('Symptom text'), msg('Gap title'), msg('Gap text'), msg('Answer prefix'), msg('Stages'),
  msg('Phase'), msg('Question'), msg('Challenges'), msg('Answer'), msg('Quote'), msg('Step prefix'), msg('Steps'), msg('Verb'), msg('Body'),
  msg('Screen type'), msg('Screenshot'), msg('Worries'), msg('Chat source note'), msg('Status label'), msg('Status chips'), msg('Mood title'),
  msg('Mood start'), msg('Mood middle'), msg('Mood end'), msg('Illustrative label'), msg('Cta label'), msg('Ctalink'), msg('Principles'),
  msg('Closing note'), msg('Rag badge'), msg('Rag title'), msg('Rag note'), msg('Rag steps'), msg('Status'), msg('Card title'), msg('Card text'),
  msg('Pillars'), msg('Links'), msg('Link'), msg('Concept note'), msg('Tabs'), msg('Points'), msg('Screen status'), msg('Demo notice title'),
  msg('Demo notice text'), msg('Lesson slugs'), msg('Post count'), msg('Cards'), msg('Image position'), msg('Features'), msg('Commitments title'),
  msg('Commitments'), msg('Profile title'), msg('Demo label'), msg('Note'), msg('Pipeline'), msg('Highlight'), msg('Rules title'), msg('Rules text'),
  msg('Live title'), msg('Live text'), msg('Channels'), msg('Items'), msg('Architecture title'), msg('Clients'), msg('Audience'),
  msg('Backend title'), msg('Backend items'), msg('External note'), msg('Measure heading'), msg('Target heading'), msg('Targets'), msg('Measure'),
  msg('Target'), msg('Target prefix'), msg('No target text'), msg('Indicators'), msg('Description'), msg('Closing title'), msg('Closing text'),
  msg('Search placeholder'), msg('Search note'), msg('All topics label'), msg('Saved label'), msg('Lesson slug'), msg('Featured prefix'),
  msg('Read label'), msg('Minutes label'), msg('Results title'), msg('Empty title'), msg('Empty text'), msg('Empty saved text'), msg('Clear label'),
  msg('More label'), msg('All label'), msg('Featured link label'), msg('Done'), msg('Next'), msg('Phases'), msg('When'), msg('Text'),
  msg('Button label'), msg('Buttonlink'), msg('Email title'), msg('Email note'), msg('Warning title'), msg('Warning text'), msg('Name label'),
  msg('Email label'), msg('Organisation label'), msg('Topic label'), msg('Topic placeholder'), msg('Message label'), msg('Consent text'),
  msg('Send label'), msg('Sending label'), msg('Connected note'), msg('Not connected note'), msg('Sent title'), msg('Sent text'),
  msg('Not sent title'), msg('Not sent text'), msg('Open email label'), msg('Edit label'), msg('Failed text'), msg('Rate limited text'), msg('Site'),
  msg('Name'), msg('Tagline'), msg('Email'), msg('Org name'), msg('Org url'), msg('Nav'), msg('Home label'), msg('Contact label'),
  msg('Contactlink'), msg('Social'), msg('Whatsapp url'), msg('Linkedin url'), msg('X url'), msg('Facebook url'), msg('Instagram url'),
  msg('Youtube url'), msg('Footer'), msg('Columns'), msg('Built by text'), msg('Bottom note'), msg('Banner'), msg('On'), msg('Link label'),
  msg('Link link'), msg('Tone')
];

const isObj = (v: Json): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isPicture = (k: string, v: Json) => (isObj(v) && typeof v.src === 'string') || (PICTURE.test(k) && (typeof v === 'string' || v === null));
export function humanize(k: string) {
  if (/href$/i.test(k)) k = k.replace(/href$/i, 'link');
  const s = k.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** An empty item with the same shape as an example (for "Add item"). */
function blank(v: Json): Json {
  if (typeof v === 'string') return '';
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  if (Array.isArray(v)) return [];
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'src' ? '' : blank(x)]));
  return null;
}
function itemTitle(v: Json, i: number) {
  if (typeof v === 'string') return v || tr('Item {n}', { n: i + 1 });
  if (isObj(v)) {
    for (const k of ['title', 'label', 'name', 'heading', 'verb', 'question', 'text']) if (typeof v[k] === 'string' && v[k]) return String(v[k]);
    const first = Object.values(v).find((x) => typeof x === 'string' && x);
    if (first) return String(first);
  }
  return tr('Item {n}', { n: i + 1 });
}

interface Ctx { options: Record<string, string[]>; disabled?: boolean }

function Field({ name, value, onChange, ctx, depth }: { name: string; value: Json; onChange: (v: Json) => void; ctx: Ctx; depth: number }) {
  const t = useT();
  const label = t(humanize(name));
  if (name === '_hints' || name.startsWith('_')) return null;
  if (isPicture(name, value)) {
    const pic: Picture | null = isObj(value) ? (value.src ? { src: String(value.src), alt: String(value.alt ?? ''), ...(value.small ? { small: String(value.small) } : {}) } : null) : value ? { src: String(value), alt: '' } : null;
    return <SiteImageField label={label} value={pic} disabled={ctx.disabled}
      hint={typeof value === 'string' ? t('Picture address') : t('Describe what the picture shows.')}
      onChange={(p) => onChange(isObj(value) || value === null ? (p ? { ...(isObj(value) ? value : {}), src: p.src, alt: p.alt, ...(p.small ? { small: p.small } : {}) } : (isObj(value) ? { ...value, src: '', alt: '' } : null)) : p?.src ?? '')} />;
  }
  if (typeof value === 'boolean') return <Toggle label={label} checked={value} onChange={(v) => !ctx.disabled && onChange(v)} />;
  if (typeof value === 'number') return <FormField label={label}><TextInput type="number" value={String(value)} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></FormField>;
  if (typeof value === 'string' || value === null) {
    const v = value ?? '';
    if (ctx.options[name]) return (
      <FormField label={label}><Select value={v} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value)}>
        {!ctx.options[name].includes(v) && <option value={v}>{v || '—'}</option>}
        {ctx.options[name].map((o) => <option key={o} value={o}>{o}</option>)}
      </Select></FormField>
    );
    if (name === 'icon') return (
      <FormField label={t('Icon')} hint={t('An icon name, for example ShieldCheck or HeartPulse.')}><TextInput list="sym-icons" value={v} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value)} /></FormField>
    );
    if (LINK.test(name)) return <FormField label={label} hint={t('A page of the site (/about) or a full address (https://…).')}><TextInput value={v} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value)} /></FormField>;
    if (LONG.test(name) || v.length > 90 || v.includes('\n')) return <FormField label={label}><TextArea rows={Math.min(8, Math.max(3, Math.ceil(v.length / 80)))} value={v} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value)} /></FormField>;
    return <FormField label={label} hint={v.includes('*') ? t('Words between *stars* are shown in the accent colour.') : undefined}><TextInput value={v} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value)} /></FormField>;
  }
  if (Array.isArray(value)) return <ListField name={name} value={value} onChange={onChange} ctx={ctx} depth={depth} />;
  if (isObj(value)) return (
    <Group title={label} depth={depth}>
      <ObjectFields value={value} onChange={onChange} ctx={ctx} depth={depth + 1} />
    </Group>
  );
  return null;
}

function Group({ title, children, depth, actions, defaultOpen = true }: { title: string; children: ReactNode; depth: number; actions?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={clsx('min-w-0 rounded-md border border-line', depth > 1 ? 'bg-surface' : 'bg-surface-2/60')}>
      <div className="flex items-center gap-2 px-3 py-1">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-small font-semibold text-ink">
          <ChevronDown className={clsx('h-4 w-4 shrink-0 transition-transform', !open && '-rotate-90')} aria-hidden /><span className="truncate">{title}</span>
        </button>
        {actions}
      </div>
      {open && <div className="grid gap-4 border-t border-line p-3">{children}</div>}
    </div>
  );
}

function ListField({ name, value, onChange, ctx, depth }: { name: string; value: Json[]; onChange: (v: Json) => void; ctx: Ctx; depth: number }) {
  const set = (i: number, v: Json) => onChange(value.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const example = value[0] ?? '';
  const simple = value.every((x) => typeof x === 'string' || typeof x === 'number');
  const t = useT();
  return (
    <Group title={`${t(humanize(name))} (${value.length})`} depth={depth}>
      <ol className="grid gap-3">
        {value.map((item, i) => {
          const tools = !ctx.disabled && (
            <span className="flex shrink-0">
              <IconButton icon={ArrowUp} label={t('Move {n} up', { n: i + 1 })} disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label={t('Move {n} down', { n: i + 1 })} disabled={i === value.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon={Copy} label={t('Duplicate {n}', { n: i + 1 })} onClick={() => onChange([...value.slice(0, i + 1), JSON.parse(JSON.stringify(item)), ...value.slice(i + 1)])} />
              <IconButton icon={Trash2} label={t('Remove {n}', { n: i + 1 })} onClick={() => onChange(value.filter((_, j) => j !== i))} />
            </span>
          );
          return (
            <li key={i} className="min-w-0">
              {simple ? (
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1"><Field name={`${name.replace(/s$/, '')} ${i + 1}`} value={item} onChange={(v) => set(i, v)} ctx={ctx} depth={depth + 1} /></div>
                  {tools}
                </div>
              ) : (
                <Group title={`${i + 1}. ${itemTitle(item, i)}`} depth={depth + 1} actions={tools} defaultOpen={value.length <= 3}>
                  {isObj(item) ? <ObjectFields value={item} onChange={(v) => set(i, v)} ctx={ctx} depth={depth + 2} /> : <Field name={name} value={item} onChange={(v) => set(i, v)} ctx={ctx} depth={depth + 2} />}
                </Group>
              )}
            </li>
          );
        })}
      </ol>
      {!ctx.disabled && <Button size="sm" variant="outline" icon={Plus} className="justify-self-start" onClick={() => onChange([...value, blank(example)])}>{t('Add')}</Button>}
    </Group>
  );
}

export function ObjectFields({ value, onChange, ctx, depth = 0 }: { value: Obj; onChange: (v: Obj) => void; ctx: Ctx; depth?: number }) {
  const entries = Object.entries(value).filter(([k]) => !k.startsWith('_'));
  // short fields first in a grid, then pictures, long texts and lists
  const isWide = (k: string, v: Json) => isPicture(k, v) || Array.isArray(v) || isObj(v) || (typeof v === 'string' && (LONG.test(k) || v.length > 90));
  const narrow = entries.filter(([k, v]) => !isWide(k, v)), wide = entries.filter(([k, v]) => isWide(k, v));
  return (
    <div className="grid min-w-0 gap-4">
      {narrow.length > 0 && <div className="grid gap-4 md:grid-cols-2">{narrow.map(([k, v]) => <Field key={k} name={k} value={v} onChange={(x) => onChange({ ...value, [k]: x })} ctx={ctx} depth={depth} />)}</div>}
      {wide.map(([k, v]) => <Field key={k} name={k} value={v} onChange={(x) => onChange({ ...value, [k]: x })} ctx={ctx} depth={depth} />)}
    </div>
  );
}

/** The whole form for one section (or one settings group). */
export function SchemaForm({ value, onChange, options = {}, disabled }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; options?: Record<string, string[]>; disabled?: boolean }) {
  return (
    <>
      <datalist id="sym-icons">{ICONS.map((i) => <option key={i} value={i} />)}</datalist>
      <ObjectFields value={value as Obj} onChange={(v) => onChange(v)} ctx={{ options, disabled }} />
    </>
  );
}
