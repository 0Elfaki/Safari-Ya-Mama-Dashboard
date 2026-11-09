// Design-system guard. Fails when components use raw colours, spacing outside the 4 px scale,
// or colour names that are not tokens (Tailwind drops unknown classes silently, so these
// would render unstyled). Run: node scripts/check-tokens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'src');
const ALLOWED_RAW_COLOUR_FILES = new Set(['styles/theme.css', 'lib/chartTheme.ts']);

const spacing = new Set(['0', 'px', '0.5', '1', '2', '3', '4', '5', '6', '7', '8', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '40', '48', '56', '60', '64', '72', '80', '96', 'sidebar', 'rail', 'topbar', 'bottomnav', 'full', 'auto', 'screen', 'fit', 'min', 'max', 'dvh', 'svh']);
const colours = new Set(['transparent', 'current', 'white', 'primary', 'primary-soft', 'secondary', 'bg', 'surface', 'surface-2', 'accent', 'accent-soft', 'ink', 'ink-2', 'line', 'success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft']);
const textOther = new Set(['caption', 'small', 'body', 'h3', 'h2', 'h1', 'display', 'left', 'center', 'right', 'justify', 'start', 'end', 'ellipsis', 'clip', 'wrap', 'nowrap', 'balance', 'pretty']);
const borderOther = new Set(['0', '2', '4', '8', 't', 'b', 'l', 'r', 'x', 'y', 'solid', 'dashed', 'dotted', 'none', 'collapse', 'separate']);
const ringOther = new Set(['0', '1', '2', '4', '8', 'inset', 'offset-0', 'offset-1', 'offset-2', 'offset-4']);

const spacingProps = /^-?(p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|left|right|bottom|w|h|min-w|min-h|max-h|size|translate-[xy]|scroll-m[tblr]?|scroll-p[tblr]?)-(.+)$/;

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(f)) files.push(p);
  }
})(SRC);

const problems = [];
for (const file of files) {
  const rel = path.relative(SRC, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const where = `${rel}:${i + 1}`;
    if (!ALLOWED_RAW_COLOUR_FILES.has(rel) && !rel.endsWith('.json')) {
      if (/#[0-9a-fA-F]{3,8}\b/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line) && !/(to|href)=["']#|['"`]#[a-z-]+['"`]|#\w+-\w+/.test(line)) {
        const m = line.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/);
        if (m) problems.push(`${where}  raw colour ${m[0]}`);
      }
      if (/\brgba?\(\s*\d/.test(line)) problems.push(`${where}  raw rgb() colour`);
    }
    if (!file.endsWith('.tsx')) return;
    // class strings: '...', "...", `...`
    for (const m of line.matchAll(/(["'`])([^"'`]*?)\1/g)) {
      for (let cls of m[2].split(/\s+/)) {
        if (!cls) continue;
        cls = cls.replace(/^([a-z0-9-]+:)+/, ''); // strip variants
        if (cls.includes('[')) {
          if (/(bg|text|border|ring|fill|stroke)-\[#/.test(cls)) problems.push(`${where}  arbitrary colour ${cls}`);
          continue;
        }
        const sp = cls.match(spacingProps);
        if (sp && /^[\d.]+$/.test(sp[2]) && !spacing.has(sp[2])) problems.push(`${where}  off-scale spacing ${cls}`);
        const c = cls.match(/^(bg|border|ring|divide|fill|stroke|accent|from|to|via|outline|ring-offset)-([a-z0-9-]+?)(\/\d+)?$/);
        if (c) {
          const [, prop, name] = c;
          const ok = colours.has(name) || (prop === 'border' && (borderOther.has(name) || /^[tblrxy]-(0|2|4|8)$/.test(name))) || (prop.startsWith('ring') && ringOther.has(name)) || (prop === 'divide' && /^(x|y|y-0|x-0)$/.test(name)) || (prop === 'outline' && /^(none|0|1|2)$/.test(name)) || (prop === 'bg' && /^(none|cover|contain|center|no-repeat|clip-.*|gradient-.*|fixed|local|scroll)$/.test(name)) || (prop === 'accent' && name === 'auto');
          if (!ok) problems.push(`${where}  unknown colour class ${cls}`);
        }
        const t = cls.match(/^text-([a-z0-9-]+?)(\/\d+)?$/);
        if (t && !colours.has(t[1]) && !textOther.has(t[1])) problems.push(`${where}  unknown text class ${cls}`);
      }
    }
  });
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} design-token problem(s)`);
  process.exit(1);
}
console.log(`design tokens OK (${files.length} files)`);
