# Safari ya Mama · Dashboard

The web console where medical staff monitor the mothers linked to their facility, and where
administrators run the whole platform. React 18 + TypeScript + Vite + Tailwind, on the Supabase
project `qrkzzptfpcotirbvvmke`. The mother app (`../safari-ya-mama`) is the source of truth for the
data model and the server; this dashboard's SQL lives there, in `supabase/migrations/`.

```bash
cp .env.example .env.local      # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (anon key only)
npm install
npm run dev                     # http://localhost:5180
npm run build                   # type-check + production build → dash-dist/
npm test                        # unit tests: QR parsing, Doctor's Note decryption (vector made by the app)
npm run check:tokens            # design-token guard: no raw colours or off-scale spacing
npm run sync:site               # copy the website's built-in sections (../Safari-ya-mam-website/src/content/site-defaults.json)
npm run preview                 # serve dash-dist/ on http://localhost:4174, then:
npm run qa                      # Playwright: interaction tests + every page × role × 1440/390 px → qa/
```

## Roles

| Role (database) | Shown as | Can |
|---|---|---|
| `super_admin` | Super admin | Everything, including creating/editing/deactivating facilities and creating, changing or deactivating admin and facility-admin accounts. Bootstrapped for one owner email in a migration (never in this code). |
| `programme_admin` | Admin | All KPIs, facilities (read), people (health workers), audit log, system health, all content. Not facilities or admin accounts. |
| `facility_admin` | Facility admin | Their facility: Today, alerts (and assigning them), patients, KPIs, adding/deactivating/resetting health workers. |
| `health_worker` | Health worker | The facility they signed in at: Today, alerts, patients, Doctor's Note, Check a record. |
| `editor` | Website editor | Website section only: write and publish posts, edit pages, media, partners, figures, inbox. |
| `author` | Blog author | Writes own blog drafts and submits them for review. |
| `clinical_reviewer` | Clinical reviewer | Approves blog posts that mention symptoms (the exact version). |
| `viewer` | Website viewer | Reads the Website section. |

Super admins and Admins can also work at any facility (Medical staff view): at the Medical staff
entrance, or from the top bar. Their two-step code is still required, mothers' consent still applies,
and every record they open is logged. Website roles never see mothers' data.

Every rule is enforced in Postgres (RLS and security-definer functions that check `my_role()`,
`is_super_admin()`, `is_platform_admin()`, `staff_of()`, `facility_admin_of()`,
`can_manage_account()`, `can_manage_user()`). Hiding a button is only the UI half. Admin powers
also require finished MFA (`aal2`). Proof: `../safari-ya-mama/supabase/tests/permissions.sql`
(97 role × action checks, run in one transaction that is rolled back).

## Sign-in

- **Medical staff:** facility dropdown (`sign_in_facilities()`), email and password, then
  `staff_session(facility)` confirms an active assignment there. A refusal is logged and the user is
  signed out ("You are not registered at this facility"). Staff with several facilities switch from the top bar.
- **Administration:** email and password, then TOTP two-step sign-in (enrolment forced the first time).
- Forgot password uses the Supabase reset email. Invited users and temporary passwords must set a new
  password at first sign-in. 30 minutes without activity signs out. After 5 wrong passwords, this browser waits 15 minutes.

## Accounts

`../safari-ya-mama/supabase/functions/admin-users` (Edge Function, `verify_jwt` on). The
service_role key exists only there. It asks Postgres, with the caller's own token, whether the
action is allowed. It can create (invite email, or a one-time temporary password shown once and
never stored), resend an invite, reset a password, deactivate (ban, never delete) and reactivate.
Every action writes `audit_log` with the target id only.

## Privacy and safety

- Staff see a mother only while she shares with their facility (`can_read_mother`). Opening a record calls `log_view`.
  Her journal is never read. Phone numbers are masked in lists.
- Admins see aggregates only. Any group under 5 mothers is hidden. CSV exports hold aggregates only.
- The audit log is append-only (a trigger refuses updates and deletes). Mothers appear in it only as a short code.
- The Doctor's Note is decrypted in the browser and kept only in page memory.
- Clinical warning rules are not editable here. Lessons and symptom-mentioning announcements need clinical sign-off to publish.

## Navigation

- **Medical staff (at a facility):** Today (alerts, risk, quiet mothers, visits, vaccines, today's appointments), Alerts, Mothers, Appointments (week calendar, open times, video calls via `telemed-join`, done/missed with advice), Mothers' circle review (urgent first; publish, note, hide, remove, strike, reply), Doctor's Note, Check a record, Set up a mother (one-time code via `mother-setup`), Facility KPIs (incl. appointments), Team.
- **Platform:** Programme KPIs (system figures + mothers and care), Facilities, People, Activity & audit log (one page, two tabs), System health, About the numbers (every KPI's definition).
- **Mobile app:** Lessons (step editor with a picture slot per step: upload converts, names `PREFIX-P<n>` and attaches it), App content & pictures (announcements, emergency numbers, every picture ID the app expects with Upload/Replace), Clinical rules (read-only).
- **Website:** Pages (every section of every page, generated forms, preview, publish, history, reset), Blog (TipTap editor, autosave, review workflow, checklist, scheduling, SEO previews), MamaBot (answer library with clinical sign-off, safety phrases, test a question, AI settings), Media library, Partners & impact, Inbox, SEO & settings. Editors see who else is editing (Realtime presence); the blog checks links (`link-check`).

KPI privacy: a group of 1 to 4 mothers is shown as "Fewer than 5"; 0 is shown as 0.

## Content

Lessons (`channels` web/app, draft → published, locked while live, versions with restore),
website pages (`site_content`; the website reads `site_content_public()`), app content
(`app_content`; the app reads `app_content_manifest()`), and media buckets `app-media`
(WebP 1200×900 under 150 KB, named by picture ID such as `NB-SLEEP-P1`) and `site-media`.

## Structure

```
src/app            App, routes, role-based navigation (nav.ts is also the route guard)
src/lib            supabase client, api.ts (every call), session, qr, noteCrypto, format, image, csv
src/components     ui (tokens-only components), layout (shell), QrInput, FacilityMap
src/features       auth · staff (Today, Alerts, Patients, Doctor's Note, Check a record, Facility, Team)
                   admin (Overview, Facilities, People, Activity, Audit, System) · content
src/styles         theme.css: the only place tokens are defined
tests, e2e         unit tests; browser QA with mocked Supabase and synthetic data
```
