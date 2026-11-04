// Copies the shared, source-referenced health content from the staff dashboard's content pack
// (../safari-ya-mama-dashboard/src/{data,content,rules}.js) into src/data/content/shared-content.json.
// That pack is the single source shared by the app, the website and the staff dashboard:
// never hand-edit the JSON. Change the pack, then run `npm run content`.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PACK = path.join(ROOT, '..', 'safari-ya-mama-dashboard', 'src');
const OUT = path.join(ROOT, 'src', 'data', 'content', 'shared-content.json');

const files = ['data.js', 'content.js', 'rules.js'];
for (const f of files) {
  if (!fs.existsSync(path.join(PACK, f))) {
    console.error(`Content pack not found: ${path.join(PACK, f)}`);
    process.exit(1);
  }
}
const src = files.map((f) => fs.readFileSync(path.join(PACK, f), 'utf8')).join('\n');
const ctx = { S: { lang: 'en' }, console, Date, Math, Intl };
vm.createContext(ctx);
const NAMES = [
  'RULES_VERSION', 'SIGNS', 'PREG_LVL', 'PP_SIGNS', 'BABY_SIGNS', 'VACCINES', 'ANC', 'SIZES', 'PREG_MONTHS',
  'LIB_CATS', 'LESSONS', 'READY', 'INTENTS', 'INTENT_DEFAULT', 'SOURCES', 'LESSON_SOURCES', 'LESSON_REVIEW',
  'DIARY_SYMPTOMS', 'MILESTONES',
];
vm.runInContext(`${src}\n;globalThis.__out = { ${NAMES.join(', ')} };`, ctx);
const o = ctx.__out;

const illus = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'assets', 'illus', 'index.json'), 'utf8'));

const out = {
  rulesVersion: o.RULES_VERSION,
  pregnancySigns: o.SIGNS.map((s) => ({ key: s.k, level: o.PREG_LVL[s.k] ?? 'yellow', en: s.en, sw: s.sw })),
  postpartumSigns: o.PP_SIGNS.map((s) => ({ key: s.k, level: s.lvl, en: s.en, sw: s.sw })),
  babySigns: o.BABY_SIGNS.map((s) => ({ key: s.k, level: s.lvl, en: s.en, sw: s.sw })),
  vaccines: o.VACCINES.map((v) => ({ dayOfLife: v.d, en: v.en, sw: v.sw, items: v.items })),
  ancContacts: o.ANC.map((a) => ({ week: a.w, en: a.en, sw: a.sw, items: a.items })),
  babySizes: o.SIZES.map(([week, en, sw]) => ({ week, en, sw })),
  pregnancyMonths: Object.entries(o.PREG_MONTHS).map(([m, v]) => ({ month: Number(m), baby: v.baby, you: v.you })),
  libraryCategories: o.LIB_CATS.map((c) => ({ key: c.k, en: c.en, sw: c.sw })),
  lessons: o.LESSONS.map((l) => ({
    id: l.id,
    category: l.cat,
    format: l.fmt,
    minutes: l.min,
    stage: l.stage,
    title: l.t,
    steps: l.s,
    sources: (o.LESSON_SOURCES[l.id] ?? []).map((k) => ({ key: k, title: o.SOURCES[k]?.t ?? k, year: o.SOURCES[k]?.y ?? null })),
    review: o.LESSON_REVIEW[l.id] ?? null,
    art: illus.lessonArt?.[l.id] ?? [],
  })),
  birthReadiness: o.READY.map((r) => ({ key: r.k, en: r.en, sw: r.sw })),
  assistantIntents: o.INTENTS.map((i) => ({ keywords: i.k, urgent: i.urgent, en: i.en, sw: i.sw })),
  assistantDefault: { en: o.INTENT_DEFAULT.en, sw: o.INTENT_DEFAULT.sw },
  diarySymptoms: o.DIARY_SYMPTOMS,
  milestones: o.MILESTONES.map((m) => ({ month: m.m, items: m.items.map((i) => ({ key: i.k, en: i.en, sw: i.sw })) })),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)} (rules ${out.rulesVersion}, ${out.lessons.length} lessons, ${out.assistantIntents.length} assistant answers)`);
