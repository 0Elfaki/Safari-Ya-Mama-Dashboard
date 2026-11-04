# Safari ya Mama · Mother dashboard (React prototype)

Responsive web dashboard for pregnant women, mothers after birth and caregivers of newborns.
React 18 + TypeScript + Vite + Tailwind, React Router, Zustand, Recharts, Framer Motion,
React Hook Form + Zod, Lucide icons.

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # type-check + production build to dist/
npm run preview          # serve dist/ on http://localhost:4173
npm run qa               # Playwright visual + interaction QA against the preview (writes qa/)
npm run check:tokens     # fails on raw colours / off-scale spacing / non-token classes
npm run check:mamabot    # every suggested question has a scripted answer
npm run content          # regenerate health content from the shared content pack
```

First run shows an empty profile. Set up a profile, or load an illustrative demo stage under
**Settings → Demo data** (pregnant 26 weeks, pregnant 38 weeks, after birth). **Settings → Design
review** previews the loading, empty and error states without touching records.

## Health content and safety

- All clinical text (danger signs, lessons, ANC and vaccine schedules, MamaBot answers) is generated
  from `../safari-ya-mama-dashboard/src/{data,content,rules}.js`, the content pack shared with the
  app and website, into `src/data/content/shared-content.json`. Do not edit the JSON by hand.
- Lessons list their WHO sources and show **Clinical review pending** until a review is recorded.
- MamaBot only returns scripted answers by keyword. When several match, the most urgent one wins, so
  danger-sign questions always get "seek care". It never generates text or diagnoses.
- The symptom diary never reassures. A red sign shows "go now", a yellow sign shows "see a health
  worker today", and anything else just confirms the entry was saved.
- The checklist contains supplements only when they are recorded as prescribed in the profile.
  Ticking items is never treated as a health result.
- Demo records carry `source: 'demo'`, show a **Demo data** badge, and a banner stays visible
  while they are loaded. Phone numbers use the unassigned 000 range.

## Data

Records live in this browser (Zustand `persist` → localStorage) and are not sent anywhere. The top
bar says so ("Saved on this device"), and an offline notice appears when the connection drops.
`src/store/records.ts` is the seam for a future API: swap its storage for a sync adapter.

## Structure

```
src/
  app/            App, router (lazy routes; Home and Emergency are eager)
  components/     common/ (Button, Card, StatusBadge, Modal, StateViews…), cards/, layout/, navigation/, forms/
  features/       dashboard, maternal (My Care), pregnancy, baby, mamabot, education, appointments, emergency, profile, settings
  data/           content/ (generated), mock/ (demo scenarios)
  hooks/ services/ store/ types/ utils/
  styles/         theme.css (the only place tokens are defined), index.css
```
