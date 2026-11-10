// Browser QA of the built dashboard (npm run build && npm run preview, then npm run qa).
// Supabase is mocked with synthetic data (e2e/fixtures.mjs): no request reaches the real project.
// Server-side permissions are proven separately by ../safari-ya-mama/supabase/tests/permissions.sql.
//   1. interaction tests (sign-in, wrong facility, alert flow, audit on open, role-gated UI, content publish)
//   2. every page × every role × 1440 px and 390 px: screenshots in qa/, plus layout checks
//   3. a Kiswahili pass (language stored as sym.lang): busiest pages and sign-in at both widths
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { F1, F2, USERS, world } from './fixtures.mjs';

const BASE = process.env.QA_URL ?? 'http://localhost:4174';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').map((l) => l.trim().match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const SB = env.VITE_SUPABASE_URL;
const OUT = 'qa';
fs.mkdirSync(OUT, { recursive: true });

const MFA_ROLES = ['programme_admin', 'super_admin', 'editor', 'author', 'clinical_reviewer', 'viewer'];
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub, aal) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub, role: 'authenticated', aal, exp: Math.floor(Date.now() / 1000) + 7200, amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: Math.floor(Date.now() / 1000) }], session_id: 's1' })}.sig`;
const userJson = (role, opts = {}) => ({ id: USERS[role].id, aud: 'authenticated', role: 'authenticated', email: USERS[role].email, email_confirmed_at: new Date().toISOString(),
  user_metadata: { must_change_password: !!opts.mustChange }, app_metadata: {}, created_at: new Date().toISOString(),
  factors: opts.factors ?? (MFA_ROLES.includes(role) ? [{ id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'Phone', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] : []) });
const sessionFor = (role, opts = {}) => ({ access_token: jwt(USERS[role].id, opts.aal ?? (MFA_ROLES.includes(role) ? 'aal2' : 'aal1')), refresh_token: 'r', token_type: 'bearer', expires_in: 7200,
  expires_at: Math.floor(Date.now() / 1000) + 7200, user: userJson(role, opts) });

/** Apply PostgREST filters from the query string to fixture rows. */
function filterRows(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = /^(eq|neq|is|gte|lte|lt|gt|in)\.(.*)$/.exec(v);
    if (!m) continue;
    const [, op, raw] = m;
    out = out.filter((r) => {
      const x = r[k];
      if (op === 'is') return raw === 'null' ? x == null : String(x) === raw;
      if (op === 'eq') return String(x) === raw;
      if (op === 'neq') return String(x) !== raw;
      if (op === 'in') return raw.replace(/[()]/g, '').split(',').includes(String(x));
      if (x == null) return false;
      return op === 'gte' ? String(x) >= raw : op === 'lte' ? String(x) <= raw : op === 'lt' ? String(x) < raw : String(x) > raw;
    });
  }
  return out;
}

async function mock(page, role, opts = {}) {
  const W = world();
  const calls = [];
  const unmocked = new Set();
  const me = role ? USERS[role] : null;
  const fac = (id) => W.facilities.find((f) => f.id === id);
  const embedAlert = (a) => ({ ...a, mother: (({ id, display_name, phone }) => ({ id, display_name, phone }))(W.mothers.find((m) => m.id === a.mother_id)), assigned: a.assigned_to ? { display_name: W.people.find((p) => p.id === a.assigned_to)?.display_name ?? 'Someone' } : null });
  const tables = () => ({
    profiles: [...W.mothers, ...(me ? [{ id: me.id, display_name: me.name, role, phone: null, home_facility: null }] : [])],
    pregnancies: W.pregnancies, babies: W.babies, checkins: W.checkins, bp_readings: W.bp, alerts: W.alerts.map(embedAlert), appointments: W.appointments, vaccine_doses: W.vaccines,
    alert_actions: [{ alert_id: 'al2', action: 'acknowledged', note: 'Calling her now', created_at: new Date(Date.now() - 6e5).toISOString(), actor: { display_name: USERS.health_worker.name } }],
    lessons: W.lessons, lesson_versions: [{ id: 1, lesson_id: 'danger-preg', version: 1, published_at: new Date(Date.now() - 5e8).toISOString(), snapshot: { lesson: {}, tr: { en: { title: 'Danger signs in pregnancy', steps: [], reviewed_by: null, reviewed_on: null } } } }],
    site_content: W.site, site_content_versions: W.siteVersions, app_content: W.app, app_content_versions: [],
    mamabot_entries: [{ id: 'mb1', patterns: ['swollen feet', 'miguu kuvimba'], answer_en: 'Some swelling of the feet is common late in pregnancy. Swelling of the face or hands with a headache is a danger sign: go now.', answer_sw: 'Kuvimba miguu kidogo ni kawaida mwishoni mwa ujauzito.', urgency: 'none', source_lesson_id: 'danger-preg', reference: 'WHO ANC 2016', reviewed_by: 'Registered midwife, Sample District', reviewed_on: new Date().toISOString().slice(0, 10), review_hash: 'x', published: true, updated_at: new Date().toISOString(), archived: false }],
    safety_phrases: [{ id: 'sp1', phrase: 'heavy bleeding', lang: 'en', urgency: 'red', published: true, updated_at: new Date().toISOString(), archived: false }],
    blog_posts: W.posts, blog_authors: W.authors, site_sections: W.sections, media: W.media, partners: W.partners, impact_kpis: W.impact, contact_messages: W.messages,
    site_settings: [], seo_pages: [], revisions: [{ id: 3, table_name: 'blog_posts', row_id: 'post1', snapshot: { draft: { title: 'Older title', body: [] } }, author: null, note: 'publish', created_at: new Date(Date.now() - 9e6).toISOString() }, { id: 2, table_name: 'blog_posts', row_id: 'post1', snapshot: { draft: { title: 'First draft', body: [] } }, author: null, note: 'save', created_at: new Date(Date.now() - 9e7).toISOString() }],
    countries: [{ code: 'TZ', name: 'Tanzania' }, { code: 'KE', name: 'Kenya' }, { code: 'UG', name: 'Uganda' }],
    districts: [{ id: W.facilities[0].district_id, country_code: 'TZ', name: 'Sample District A' }, { id: W.facilities[2].district_id, country_code: 'TZ', name: 'Sample District B' }],
  });
  const rpc = (fn, body) => {
    calls.push({ fn, body });
    switch (fn) {
      case 'sign_in_facilities': return W.facilities.filter((f) => f.active).map(({ id, name }) => ({ id, name }));
      case 'staff_of': return true;
      case 'staff_session': {
        if (opts.refuseFacility) return { ok: false, message: 'You are not registered at this facility' };
        return { ok: true, role, name: me.name, facility: { id: body.p_facility, name: fac(body.p_facility).name, level: 'health_centre', phone: null }, facilities: [{ id: F1, name: fac(F1).name }, { id: F2, name: fac(F2).name }] };
      }
      case 'admin_session': return { role, mfa: true, name: me.name };
      case 'mfa_required': return !opts.mfaOff;
      case 'admin_facilities': return W.facilities;
      case 'risk_queue': return W.mothers.slice(0, 5).map((m, i) => ({ mother_id: m.id, display_name: m.display_name, phone: m.phone, stage: i === 2 || i === 4 ? 'baby' : 'pregnant', weeks: i === 2 || i === 4 ? null : 20 + i * 5, baby_days: i === 2 ? 40 : i === 4 ? 12 : null,
        score: [72, 55, 46, 18, 12][i], band: ['high', 'high', 'medium', 'low', 'low'][i], reasons: [['Red check-in in the last 7 days (+40)', 'Pre-eclampsia in a past pregnancy (+12)'], ['BP 142/92, at or above 140/90 (+20)', 'Systolic up 24 mmHg in about 3 weeks (+15)'], ['Red check-in in the last 7 days (+40)', 'Baby under 28 days old (+5)'], ['No check-in for 7+ days (+10)'], ['No check-in for 3+ days (+5)']][i] }));
      case 'set_alert_status': { const a = W.alerts.find((x) => x.id === body.p_alert); Object.assign(a, { status: body.p_status, acknowledged_at: a.acknowledged_at ?? new Date().toISOString(), closed_at: body.p_status === 'closed' ? new Date().toISOString() : null }); return a; }
      case 'assign_alert': { const a = W.alerts.find((x) => x.id === body.p_alert); a.assigned_to = body.p_staff; return null; }
      case 'admin_people': return body.p_facility ? W.people.filter((p) => p.facilities.some((f) => f.id === body.p_facility)) : W.people;
      case 'admin_kpis': return W.kpis;
      case 'admin_kpis_extra': return W.extra;
      case 'platform_kpis': return W.platform;
      case 'preview_token': return '11111111-1111-4111-8111-111111111111';
      case 'blog_save': return { id: body.p_id ?? 'post-new', draft_updated_at: new Date().toISOString(), health_review: 'not_needed' };
      case 'site_sections_import': return (body.p_sections ?? []).length;
      case 'site_section_save': return new Date().toISOString();
      case 'site_page_publish': return 1;
      case 'media_usage': return [];
      case 'staff_slots': return [0, 1, 2, 3].map((i) => ({ id: `sl${i}`, facility_id: F1, staff_id: null, starts_at: new Date(Date.now() + (i + 1) * 3.6e6).toISOString(), minutes: 20, mode: i % 2 ? 'video' : 'clinic', status: i === 0 ? 'booked' : 'open' }));
      case 'staff_bookings': return [{ id: 'bk1', facility_id: F1, starts_at: new Date(Date.now() + 3.6e6).toISOString(), minutes: 20, mode: 'video', reason: 'Headache since yesterday', status: 'booked', created_at: new Date().toISOString(), outcome_note: null, staff_name: null, mother_id: W.mothers[0].id, mother_name: W.mothers[0].display_name, mother_phone: W.mothers[0].phone },
        { id: 'bk2', facility_id: F1, starts_at: new Date(Date.now() - 3.6e6).toISOString(), minutes: 20, mode: 'clinic', reason: null, status: 'booked', created_at: new Date().toISOString(), outcome_note: null, staff_name: null, mother_id: W.mothers[1].id, mother_name: W.mothers[1].display_name, mother_phone: W.mothers[1].phone }];
      case 'staff_add_slots': return body.p_count;
      case 'booking_kpis': return { slots_opened: 40, booked: 28, fill_rate: 0.7, done: 20, missed: 4, cancelled: 2, attendance_rate: 0.83, video: 9, clinic: 19, video_both_joined_rate: 0.78, median_days_booking_to_visit: 3.5, advice_notes_written: 12, mothers_served: 18 };
      case 'community_kpis': return { posts: 120, replies: 300, active_members: 64, anonymous_share: 0.72, held_for_review_share: 0.18, myth_flags: 9, fact_cards_shown: 21, ai_flags: 4, urgent_posts: 3, median_minutes_to_check: 42, median_minutes_urgent: 11, waiting_now: 2, hidden_by_reports: 1, removed: 3, staff_answers: 40, members_with_strikes: null, muted_now: null, top_myths: { 'stop-iron': 4 } };
      case 'community_review_queue': return [
        { id: 'cp1', parent_id: null, topic: 'pregnancy', body: 'My friend says I should stop iron tablets because they make the baby big.', anonymous: true, author_name: null, stage_kind: 'pregnant', stage_value: 24, status: 'review', urgent: false, facts: ['stop-iron'], staff_post: false, health_note: null, created_at: new Date(Date.now() - 3e6).toISOString(), reasons: ['myth:stop-iron', 'new'], ai: null, report_count: 0, reports: [], author_strikes: 0, author_has_name: false, parent_body: null },
        { id: 'cp2', parent_id: null, topic: 'pregnancy', body: 'I have bleeding since morning, what should I do?', anonymous: false, author_name: 'MamaAmina', stage_kind: 'pregnant', stage_value: 30, status: 'review', urgent: true, facts: [], staff_post: false, health_note: null, created_at: new Date(Date.now() - 6e5).toISOString(), reasons: ['urgent'], ai: null, report_count: 0, reports: [], author_strikes: 1, author_has_name: true, parent_body: null }];
      case 'admin_daily': return W.daily;
      case 'admin_facility_table': return W.facilities.map((f, i) => ({ facility_id: f.id, name: f.name, level: f.level, district: f.district, country_code: 'TZ', lat: f.lat, lng: f.lng, active: f.active,
        mothers: [96, 30, null][i], active_7d: [61, 20, null][i], checks: [1100, 332, null][i], red_alerts: [16, 5, null][i], amber_alerts: [70, 26, null][i], open_alerts: [4, 2, null][i], median_ack_red_min: [12, 21, null][i], anc4_pct: [0.61, 0.5, null][i], overdue_visits: [12, 5, null][i],
        last_sync: i < 2 ? new Date(Date.now() - (i + 1) * 3.6e6).toISOString().slice(0, 10) : null, staff: f.staff_count, logins: [44, 12, 0][i], alerts_handled: [91, 30, 0][i] }));
      case 'admin_staff_activity': return W.people.map((p, i) => ({ staff_id: p.id, name: p.display_name, role: p.role, facilities: p.facilities.map((f) => f.name).join(', ') || null, logins: [12, 30, 0, 2, 8, 15][i], alerts_handled: [20, 61, 0, 3, 0, 0][i], last_action: new Date(Date.now() - i * 3.6e6).toISOString(), last_sign_in_at: p.last_sign_in_at }));
      case 'admin_audit': return body.p_before ? [] : Array.from({ length: 8 }, (_, i) => ({ id: 100 - i, at: new Date(Date.now() - i * 9e5).toISOString(), actor_id: W.people[i % 4].id, actor_name: W.people[i % 4].display_name, actor_role: W.people[i % 4].role,
        action: ['staff_sign_in', 'view_mother', 'alert_status', 'open_note_share', 'staff_sign_in_refused', 'lesson_publish', 'account_create', 'verify_record_proof'][i], facility_id: F1, facility_name: fac(F1).name,
        subject: [null, 'Mother 3fa91c', 'Mother 3fa91c', 'Mother 8e21aa', null, null, 'Zuhura Test (HW)', 'Mother 51bd02'][i], details: [{}, { what: 'record' }, { alert: 'al1', status: 'acknowledged' }, { sections: ['S', 'B', 'A', 'R'] }, {}, { lesson: 'danger-preg', version: 1 }, { role: 'health_worker', method: 'invite' }, {}][i] }));
      case 'admin_audit_actions': return [{ action: 'staff_sign_in', n: 44 }, { action: 'view_mother', n: 120 }, { action: 'alert_status', n: 91 }];
      case 'admin_system': return { checked_at: new Date().toISOString(),
        cron: [{ job: 'purge-deleted', schedule: '30 1 * * *', active: true, last: { status: 'succeeded', start: new Date(Date.now() - 3e7).toISOString(), end: null, message: null }, failures_24h: 0 },
          { job: 'red-escalation', schedule: '*/15 * * * *', active: true, last: { status: 'succeeded', start: new Date(Date.now() - 4e5).toISOString(), end: null, message: null }, failures_24h: 0 },
          { job: 'visit-reminders', schedule: '0 6 * * *', active: true, last: { status: 'failed', start: new Date(Date.now() - 2e7).toISOString(), end: null, message: 'example failure message' }, failures_24h: 1 }],
        queue: { queued: 14, due: 3, oldest_due: new Date(Date.now() - 2.4e6).toISOString(), sent_24h: 120, failed_24h: 2, failed_7d: 5, by_channel: { push: 14 } },
        failed_recent: [{ template: 'red_alert_unacked', channel: 'push', at: new Date(Date.now() - 6e6).toISOString() }], push_devices: 88,
        ai: { last_24h: 11, last_7d: 74, per_day: Array.from({ length: 14 }, (_, i) => ({ day: new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10), n: 4 + ((i * 5) % 9) })) },
        data: { last_checkin: new Date(Date.now() - 2e5).toISOString(), last_mother_signup: new Date(Date.now() - 9e7).toISOString(), last_staff_sign_in: new Date(Date.now() - 6e4).toISOString(), mothers: 126, caregivers: 44, staff: 6, admins: 2, pending_deletions: 1 }, db_size_mb: 38.2 };
      case 'facility_kpis': return [{ mothers_sharing: 6, checkins: 140, red_alerts: 3, amber_alerts: 9, median_ack_minutes: 12.5, anc4_rate: 0.5, visits_missed: 2 }];
      case 'facility_daily': return W.daily.map(({ day, checks, red, amber }) => ({ day, checks: Math.round(checks / 6), red: red ? 1 : 0, amber: amber > 3 ? 1 : 0 }));
      case 'child_check_kpis': return [{ checks: 24, children: 2, green: 19, amber: 3, red: 2, top_signs: [{ sign: 'b_feed', n: 3 }, { sign: 'b_fits', n: 1 }] }];
      case 'staff_caregivers': return [{ name: 'Test Partner', relation: 'partner', since: new Date(Date.now() - 2e9).toISOString() }];
      case 'log_view': return true;
      case 'open_note_share': return [{ ciphertext: W.vector.ciphertext, sections: ['S', 'B', 'A', 'R'], created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 864e5).toISOString() }];
      case 'verify_record_proof': return [{ proof_id: 'p1', ledger_seq: 42, issued_at: new Date(Date.now() - 864e5).toISOString(), chain_ok: true,
        record_doc: { vaccines: [{ vaccine_key: 'bcg', due_on: '2026-09-25', given_on: '2026-09-25' }, { vaccine_key: 'opv1', due_on: '2026-11-07', given_on: null }], visits: [{ kind: 'pnc', contact_no: 1, due_on: '2026-09-27', attended_on: '2026-09-27' }] } }];
      case 'app_content_manifest': return { schema: 1, content_version: 7, generated_at: new Date().toISOString(), lessons: [{ id: 'danger-preg' }], content: { 'emergency.tz': {} } };
      case 'admin_save_facility': return '00000000-0000-4000-c000-0000000000f9';
      default: return null;
    }
  };

  await page.route(/tile\.openstreetmap\.org/, (r) => r.abort());
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (p.startsWith('/auth/v1/token')) {
      calls.push({ fn: 'auth.token', body: req.postDataJSON?.() });
      return json(sessionFor(role, { aal: opts.aal }));
    }
    if (p === '/auth/v1/user') return json(userJson(role, opts));
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (p === '/auth/v1/factors' && req.method() === 'POST') return json({ id: 'f9', type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/x' } });
    if (p.startsWith('/rest/v1/rpc/')) return json(rpc(p.slice('/rest/v1/rpc/'.length), req.postDataJSON?.() ?? {}));
    if (p.startsWith('/rest/v1/')) {
      const t = p.slice('/rest/v1/'.length);
      if (req.method() !== 'GET') { calls.push({ fn: `${req.method()} ${t}`, body: req.postDataJSON?.() }); return json([{}]); }
      const rows = tables()[t];
      if (!rows) { unmocked.add(`${req.method()} ${p}`); return json([]); }
      const out = filterRows(rows, url.searchParams);
      return (req.headers()['accept'] ?? '').includes('vnd.pgrst.object') ? json(out[0] ?? null, out[0] ? 200 : 406) : json(out);
    }
    if (p.startsWith('/storage/v1/object/list/')) return json([{ name: 'PR-DANGER-P1.webp', id: 'o1', updated_at: new Date().toISOString(), metadata: { size: 88000 } }]);
    if (p.startsWith('/storage/v1/object/') && req.method() === 'POST') { calls.push({ fn: `upload ${p.split('/').slice(4).join('/')}` }); return json({ Key: p }); }
    if (p.startsWith('/storage/v1/object/public/')) return route.fulfill({ status: 404, body: '' });
    if (p.startsWith('/functions/v1/')) {
      const slug = p.split('/')[3];
      if (req.method() === 'POST') {
        const body = req.postDataJSON?.() ?? {}; calls.push({ fn: `fn.${slug}`, body });
        if (slug === 'mother-setup') return json({ code: '48213307', expires_at: new Date(Date.now() + 864e5).toISOString() });
        if (slug === 'telemed-join') return json({ error: 'too_early', opens_at: new Date(Date.now() + 9e5).toISOString() }, 425);
        if (slug === 'community') return json({ id: 'cp9', status: 'published', urgent: false, facts: [], reasons: [] });
        if (slug === 'link-check') return json({ results: (body.urls ?? []).map((u) => ({ url: u, ok: true, status: 200, note: 'works' })) });
        return json(body.method === 'temp_password' ? { ok: true, user_id: 'u9', temp_password: 'Tq7#mXk2pL9vR4wz' } : { ok: true, user_id: 'u9' });
      }
      return slug === 'send-notifications' ? json({ error: 'not found' }, 404) : json({ error: 'POST only' }, 405);
    }
    unmocked.add(`${req.method()} ${p}`);
    return json({});
  });

  if (role && !opts.signedOut) {
    await page.addInitScript(([s, kind, fid]) => {
      localStorage.setItem('sym-dashboard', JSON.stringify(s));
      sessionStorage.setItem('sym.kind', kind);
      if (fid) sessionStorage.setItem('sym.facility', fid);
    }, [sessionFor(role, opts), MFA_ROLES.includes(role) ? 'admin' : 'staff', ['health_worker', 'facility_admin'].includes(role) ? F1 : null]);
  }
  return { calls, unmocked, W };
}

const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const ERRORS_EN = /could not|went wrong|not available to your role|Page not found/i;
async function layoutCheck(page, label, { expectH1 = true, errors = ERRORS_EN } = {}) {
  const r = await page.evaluate((errSrc) => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    h1: document.querySelectorAll('h1').length,
    errors: [...document.querySelectorAll('[role=alert]')].map((e) => e.textContent ?? '').filter((t) => new RegExp(errSrc, 'i').test(t)),
    small: [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select')].filter((e) => {
      const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && !e.closest('.leaflet-container') && (e.tagName === 'A' ? b.height < 24 : Math.min(b.height, b.width) < 24) && !e.classList.contains('sr-only');
    }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30)),
  }), errors.source);
  const problems = [];
  if (r.overflow > 1) {
    // name the outermost element that sticks out, so the fix is obvious
    const culprit = await page.evaluate(() => {
      const w = window.innerWidth;
      const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (getComputedStyle(a).overflowX !== 'visible') return true; } return false; };
      const out = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 1 && !clipped(e) && !(e.parentElement && e.parentElement.getBoundingClientRect().right > w + 1));
      return out.slice(0, 2).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 4).join('.')}`).join(' , ');
    });
    problems.push(`page scrolls sideways by ${r.overflow}px (${culprit})`);
  }
  if (expectH1 && r.h1 !== 1) problems.push(`${r.h1} h1 headings`);
  if (r.errors.length) problems.push(`error state: ${r.errors[0].slice(0, 80)}`);
  if (r.small.length) problems.push(`targets under 24px: ${r.small.slice(0, 3).join(' | ')}`);
  ok(`layout ${label}`, problems.length === 0, problems.join('; '));
}

