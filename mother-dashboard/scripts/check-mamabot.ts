import { answer, suggestions } from '../src/services/mamabot';
const qs = [...Object.values(suggestions).flat(), 'what is the benefit of walking', 'I am bleeding and want to eat', 'great day', 'follow up'];
let bad = 0;
for (const q of qs) {
  const r = answer(q, 'en');
  const isSuggestion = Object.values(suggestions).flat().includes(q);
  if (isSuggestion && !r.matched) bad++;
  console.log(`${r.matched ? (r.urgent ?? 'info') : 'DEFAULT'}\t${q}\t=> ${r.text.slice(0, 60)}`);
}
if (bad) { console.error(`${bad} suggestions have no scripted answer`); process.exit(1); }
