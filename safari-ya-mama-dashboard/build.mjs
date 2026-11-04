// Safari ya Mama staff dashboard build.
//   dist/index.html + staff.js + staff.css + config.js + vendor-supabase.js   live site (Supabase)
//   dist/demo.html                                                             single file, synthetic data, no server
// Config from the environment (or ../.env.local): SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_ACCOUNTS=1 to list test logins.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url)), SRC = path.join(ROOT, 'src'), DIST = path.join(ROOT, 'dist');
const env = { ...process.env };
const envFile = [path.join(ROOT, '.env.local'), path.join(ROOT, '..', '.env.local')].find(f => fs.existsSync(f)) || '';
if (envFile) for (const l of fs.readFileSync(envFile, 'utf8').split('\n')) { const m = /^([A-Z_]+)=(.*)$/.exec(l.trim()); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
fs.mkdirSync(DIST, { recursive: true });

const JS = ['data.js', 'content.js', 'rules.js', 'illus.js', 'staffapi.js', 'staff.js'];
const js = "(function(){'use strict';\nconst S = {lang:'en'};\n" + JS.map(read).join('\n') + '\n})();\n';
const css = read('styles.css') + '\n' + read('staff.css');
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap">';
const ICON = fs.readFileSync(path.join(ROOT, 'brand', 'mark.svg'), 'utf8');
const DEMO_STAFF = [['hw@safariyamama.test', 'Health worker · Sample Health Centre 1'], ['facility@safariyamama.test', 'Facility admin · Sample Health Centre 1'], ['programme@safariyamama.test', 'Programme admin · all facilities']];

// live site
// SITE_URL: the public website, so the health library links each published lesson to its page there
const SITE_URL = env.SITE_URL || 'https://safariyamama.com/';
const cfg = { mode: 'supabase', url: env.SUPABASE_URL || '', anonKey: env.SUPABASE_ANON_KEY || '', siteUrl: SITE_URL };
if (env.DEMO_ACCOUNTS === '1') Object.assign(cfg, { demoStaff: DEMO_STAFF, demoPassword: 'SafariMama-demo-2026' });
fs.writeFileSync(path.join(DIST, 'config.js'), '// Edit for your Supabase project. The anon key is public by design; row-level security protects the data.\nwindow.SYM_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n');
fs.writeFileSync(path.join(DIST, 'staff.js'), js);
fs.writeFileSync(path.join(DIST, 'staff.css'), css);
fs.writeFileSync(path.join(DIST, 'icon.svg'), ICON);
const entry = path.join(ROOT, 'node_modules', '.vendor_entry.js');
if (fs.existsSync(path.join(ROOT, 'node_modules', '@supabase'))) {
  fs.writeFileSync(entry, "import { createClient } from '@supabase/supabase-js';\nwindow.supabase = { createClient };\n");
  // JS API rather than node_modules/.bin/esbuild, which is esbuild.cmd on Windows.
  (await import('esbuild')).buildSync({ entryPoints: [entry], bundle: true, minify: true, format: 'iife', target: 'es2019', outfile: path.join(DIST, 'vendor-supabase.js') });
} else console.warn('npm install first to bundle supabase-js (live mode needs dist/vendor-supabase.js)');
const shell = (head, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Safari ya Mama · Staff</title><meta name="robots" content="noindex"><meta name="theme-color" content="#22372D">${head}</head><body style="margin:0;background:var(--bg)">
<div id="staff"></div><div class="toasts" id="toasts" aria-live="polite"></div>${body}</body></html>\n`;
fs.writeFileSync(path.join(DIST, 'index.html'), shell(`<link rel="icon" href="icon.svg">${FONTS}<link rel="stylesheet" href="staff.css"><style>[hidden]{display:none!important}</style>`,
  '<script src="vendor-supabase.js"></script><script src="config.js"></script><script src="staff.js"></script>'));

// single-file demo
const snap = execFileSync('node', [path.join(ROOT, 'scripts', 'demo_snapshot.mjs')]).toString();
const demoCfg = { mode: 'demo', demoStaff: DEMO_STAFF, siteUrl: SITE_URL };
fs.writeFileSync(path.join(DIST, 'demo.html'), shell(`<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(ICON)}">${FONTS}<style>${css}\n[hidden]{display:none!important}</style>`,
  `<script>window.SYM_CONFIG=${JSON.stringify(demoCfg)};window.SYM_DEMO_SNAPSHOT=${snap.replace(/</g, '\\u003c')};</script><script>${js}</script>`));
console.log('built', fs.readdirSync(DIST).join(', '));