const PAGES = {
  health_worker: ['/appointments', '/circle', '/setup-mother', '/today', '/alerts', '/alerts?id=al1', '/patients', '/patients/00000000-0000-4000-c000-000000000101', '/note', '/record'],
  facility_admin: ['/today', '/alerts?id=al3', '/facility', '/team'],
  programme_admin: ['/overview', '/facilities', '/people', '/activity', '/activity?tab=audit', '/system', '/about-numbers', '/app/lessons', '/app/content', '/app/content?tab=pictures', '/app/rules',
    '/circle', '/website/mamabot', '/website/mamabot?tab=safety', '/website/mamabot?tab=test', '/website/mamabot?tab=settings', '/website/pages', '/website/blog', '/website/blog?tab=authors', '/website/media', '/website/partners', '/website/partners?tab=impact', '/website/inbox', '/website/settings', '/website/settings?tab=seo'],
  super_admin: ['/facilities', '/people'],
  editor: ['/website/pages', '/website/blog', '/website/blog/post1', '/website/media'],
  author: ['/website/blog', '/website/blog/post2'],
};

const browser = await chromium.launch();
const ctxFor = (w) => browser.newContext({ viewport: w === 390 ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const consoleErrors = [];
const watch = (page, label) => page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|realtime|ERR_FAILED|Failed to load resource/i.test(m.text())) consoleErrors.push(`${label}: ${m.text().slice(0, 160)}`); });
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => undefined); await page.waitForTimeout(350); };

