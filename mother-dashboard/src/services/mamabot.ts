import { content } from '@/data/content';
import type { CareStage, Lang } from '@/types';

/**
 * MamaBot answers ONLY from the scripted, source-referenced answers in the shared content pack.
 * It matches keywords at the start of words ("fit" matches "fits" but not "benefit"); it does not
 * generate text or diagnose. When several answers match, the most urgent one is shown, so a
 * question that mentions a danger sign always gets the "seek care" answer.
 */
export interface BotReply {
  text: string;
  urgent: 'red' | 'yellow' | null;
  matched: boolean;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rank = { red: 2, yellow: 1 } as const;

export function answer(question: string, lang: Lang): BotReply {
  const q = question.toLowerCase();
  const hits = content.assistantIntents.filter((i) => i.keywords.some((k) => new RegExp(`(^|[^\\p{L}])${esc(k.toLowerCase())}`, 'u').test(q)));
  if (hits.length === 0) return { text: content.assistantDefault[lang], urgent: null, matched: false };
  const best = hits.reduce((a, b) => ((b.urgent ? rank[b.urgent] : 0) > (a.urgent ? rank[a.urgent] : 0) ? b : a));
  return { text: best[lang] || best.en, urgent: best.urgent, matched: true };
}

/** Starter questions per stage. Each one matches a scripted answer. */
export const suggestions: Record<CareStage, string[]> = {
  pregnancy: ['What should I eat while pregnant?', 'My baby moves less than usual', 'I have a bad headache', 'I feel sad and worried'],
  'birth-soon': ['My baby moves less than usual', 'I have a bad headache', 'What should I eat?', 'I feel worried'],
  postpartum: ['How often should I breastfeed?', 'How do I care for the cord?', 'My baby has yellow skin', 'When are the vaccines?'],
};
