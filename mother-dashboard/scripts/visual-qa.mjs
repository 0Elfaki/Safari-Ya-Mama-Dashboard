// Visual and interaction QA against the running app (npm run build && npx vite preview --port 4173).
//   node scripts/visual-qa.mjs [baseUrl]
// For every care stage × viewport × page it records horizontal overflow, console errors, broken
// images and missing <h1>, and saves a full-page screenshot to qa/. Then it runs interaction tests.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = path.resolve('qa');
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];
const ROUTES = ['/', '/care', '/pregnancy', '/baby', '/mamabot', '/library', '/library/danger-preg', '/appointments', '/emergency', '/profile', '/settings'];
const SCENARIOS = ['empty', 'pregnant', 'birth-soon', 'postpartum'];
const SCENARIO_BUTTON = { pregnant: 'Pregnant, 26 weeks', 'birth-soon': 'Pregnant, 38 weeks', postpartum: 'After birth, baby 5 weeks' };

const issues = [];
const note = (where, msg) => issues.push(`${where}: ${msg}`);
const passes = [];
const ok = (cond, name) => (cond ? passes.push(name) : issues.push(`FAIL ${name}`));

fs.rmSync(OUT, { recursive: true, force: true });
const browser = await chromium.launch();

async function newPage(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && note(`${vp.name} ${page.url().replace(BASE, '')}`, `console error: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => note(`${vp.name} ${page.url().replace(BASE, '')}`, `page error: ${e.message.slice(0, 200)}`));
  return { ctx, page };
}

async function loadScenario(page, s) {
  await page.goto(`${BASE}/settings`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (s === 'empty') return;
  await page.getByRole('button', { name: new RegExp(SCENARIO_BUTTON[s]) }).click();
  await page.waitForTimeout(100);
}

async function audit(page, where) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const over = document.documentElement.scrollWidth > vw + 1;
    const offenders = [];
    if (over)
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        if (b.right > vw + 1 && b.width > 0 && getComputedStyle(el).position !== 'fixed') {
          offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(b.right)}`);
          if (offenders.length > 4) break;
        }
      }
    const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-40));
    const h1 = document.querySelectorAll('main h1').length;
    // text overflowing its own box (clipped words), excluding intentionally truncated text
    const clipped = [...document.querySelectorAll('main p, main h1, main h2, main h3, main span, main button, main a')]
      .filter((e) => e.scrollWidth > e.clientWidth + 2 && !/truncate|line-clamp|sr-only/.test(e.className) && getComputedStyle(e).overflow !== 'visible' && e.clientWidth > 0)
      .slice(0, 3)
      .map((e) => `${e.tagName.toLowerCase()} "${e.textContent.slice(0, 30)}"`);
    const smallTargets = [...document.querySelectorAll('main button, main a, header button, header a, nav a')]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && (b.height < 40 || b.width < 40) && !e.closest('p') && getComputedStyle(e).display !== 'inline';
      })
      .slice(0, 3)
      .map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    const emergency = !!document.querySelector('header a[href="/emergency"]');
    return { over, offenders, broken, h1, clipped, smallTargets, emergency };
  });
  if (r.over) note(where, `horizontal overflow → ${r.offenders.join(' | ')}`);
  if (r.broken.length) note(where, `broken images ${r.broken.join(', ')}`);
  if (r.h1 !== 1) note(where, `expected 1 <h1>, found ${r.h1}`);
  if (r.clipped.length) note(where, `clipped text ${r.clipped.join(' | ')}`);
  if (r.smallTargets.length) note(where, `small touch targets ${r.smallTargets.join(' | ')}`);
  if (!r.emergency) note(where, 'emergency button missing from top bar');
}

