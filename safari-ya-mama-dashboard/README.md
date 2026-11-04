# Safari ya Mama · Staff dashboard

One web app with role-based areas: **health worker / facility admin** (alerts, 7-day risk ranking, mothers + SBAR handover, visits, facility overview, staff) and **programme admin** (aggregate overview, weekly series, CSV export, and the health library with its review workflow).

**Health library (programme admin, AD-06/09/10).** Lessons move draft → in review → approved → published (→ retired). Text, key facts, sources and related lessons can be edited only as a draft; saving changed text clears that language's clinical review. Approval records the reviewer's role (not a private name), the review date and the next review date, and must come from a different admin than the last editor. Every edit and state change is kept in the lesson history. The database enforces all of this (migration 0010), so the dashboard cannot bypass it. Published lessons appear on the public website; set `SITE_URL` at build time so "View on website" and "Public website" open the right address.

```bash
npm install
node build.mjs                 # dist/index.html (live, reads config.js) + dist/demo.html (single file, synthetic data)
node test/e2e_demo.cjs         # browser test of the demo build (Playwright)
```

Live mode: `SUPABASE_URL=… SUPABASE_ANON_KEY=… node build.mjs`, then host `dist/`. Add `DEMO_ACCOUNTS=1` for local test logins.
Sources: `src/staffapi.js` (Supabase + demo data layer, risk score mirror), `src/staff.js` (pages), `src/content.js` (shared content pack), `src/rules.js` (reference rules), `scripts/demo_snapshot.mjs` (synthetic demo data), `scripts/demo_data.mjs` (loads demo accounts into a LOCAL Supabase).

## Standalone repo

- `npm install` then `node build.mjs` (or `npm run build`). Output goes to `dist/`; upload `dist/` to any static host.
- **Supabase link:** `.env.local` holds `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public by design; row-level security protects the data). The build writes them into `dist/config.js`, which is already built and linked. Keep `.env.local` out of git (it is in `.gitignore`); `.env.example` shows the format. Never put the service_role key here.
- Tests: `node test/e2e_demo.cjs` (Playwright + Chromium).
- The app icon is `brand/mark.svg`. `src/data.js`, `content.js` and `rules.js` are the reference rules and content shared with the app and the website: change them together.