// ───────── 1. interaction tests
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'signin');
  const m = await mock(page, 'health_worker', { signedOut: true });
  await page.goto(BASE + '/'); await settle(page);
  ok('sign-in page offers Medical staff and Administration', (await page.getByRole('tab').allTextContents()).join('|').includes('Medical staff') && (await page.getByRole('tab', { name: /Administration/ }).count()) === 1);
  await page.getByLabel(/Facility/).selectOption(F1);
  await page.getByLabel('Email').fill('hw@example.invalid'); await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: /Sign in at this facility/ }).click(); await settle(page);
  ok('staff sign-in with the facility dropdown lands on Today', await page.getByRole('heading', { level: 1, name: 'Today' }).count() === 1);
  ok('the server facility check ran (staff_session)', m.calls.some((c) => c.fn === 'staff_session' && c.body.p_facility === F1));
  const navText = (await page.locator('nav[aria-label=Dashboard]').first().textContent()) ?? '';
  ok('health worker sidebar has no admin pages', !/Overview|People|Audit|Facilities/.test(navText) && /Alerts/.test(navText));
  await page.goto(BASE + '/people'); await settle(page);
  ok('health worker opening /people sees "not available"', (await page.getByText('This page is not available to your role').count()) === 1);
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'wrong-facility');
  await mock(page, 'health_worker', { signedOut: true, refuseFacility: true });
  await page.goto(BASE + '/'); await settle(page);
  await page.getByLabel(/Facility/).selectOption(F2);
  await page.getByLabel('Email').fill('hw@example.invalid'); await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: /Sign in at this facility/ }).click(); await settle(page);
  ok('wrong facility refused and signed out with a plain message', (await page.getByText('You are not registered at this facility').count()) === 1 && (await page.getByRole('button', { name: /Sign in at this facility/ }).count()) === 1);
  await shot(page, 'flow-wrong-facility');
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'alert-flow');
  const m = await mock(page, 'health_worker');
  await page.goto(BASE + '/alerts?id=al1'); await settle(page);
  await page.getByLabel(/What you did/).fill('Called, she is on her way');
  await page.getByRole('button', { name: 'Acknowledge', exact: true }).click(); await settle(page);
  ok('acknowledge calls set_alert_status with the note', m.calls.some((c) => c.fn === 'set_alert_status' && c.body.p_status === 'acknowledged' && c.body.p_note === 'Called, she is on her way'));
  await page.getByRole('button', { name: 'Close alert', exact: true }).click(); await settle(page);
  ok('close calls set_alert_status closed', m.calls.some((c) => c.fn === 'set_alert_status' && c.body.p_status === 'closed'));
  await page.goto(BASE + '/patients/00000000-0000-4000-c000-000000000102'); await settle(page);
  ok('opening a patient record writes audit_log (log_view)', m.calls.some((c) => c.fn === 'log_view' && c.body.p_mother === '00000000-0000-4000-c000-000000000102'));
  ok('patient page shows the full phone and a call button', (await page.getByRole('link', { name: /Call \+255700000102/ }).count()) === 1);
  await page.goto(BASE + '/patients'); await settle(page);
  ok('patient list masks phone numbers', (await page.getByText(/07•• ••• 101/).count()) === 1 && (await page.getByText('+255700000101').count()) === 0);
  await page.goto(BASE + '/note'); await settle(page);
  await page.getByLabel('QR text').fill(world().vector.qr); await page.getByRole('button', { name: 'Check' }).click(); await settle(page);
  ok("Doctor's Note decrypts in the browser and shows S/B/A/R", (await page.getByRole('heading', { name: /Situation/ }).count()) === 1 && (await page.getByRole('heading', { name: /Request/ }).count()) === 1);
  await shot(page, 'flow-doctor-note');
  await page.goto(BASE + '/note'); await settle(page);
  ok('the decrypted note is gone after leaving the page', (await page.getByRole('heading', { name: /Situation/ }).count()) === 0);
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'admin-limits');
  const m = await mock(page, 'programme_admin');
  await page.goto(BASE + '/facilities'); await settle(page);
  ok('admin sees no "Add facility" button', (await page.getByRole('button', { name: 'Add facility' }).count()) === 0 && (await page.getByRole('button', { name: /^Edit/ }).count()) === 0);
  await page.goto(BASE + '/people'); await settle(page);
  await page.getByRole('button', { name: 'Add person' }).click();
  const roleOpts = await page.getByRole('dialog').getByLabel(/^Role/).locator('option').allTextContents();
  ok('admin adds health workers and the website team, never admins', roleOpts.includes('Health worker') && roleOpts.includes('Website editor') && !roleOpts.some((o) => /Admin/.test(o)), roleOpts.join(', '));
  await page.keyboard.press('Escape');
  await page.goto(BASE + '/app/content'); await settle(page);
  await page.getByRole('button', { name: /Home announcement/ }).click(); await settle(page);
  ok('an announcement that mentions symptoms asks for clinical sign-off', (await page.getByRole('button', { name: 'Publish…' }).count()) === 1);
  await page.getByRole('button', { name: 'Publish…' }).click();
  ok('the sign-off dialog needs reviewer role and date', await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).isDisabled());
  await page.keyboard.press('Escape');
  await page.goto(BASE + '/app/content?tab=pictures'); await settle(page);
  ok('app pictures list every expected picture with an Upload button (no file names to type)', (await page.getByRole('button', { name: 'Upload' }).count()) > 50 && (await page.getByText('PR-DANGER-P1').count()) >= 1);
  await page.goto(BASE + '/activity?tab=audit'); await settle(page);
  ok('activity and audit log are one page with tabs', (await page.getByRole('tab', { name: 'Staff activity' }).count()) === 1 && (await page.getByRole('tab', { name: 'Audit log' }).getAttribute('aria-selected')) === 'true');
  await page.goto(BASE + '/overview'); await settle(page);
  ok('Programme KPIs show system figures and care figures', (await page.getByText('Facilities active').count()) === 1 && (await page.getByText('First ANC visit before 12 weeks').count()) === 1);
  await page.goto(BASE + '/website/pages'); await settle(page);
  await page.getByRole('button', { name: /Import \d+ sections/ }).click(); await settle(page);
  ok('website sections import from the built-in content', m.calls.some((c) => c.fn === 'site_sections_import' && c.body.p_sections.length > 30));
  await page.getByRole('button', { name: 'Edit' }).first().click(); await settle(page);
  await page.getByLabel('Eyebrow').fill('Changed by QA');
  await page.getByRole('button', { name: 'Save draft' }).click(); await settle(page);
  ok('a section saves through site_section_save with the edited field', m.calls.some((c) => c.fn === 'site_section_save' && c.body.p_draft.eyebrow === 'Changed by QA'));
  await page.getByRole('button', { name: 'Publish', exact: true }).click(); await settle(page);
  ok('a section publishes', m.calls.some((c) => c.fn === 'site_section_publish'));
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'super');
  const m = await mock(page, 'super_admin');
  await page.goto(BASE + '/facilities'); await settle(page);
  await page.getByRole('button', { name: 'Add facility' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel(/^Name/).fill('Perm Test Facility');
  await dlg.getByLabel(/^District/).selectOption({ index: 1 });
  await dlg.getByRole('button', { name: 'Create facility' }).click(); await settle(page);
  ok('super admin creates a facility (admin_save_facility)', m.calls.some((c) => c.fn === 'admin_save_facility' && c.body.p_name === 'Perm Test Facility'));
  await page.goto(BASE + '/people'); await settle(page);
  await page.getByRole('button', { name: 'Add person' }).click();
  const d2 = page.getByRole('dialog');
  await d2.getByLabel(/Full name/).fill('New Facility Admin'); await d2.getByRole('textbox', { name: 'Email' }).fill('newfa@example.invalid');
  await d2.getByLabel(/^Role/).selectOption('facility_admin'); await d2.getByLabel(/^Facility/).selectOption(F1);
  await d2.getByRole('radio', { name: /Temporary password/ }).check();
  await d2.getByRole('button', { name: 'Create account' }).click(); await settle(page);
  ok('super admin creates a facility admin through admin-users', m.calls.some((c) => c.fn === 'fn.admin-users' && c.body.action === 'create' && c.body.role === 'facility_admin' && c.body.facility_id === F1));
  ok('the temporary password is shown once', (await page.locator('[data-temp-password]').count()) === 1);
  await shot(page, 'flow-temp-password');
  await ctx.close();
}

{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'super-at-facility');
  const m = await mock(page, 'super_admin', { signedOut: true });
  await page.goto(BASE + '/'); await settle(page);
  await page.getByLabel(/Facility/).selectOption(F2);
  await page.getByLabel('Email').fill('super@example.invalid'); await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: /Sign in at this facility/ }).click(); await settle(page);
  ok('super admin can sign in at the Medical staff entrance', (await page.getByRole('heading', { level: 1, name: 'Today' }).count()) === 1 && m.calls.some((c) => c.fn === 'staff_session' && c.body.p_facility === F2));
  ok('no "Administrators sign in under Administration" message', (await page.getByText(/sign in under Administration/).count()) === 0);
  await page.getByLabel('Working in').selectOption('admin'); await settle(page);
  await page.goto(BASE + '/overview'); await settle(page);
  ok('super admin switches back to Administration from the top bar', (await page.getByRole('heading', { level: 1, name: 'Programme KPIs' }).count()) === 1);
  await page.getByLabel('Working in').selectOption(F1); await settle(page);
  await page.goto(BASE + '/alerts'); await settle(page);
  ok('and opens any facility from the top bar', (await page.getByRole('heading', { level: 1, name: 'Alerts' }).count()) === 1);
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'editor');
  const m = await mock(page, 'editor');
  await page.goto(BASE + '/'); await settle(page);
  const navText = (await page.locator('nav[aria-label=Dashboard]').first().textContent()) ?? '';
  ok('website editor sees only the Website section', /Blog/.test(navText) && !/Mothers|Programme KPIs|People|Lessons/.test(navText));
  await page.goto(BASE + '/website/blog'); await settle(page);
  await page.getByRole('button', { name: 'New blog post' }).click(); await settle(page);
  ok('new post is created through blog_save', m.calls.some((c) => c.fn === 'blog_save' && c.body.p_id === null));
  await page.goto(BASE + '/website/blog/post1'); await settle(page);
  ok('post editor loads the body as headings, lists and quotes', (await page.locator('.post-body h2').count()) === 1 && (await page.locator('.post-body ul li').count()) === 2 && (await page.locator('.post-body blockquote').count()) === 1);
  await page.locator('.post-body p').first().click(); await page.keyboard.press('End'); await page.keyboard.type(' Added by QA.');
  await page.getByRole('button', { name: /Save now/ }).click(); await settle(page);
  const saved = m.calls.filter((c) => c.fn === 'blog_save' && c.body.p_id === 'post1').pop();
  ok('saving sends the website block shape with marks', !!saved && saved.body.p_draft.body.some((b) => b.type === 'p' && /\*\*early\*\*.*Added by QA\./.test(b.text)) && saved.body.p_draft.body.some((b) => b.type === 'quote' && b.source === 'Midwife, Sample District'), JSON.stringify(saved?.body.p_draft.body ?? null).slice(0, 200));
  ok('publish waits for the checklist (honesty check)', await page.getByRole('button', { name: /Update live post/ }).isDisabled());
  await shot(page, 'flow-post-editor');
  await page.goto(BASE + '/website/partners'); await settle(page);
  ok('editor cannot confirm partners (Admin only)', (await page.getByRole('button', { name: 'Confirm' }).count()) === 0);
  await page.goto(BASE + '/people'); await settle(page);
  ok('editor opening /people sees "not available"', (await page.getByText('This page is not available to your role').count()) === 1);
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'care');
  const m = await mock(page, 'health_worker');
  await page.goto(BASE + '/setup-mother'); await settle(page);
  await page.getByLabel(/Phone number/).fill('0712 345 678'); await page.getByLabel(/Her name/).fill('Test Mother');
  await page.getByRole('button', { name: 'Make her code' }).click(); await settle(page);
  ok('setting up a mother calls mother-setup and shows the code once', m.calls.some((c) => c.fn === 'fn.mother-setup' && c.body.action === 'create' && c.body.facility_id === F1) && (await page.locator('[data-setup-code]').textContent())?.includes('4821 3307'));
  await page.goto(BASE + '/circle'); await settle(page);
  ok('urgent circle posts come first with reasons in plain words', ((await page.locator('article').first().textContent()) ?? '').includes('Urgent') && (await page.getByText(/States a myth as fact/).count()) === 1);
  await page.getByRole('button', { name: 'Publish with a note' }).last().click();
  await page.getByRole('dialog').getByLabel('Note').fill('Keep taking your iron every day.');
  await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click(); await settle(page);
  ok('publish with a note calls moderate_community_post', m.calls.some((c) => c.fn === 'moderate_community_post' && c.body.p_action === 'note' && c.body.p_note === 'Keep taking your iron every day.'));
  await page.goto(BASE + '/appointments'); await settle(page);
  await page.getByRole('button', { name: 'Open times' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /^Open \d+ times/ }).click(); await settle(page);
  ok('opening times calls staff_add_slots', m.calls.some((c) => c.fn === 'staff_add_slots' && c.body.p_count === 8 && c.body.p_facility === F1));
  await page.getByRole('button', { name: 'Join call' }).first().click(); await settle(page);
  ok('joining a video call too early explains when it opens', (await page.getByText(/Too early: the call opens at/).count()) === 1);
  await page.goto(BASE + '/today'); await settle(page);
  ok("Today lists today's appointments", (await page.getByRole('heading', { name: "Today's appointments" }).count()) === 1);
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'mamabot');
  await mock(page, 'editor');
  await page.goto(BASE + '/website/mamabot?tab=test'); await settle(page);
  await page.getByLabel("A mother's question").fill('My feet are swollen, is it swollen feet?');
  ok('MamaBot test box finds the matching answer', (await page.getByText(/Matched 1 pattern/).count()) === 1);
  await page.getByLabel("A mother's question").fill('I have heavy bleeding');
  ok('a safety phrase wins over answers', (await page.getByText(/Safety phrase “heavy bleeding”/).count()) === 1);
  await page.goto(BASE + '/website/mamabot?tab=safety'); await settle(page);
  ok('editors cannot change safety phrases', (await page.getByRole('button', { name: 'Add' }).count()) === 0);
  await ctx.close();
}
{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'lesson-pictures');
  await mock(page, 'programme_admin');
  await page.goto(BASE + '/app/lessons'); await settle(page);
  await page.getByRole('button', { name: /Breastfeeding in the first days/ }).click(); await settle(page);
  ok('each lesson step has its own picture upload', (await page.getByRole('button', { name: 'Upload' }).count()) >= 2 && (await page.getByText(/named BF-FIRST-P1/).count()) === 1);
  await ctx.close();
}

