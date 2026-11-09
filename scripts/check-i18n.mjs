// Every interface string goes through t('…') / tn('…') (components), tr('…') (other code) or msg('…') (data
// translated where shown). This check fails when a key has no Kiswahili in src/i18n/sw.json, when
// sw.json keeps a key nothing uses, or when a translation drops/renames a {placeholder}.
//   node scripts/check-i18n.mjs          check
//   node scripts/check-i18n.mjs --list   print the keys found in src (JSON), for translators
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const SW_FILE = 'src/i18n/sw.json';
const CALL = /(?<![\w$.])(?:t|tn|tr|msg)\(\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\$]|\\.|\$(?!\{))*`)/g;

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const used = new Map(); // key -> first place
for (const f of files) {
  // comments may show examples such as t('Save'): blank them out, keeping line numbers
  const src = fs.readFileSync(f, 'utf8')
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '');
  for (const m of src.matchAll(CALL)) {
    const lit = m[1];
    // a literal from our own source: evaluate it to apply escapes (\' \n ’ …)
    const key = lit[0] === '`' ? lit.slice(1, -1).replace(/\\(.)/g, '$1') : new Function(`return ${lit}`)();
    if (!used.has(key)) used.set(key, `${f.replace(/\\/g, '/')}:${src.slice(0, m.index).split('\n').length}`);
  }
}

if (process.argv.includes('--list')) {
  console.log(JSON.stringify([...used.keys()], null, 1));
  process.exit(0);
}

const sw = JSON.parse(fs.readFileSync(SW_FILE, 'utf8'));
const problems = [];
for (const [k, where] of used) {
  if (!(k in sw)) problems.push(`missing Kiswahili: ${JSON.stringify(k)}  (${where})`);
  else if (typeof sw[k] !== 'string' || !sw[k].trim()) problems.push(`empty Kiswahili: ${JSON.stringify(k)}`);
}
for (const k of Object.keys(sw)) if (!used.has(k)) problems.push(`unused key in sw.json: ${JSON.stringify(k)}`);
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const [k, v] of Object.entries(sw)) if (used.has(k) && typeof v === 'string' && holes(k) !== holes(v)) problems.push(`placeholders differ: ${JSON.stringify(k)} -> ${JSON.stringify(v)}`);

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\ncheck:i18n failed: ${problems.length} problem(s), ${used.size} keys used, ${Object.keys(sw).length} in sw.json.`);
  process.exit(1);
}
console.log(`check:i18n ok: ${used.size} strings, all translated.`);
