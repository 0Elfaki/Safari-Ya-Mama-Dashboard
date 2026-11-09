// Blog body conversion: TipTap (ProseMirror JSON) ⇄ the website's block list.
// The website renders exactly these blocks (keep the shape):
//   { type: 'p' | 'h2' | 'h3', text } · { type: 'ul', items: [...] } · { type: 'quote', text, source? }
// Inline marks travel inside the text as **bold**, *italic* and [text](https://…).
import type { Block } from './cms';

export interface PMNode { type: string; attrs?: Record<string, unknown>; content?: PMNode[]; text?: string; marks?: { type: string; attrs?: Record<string, unknown> }[] }

const esc = (s: string) => s.replace(/([*[\]])/g, '\\$1');
const unesc = (s: string) => s.replace(/\\([*[\]])/g, '$1');

/** Inline nodes → text with marks. */
export function inlineToText(nodes: PMNode[] = []): string {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'hardBreak') { out += ' '; continue; }
    if (n.type !== 'text' || !n.text) continue;
    let t = esc(n.text);
    const has = (m: string) => n.marks?.some((x) => x.type === m);
    // keep surrounding spaces outside the markers so "**bold** text" stays valid
    const lead = t.match(/^\s*/)![0], trail = t.match(/\s*$/)![0];
    let core = t.trim();
    if (core) {
      if (has('italic')) core = `*${core}*`;
      if (has('bold')) core = `**${core}**`;
      const link = n.marks?.find((x) => x.type === 'link');
      if (link) core = `[${core}](${String(link.attrs?.href ?? '')})`;
      t = lead + core + trail;
    }
    out += t;
  }
  return out.trim();
}

const blockText = (n: PMNode) => inlineToText(n.content);
const paragraphs = (n: PMNode) => (n.content ?? []).filter((c) => c.type === 'paragraph').map(blockText).filter(Boolean);

/** Editor document → website blocks. Empty paragraphs are dropped. */
export function docToBlocks(doc: PMNode): Block[] {
  const out: Block[] = [];
  for (const n of doc.content ?? []) {
    if (n.type === 'paragraph') { const t = blockText(n); if (t) out.push({ type: 'p', text: t }); }
    else if (n.type === 'heading') out.push({ type: Number(n.attrs?.level) === 3 ? 'h3' : 'h2', text: blockText(n) });
    else if (n.type === 'bulletList' || n.type === 'orderedList') {
      const items = (n.content ?? []).map((li) => paragraphs(li).join(' ')).filter(Boolean);
      if (items.length) out.push({ type: 'ul', items });
    } else if (n.type === 'blockquote') {
      const text = paragraphs(n).join(' ');
      const source = String(n.attrs?.source ?? '').trim();
      if (text) out.push(source ? { type: 'quote', text, source } : { type: 'quote', text });
    }
  }
  return out;
}

/** Text with marks → inline nodes. */
export function textToInline(s: string): PMNode[] {
  const out: PMNode[] = [];
  const re = /\[((?:\\.|[^\]\\])+)\]\(([^)\s]+)\)|\*\*((?:\\.|[^*\\])+)\*\*|\*((?:\\.|[^*\\])+)\*/g;
  let last = 0, m: RegExpExecArray | null;
  const push = (text: string, marks: PMNode['marks'] = []) => { if (text) out.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text }); };
  while ((m = re.exec(s))) {
    push(unesc(s.slice(last, m.index)));
    if (m[1] !== undefined) {
      for (const inner of textToInline(m[1])) out.push({ ...inner, marks: [...(inner.marks ?? []), { type: 'link', attrs: { href: m[2] } }] });
    } else if (m[3] !== undefined) {
      for (const inner of textToInline(m[3])) out.push({ ...inner, marks: [{ type: 'bold' }, ...(inner.marks ?? [])] });
    } else if (m[4] !== undefined) push(unesc(m[4]), [{ type: 'italic' }]);
    last = re.lastIndex;
  }
  push(unesc(s.slice(last)));
  return out;
}

const para = (text: string): PMNode => ({ type: 'paragraph', ...(text ? { content: textToInline(text) } : {}) });

/** Website blocks → editor document. */
export function blocksToDoc(blocks: Block[] | undefined | null): PMNode {
  const content: PMNode[] = [];
  for (const b of blocks ?? []) {
    if (b.type === 'p') content.push(para(b.text));
    else if (b.type === 'h2' || b.type === 'h3') content.push({ type: 'heading', attrs: { level: b.type === 'h2' ? 2 : 3 }, ...(b.text ? { content: textToInline(b.text) } : {}) });
    else if (b.type === 'ul') content.push({ type: 'bulletList', content: b.items.map((i) => ({ type: 'listItem', content: [para(i)] })) });
    else if (b.type === 'quote') content.push({ type: 'blockquote', attrs: { source: b.source ?? '' }, content: [para(b.text)] });
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

/** Plain words of a body (reading time, checks). */
export const bodyWords = (blocks: Block[]) =>
  blocks.map((b) => (b.type === 'ul' ? b.items.join(' ') : b.text)).join(' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*]/g, '').split(/\s+/).filter(Boolean).length;

/** Links used in a body. */
export const bodyLinks = (blocks: Block[]) =>
  blocks.flatMap((b) => (b.type === 'ul' ? b.items : [b.text])).flatMap((t) => [...t.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]));