{
  const ctx = await ctxFor(1440); const page = await ctx.newPage(); watch(page, 'mfa-hold');
  await mock(page, 'super_admin', { signedOut: true, aal: 'aal1', mfaOff: true });
  await page.goto(BASE + '/'); await settle(page);
  await page.getByRole('tab', { name: /Administration/ }).click();
  await page.getByLabel('Email').fill('super@example.invalid'); await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: 'Continue' }).click(); await settle(page);
  ok('two-step sign-in on hold: email and password open the dashboard', (await page.getByRole('heading', { level: 1, name: 'Programme KPIs' }).count()) === 1 && (await page.getByLabel('6-digit code').count()) === 0);
  await page.goto(BASE + '/system'); await settle(page);
  ok('System health shows the two-step switch to the super admin', (await page.getByRole('switch', { name: /Require the 6-digit code/ }).count()) === 1);
  await ctx.close();
}

// ───────── 2. every page × role × width
for (const w of [1440, 390]) {
  for (const [role, pages] of Object.entries(PAGES)) {
    const ctx = await ctxFor(w); const page = await ctx.newPage(); watch(page, `${role}@${w}`);
    const m = await mock(page, role);
    for (const p of pages) {
      await page.goto(BASE + p); await settle(page);
      const name = `${role}-${w}-${p.replace(/^\//, '').replace(/[/?=]/g, '_').replace(/0{8}-0000-4000-c000-0+/, 'id') || 'home'}`;
      await layoutCheck(page, `${role} ${p} @${w}`);
      await shot(page, name);
    }
    if (role === 'programme_admin') {
      await page.goto(BASE + '/website/pages'); await settle(page);
      await page.getByRole('button', { name: 'Edit' }).first().click(); await settle(page);
      await layoutCheck(page, `section editor @${w}`); await shot(page, `${role}-${w}-section-editor`);
      await page.goto(BASE + '/app/lessons'); await settle(page);
      await page.getByRole('button', { name: /Breastfeeding in the first days/ }).click(); await settle(page);
      await layoutCheck(page, `lesson editor @${w}`); await shot(page, `${role}-${w}-lesson-editor`);
    }
    if (m.unmocked.size) ok(`all requests mocked for ${role}@${w}`, false, [...m.unmocked].join(', '));
    await ctx.close();
  }
  // auth screens
  for (const [name, role, opts] of [['signin', 'health_worker', { signedOut: true }], ['set-password', 'health_worker', { mustChange: true }], ['mfa-enroll', 'programme_admin', { aal: 'aal1', factors: [] }], ['mfa-verify', 'super_admin', { aal: 'aal1' }]]) {
    const ctx = await ctxFor(w); const page = await ctx.newPage(); watch(page, `${name}@${w}`);
    await mock(page, role, opts);
    await page.goto(BASE + '/'); await settle(page);
    await layoutCheck(page, `${name} @${w}`);
    await shot(page, `auth-${w}-${name}`);
    if (name === 'signin') { await page.getByRole('tab', { name: /Administration/ }).click(); await shot(page, `auth-${w}-signin-admin`); }
    await ctx.close();
  }
}

