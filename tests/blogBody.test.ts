import { describe, expect, it } from 'vitest';
import { blocksToDoc, bodyLinks, bodyWords, docToBlocks, textToInline } from '../src/lib/blogBody';
import type { Block } from '../src/lib/cms';
import { APP_PICTURE_ID, LESSON_PICTURE_ID } from '../src/lib/image';

const body: Block[] = [
  { type: 'h2', text: 'Why the first visit matters' },
  { type: 'p', text: 'Go **early**, ideally *before 12 weeks*. See [the WHO guidance](https://www.who.int/anc) or our [learning page](/learning).' },
  { type: 'h3', text: 'What to bring' },
  { type: 'ul', items: ['Your clinic card', 'A **list** of questions'] },
  { type: 'quote', text: 'Every mother deserves a safe journey.', source: 'Midwife, Sample District' },
  { type: 'p', text: 'Prices like 5 \\* 2 stay literal, and so do \\[brackets\\].' },
];

describe('blog body conversion', () => {
  it('editor content → JSON → editor content keeps every block and mark', () => {
    const doc = blocksToDoc(body);
    expect(docToBlocks(doc)).toEqual(body);
    expect(docToBlocks(blocksToDoc(docToBlocks(doc)))).toEqual(body);
  });
  it('drops empty paragraphs and keeps the website block shape only', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] };
    expect(docToBlocks(doc)).toEqual([{ type: 'p', text: 'Hi' }]);
  });
  it('parses marks into text nodes', () => {
    expect(textToInline('a **b** c')).toEqual([{ type: 'text', text: 'a ' }, { type: 'text', text: 'b', marks: [{ type: 'bold' }] }, { type: 'text', text: ' c' }]);
  });
  it('quotes without a source stay without one', () => {
    expect(docToBlocks(blocksToDoc([{ type: 'quote', text: 'Q' }]))).toEqual([{ type: 'quote', text: 'Q' }]);
  });
  it('counts words and finds links', () => {
    expect(bodyWords([{ type: 'p', text: 'one **two** [three](https://x.org)' }])).toBe(3);
    expect(bodyLinks(body)).toEqual(['https://www.who.int/anc', '/learning']);
  });
});

describe('picture IDs', () => {
  it('accepts every kind of app picture ID', () => {
    for (const id of ['NB-SLEEP-P1', 'HERO-WELCOME', 'MM-PR-1', 'SZ-28', 'HOME-DOCTOR', 'BOOK-VIDEO']) expect(APP_PICTURE_ID.test(id)).toBe(true);
    for (const id of ['nb-sleep-p1', 'NB_SLEEP', 'X', 'NB-SLEEP-P1.webp']) expect(APP_PICTURE_ID.test(id)).toBe(false);
  });
  it('lesson steps need the -P<n> form', () => {
    expect(LESSON_PICTURE_ID.test('NB-SLEEP-P1')).toBe(true);
    expect(LESSON_PICTURE_ID.test('HOME-DOCTOR')).toBe(false);
  });
});
