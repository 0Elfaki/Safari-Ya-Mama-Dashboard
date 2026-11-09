// Copies the website's built-in content (../Safari-ya-mam-website/src/content/site-defaults.json)
// into the dashboard, so "Import from the website" and "Reset to the built-in version" match the
// website exactly. Run after the website's sections change: npm run sync:site
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const from = path.resolve(root, process.env.WEBSITE_DIR ?? '../Safari-ya-mam-website', 'src/content/site-defaults.json');
const to = path.join(root, 'src/data/site-defaults.json');
if (!fs.existsSync(from)) {
  console.error(`Not found: ${from}\nSet WEBSITE_DIR to the website folder.`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(from, 'utf8'));
if (!Array.isArray(data.pages)) { console.error('site-defaults.json has no "pages" list.'); process.exit(1); }
fs.writeFileSync(to, JSON.stringify(data, null, 1) + '\n');
console.log(`Copied ${data.pages.length} pages, ${data.pages.reduce((n, p) => n + p.sections.length, 0)} sections → src/data/site-defaults.json`);