// ───────── 3. Kiswahili (src/i18n/sw.json): longer words must not break the layout
{
  const ERRORS_SW = /could not|went wrong|ha\w*kuweza|hitilafu|haupatikani|haukupatikana/i;
  const SW_PAGES = { health_worker: ['/today', '/appointments', '/circle'], programme_admin: ['/overview', '/people', '/app/lessons', '/website/pages'], editor: ['/website/blog/post1'] };
  const swFirst = (page) => page.addInitScript(() => { try { localStorage.setItem('sym.lang', 'sw'); } catch { /* ignore */ } });
  for (const w of [1440, 390]) {
    for (const [role, pages] of Object.entries(SW_PAGES)) {
      const ctx = await ctxFor(w); const page = await ctx.newPage(); watch(page, `sw ${role}@${w}`);
      await mock(page, role); await swFirst(page);
      for (const p of pages) {
        await page.goto(BASE + p); await settle(page);
        await layoutCheck(page, `sw ${role} ${p} @${w}`, { errors: ERRORS_SW });
        await shot(page, `sw-${role}-${w}-${p.replace(/^\//, '').replace(/[/?=]/g, '_')}`);
      }
      if (w === 1440 && role === 'health_worker') {
        await page.goto(BASE + '/today'); await settle(page);
        ok('Kiswahili: the interface switches language (html lang, heading, nav)', (await page.evaluate(() => document.documentElement.lang)) === 'sw'
          && (await page.getByRole('heading', { level: 1, name: 'Leo' }).count()) === 1 && (await page.getByRole('combobox', { name: 'Lugha' }).first().inputValue()) === 'sw');
        await page.getByRole('combobox', { name: 'Lugha' }).first().selectOption('en'); await settle(page);
        ok('Kiswahili: switching back to English in the top bar works', (await page.getByRole('heading', { level: 1, name: 'Today' }).count()) === 1 && (await page.evaluate(() => document.documentElement.lang)) === 'en');
      }
      await ctx.close();
    }
    const ctx = await ctxFor(w); const page = await ctx.newPage(); watch(page, `sw signin@${w}`);
    await mock(page, 'health_worker', { signedOut: true }); await swFirst(page);
    await page.goto(BASE + '/'); await settle(page);
    await layoutCheck(page, `sw signin @${w}`, { errors: ERRORS_SW });
    await shot(page, `sw-auth-${w}-signin`);
    if (w === 1440) ok('Kiswahili: the sign-in page is translated', (await page.getByRole('heading', { level: 1, name: 'Ingia' }).count()) === 1 && (await page.getByRole('tab', { name: /Utawala/ }).count()) === 1);
    await ctx.close();
  }
}

await browser.close();
if (consoleErrors.length) ok('no console errors', false, consoleErrors.slice(0, 5).join(' || '));
else ok('no console errors', true);
const fail = results.filter((r) => !r.pass);
console.log(`\n${results.length - fail.length} passed, ${fail.length} failed. Screenshots in ${OUT}/`);
process.exit(fail.length ? 1 : 0);