for (const s of SCENARIOS) {
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await newPage(vp);
    await loadScenario(page, s);
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(350);
      const where = `${s} ${vp.name} ${route}`;
      await audit(page, where);
      const dir = path.join(OUT, s, vp.name);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}.png`), fullPage: true });
    }
    await ctx.close();
  }
}

// ---------- larger-text preference at 360 px ----------
{
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await loadScenario(page, 'postpartum');
  await page.evaluate(() => {
    const k = 'sym-prefs-v1';
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":0}');
    v.state.textSize = 'large';
    localStorage.setItem(k, JSON.stringify(v));
  });
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(250);
    await audit(page, `large-text 360 ${route}`);
  }
  await page.screenshot({ path: path.join(OUT, 'states', 'large-text-360.png') }).catch(() => {});
  await ctx.close();
}

// ---------- interaction tests ----------
{
  const { ctx, page } = await newPage(VIEWPORTS[4]);
  await loadScenario(page, 'pregnant');
  await page.goto(BASE);
  // every sidebar item navigates to its page
  const items = ['Home', 'My Care', 'My Pregnancy', 'My Baby', 'MamaBot', 'Health Library', 'Appointments', 'Emergency Plan', 'My Profile', 'Settings'];
  for (const label of items) {
    await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true }).click();
    await page.waitForFunction((l) => document.querySelector('aside a[aria-current="page"]')?.textContent?.trim() === l && document.querySelector('[aria-label="Loading page"]')?.getAttribute('aria-hidden') === 'true', label);
    const h1 = await page.locator('main h1').first().innerText();
    const cur = await page.getByRole('complementary', { name: 'Main navigation' }).locator('a[aria-current="page"]').innerText();
    ok(cur.trim() === label && h1.length > 0, `sidebar → ${label} (h1 "${h1.slice(0, 30)}")`);
  }
  // home: checklist persists across reload
  await page.goto(BASE);
  const first = page.getByRole('list', { name: "Today's care tasks" }).getByRole('checkbox').first();
  await first.check();
  await page.reload();
  ok(await page.getByRole('list', { name: "Today's care tasks" }).getByRole('checkbox').first().isChecked(), 'checklist tick persists after reload');
  ok((await page.locator('#todays-care').locator('..').innerText()).includes('1 of'), 'checklist shows completion count');
  // home cards navigate
  for (const [name, url] of [
    ['View pregnancy details', '/pregnancy'],
    ['Start conversation', '/mamabot'],
    ['Emergency plan', '/emergency'],
  ]) {
    await page.goto(BASE);
    await page.getByRole('link', { name, exact: true }).first().click();
    await page.waitForURL((u) => u.pathname === url, { timeout: 5000 }).catch(() => {});
    ok(new URL(page.url()).pathname === url, `home "${name}" → ${url}`);
  }
  await page.goto(BASE);
  await page.getByRole('link', { name: /^Read article/ }).first().click();
  await page.waitForURL(/\/library\/.+/).catch(() => {});
  ok(new URL(page.url()).pathname.startsWith('/library/'), 'home article → lesson page');
  await page.goto(BASE);
  await page.getByRole('link', { name: /Third antenatal contact/ }).first().click();
  ok((await page.getByRole('dialog').innerText()).includes('Third antenatal contact'), 'appointment card opens details dialog');
  await page.keyboard.press('Escape');
  await page.waitForURL(/\/appointments$/).catch(() => {});
  ok(new URL(page.url()).pathname === '/appointments', 'Escape closes details and returns to list');
  // notifications
  await page.goto(BASE);
  await page.getByRole('button', { name: /^Notifications/ }).click();
  ok(await page.getByRole('region', { name: 'Notifications' }).isVisible(), 'notification dropdown opens');
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  ok(!(await page.getByRole('button', { name: /Notifications, \d+ new/ }).count()), 'mark all as read clears the badge');
  await page.keyboard.press('Escape');
  // add appointment with validation
  await page.goto(`${BASE}/appointments`);
  await page.getByRole('button', { name: 'Add appointment' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save appointment' }).click();
  ok((await page.getByRole('dialog').innerText()).includes('Give the appointment a name'), 'appointment form shows validation error');
  await page.getByRole('dialog').getByLabel('Name').fill('Ultrasound scan');
  await page.getByRole('dialog').getByRole('button', { name: 'Save appointment' }).click();
  await page.waitForTimeout(200);
  ok((await page.locator('main').innerText()).includes('Ultrasound scan'), 'new appointment appears in list');
  // MamaBot
  await page.goto(`${BASE}/mamabot`);
  await page.getByRole('button', { name: 'I have a bad headache' }).click();
  ok((await page.getByRole('list', { name: 'Conversation' }).innerText()).includes('This may be an emergency'), 'MamaBot danger question shows emergency guidance');
  await page.getByLabel('Your question').fill('x');
  await page.getByRole('button', { name: 'Send question' }).click();
  ok(await page.getByText('Type a question first').isVisible(), 'MamaBot input validation');
  // library search + filter
  await page.goto(`${BASE}/library`);
  await page.getByLabel('Search lessons').fill('cord');
  ok((await page.locator('main').innerText()).includes('Caring for the cord'), 'library search finds lesson');
  await page.getByLabel('Search lessons').fill('zzzz');
  ok(await page.getByText('No lessons match').isVisible(), 'library empty state');
  // symptom diary danger sign → seek care
  await page.goto(`${BASE}/care`);
  await page.getByRole('button', { name: 'Add diary entry' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bleeding from the vagina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save entry' }).click();
  ok((await page.getByRole('dialog').innerText()).includes('Go to a health facility now'), 'diary danger sign → go to facility now');
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  // emergency contact add
  await page.goto(`${BASE}/emergency`);
  await page.locator('#contacts-title').locator('../..').getByRole('button', { name: 'Add' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill('Neema');
  await page.getByRole('dialog').getByLabel('Phone number').fill('abc');
  await page.getByRole('dialog').getByRole('button', { name: 'Save contact' }).click();
  ok(await page.getByText('Enter a phone number using digits').isVisible(), 'contact phone validation');
  await page.getByRole('dialog').getByLabel('Phone number').fill('+255 000 000 200');
  await page.getByRole('dialog').getByRole('button', { name: 'Save contact' }).click();
  ok(await page.getByRole('link', { name: 'Call Neema' }).first().isVisible(), 'new emergency contact has a call button');
  // sidebar collapse persists
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.reload();
  ok(await page.getByRole('button', { name: 'Expand sidebar' }).isVisible(), 'sidebar collapse is remembered');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  // offline notice
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await ctx.setOffline(true); // fires the browser's offline event on the open page
  await page.waitForTimeout(100);
  ok(await page.getByText('You are offline.').isVisible(), 'offline notice appears');
  await page.screenshot({ path: path.join(OUT, 'offline-1440.png') });
  await ctx.setOffline(false);
  // design-review states
  for (const st of ['Loading', 'Empty', 'Error']) {
    await page.goto(`${BASE}/settings`);
    await page.getByRole('radio', { name: st }).click();
    await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Home', exact: true }).click();
    await page.waitForTimeout(150);
    const txt = await page.locator('main').innerText();
    const expected = { Loading: () => page.getByRole('status', { name: 'Loading your dashboard' }).isVisible(), Empty: async () => txt.includes('Set up your profile'), Error: async () => txt.includes('could not be loaded') && txt.includes('Emergency assistance') };
    ok(await expected[st](), `${st.toLowerCase()} state renders`);
    for (const vp of [VIEWPORTS[0], VIEWPORTS[4]]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const dir = path.join(OUT, 'states');
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${st.toLowerCase()}-${vp.name}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await ctx.close();
}
{
  // phone: drawer + bottom bar + modal as sheet
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await loadScenario(page, 'postpartum');
  await page.goto(BASE);
  for (const [label, url] of [
    ['My Care', '/care'],
    ['MamaBot', '/mamabot'],
    ['Learn', '/library'],
    ['Profile', '/profile'],
    ['Home', '/'],
  ]) {
    await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: label }).click();
    await page.waitForURL((u) => u.pathname === url).catch(() => {});
    ok(new URL(page.url()).pathname === url, `bottom bar → ${label}`);
  }
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('#mobile-drawer').getByRole('link', { name: 'Appointments' }).click();
  await page.waitForTimeout(300);
  ok(new URL(page.url()).pathname === '/appointments' && !(await page.locator('#mobile-drawer').count()), 'drawer navigates and closes');
  await page.getByRole('link', { name: 'Emergency help' }).click();
  ok(new URL(page.url()).pathname === '/emergency', 'top-bar emergency button works on phone');
  await page.goto(`${BASE}/baby`);
  await page.getByRole('button', { name: 'Breastfeed' }).click();
  ok(await page.getByText('1 feed logged').first().isVisible({ timeout: 2000 }).catch(() => false) || (await page.getByText('1 feed logged').count()) > 0, 'feeding log adds an entry');
  await page.goto(`${BASE}/appointments?add=1`);
  const box = await page.getByRole('dialog').boundingBox();
  ok(box && box.width <= 360 && box.x >= 0, 'modal fits a 360 px screen');
  await page.screenshot({ path: path.join(OUT, 'states', 'modal-360.png') });
  await ctx.close();
}

await browser.close();
const report = [`PASS ${passes.length}`, ...passes.map((p) => `  ✓ ${p}`), `ISSUES ${issues.length}`, ...issues.map((i) => `  ✗ ${i}`)].join('\n');
fs.writeFileSync(path.join(OUT, 'report.txt'), report);
console.log(report);
process.exit(issues.length ? 1 : 0);
