// Builds a synthetic snapshot for the dashboard's demo mode (no server). All people are made up.
// The live dashboard never uses this; it reads Supabase under row-level security.
//   node dashboard/scripts/demo_snapshot.mjs > dashboard/dist/demo-snapshot.json
import fs from 'node:fs'; import vm from 'node:vm'; import crypto from 'node:crypto'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), src = path.join(here, '..', 'src');
const ctx = { S: { lang: 'en' }, console }; vm.createContext(ctx);
for (const f of ['data.js', 'content.js', 'rules.js', 'illus.js']) vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f });
vm.runInContext('this.X = {LESSONS, LESSON_ART, triageRules, toDbLevel, LESSON_FACTS, LESSON_RELATED, LESSON_SOURCES, SOURCES}', ctx);
const { LESSONS, LESSON_ART, triageRules, toDbLevel, LESSON_FACTS, LESSON_RELATED, LESSON_SOURCES, SOURCES } = ctx.X;

let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
let n = 0; const id = p => `${p}-${String(++n).padStart(4, '0')}`;
const DAY = 864e5, now = new Date(), today = new Date(now); today.setHours(0, 0, 0, 0);
const day = d => { const x = new Date(today.getTime() - d * DAY); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const at = (d, h = 9, m = 0) => { const x = new Date(today.getTime() - d * DAY); x.setHours(h, m); return x.toISOString(); };

const F1 = 'fac-1', F2 = 'fac-2', F3 = 'fac-3';
const D = {
  taken_at: now.toISOString(),
  facilities: [
    { id: F1, name: 'Sample Health Centre 1', level: 'health_centre', phone: '+255 700 000 001' },
    { id: F2, name: 'Sample Dispensary 2', level: 'dispensary', phone: '+255 700 000 002' },
    { id: F3, name: 'Sample District Hospital', level: 'hospital', phone: '+255 700 000 003' }],
  staff: [
    { id: 'st-hw', name: 'Asha Mwakyusa', role: 'health_worker', email: 'hw@safariyamama.test', facilities: [F1] },
    { id: 'st-fa', name: 'Neema Lyimo', role: 'facility_admin', email: 'facility@safariyamama.test', facilities: [F1] },
    { id: 'st-chw', name: 'Grace Mushi', role: 'health_worker', email: 'chw@safariyamama.test', facilities: [F1] },
    { id: 'st-pa', name: 'Juma Said', role: 'programme_admin', email: 'programme@safariyamama.test', facilities: [] }],
  profiles: [], consents: [], pregnancies: [], babies: [], checkins: [], bp_readings: [], appointments: [], vaccine_doses: [],
  alerts: [], alert_actions: [], visit_questions: [], birth_plans: [], lessons: [],
};
const ANC = [12, 20, 26, 30, 34, 36, 38, 40], VX = [['bcg', 0], ['opv0', 0], ['opv1', 42], ['penta1', 42], ['pcv1', 42], ['rota1', 42], ['opv2', 70], ['penta2', 70], ['pcv2', 70], ['rota2', 70], ['opv3', 98], ['penta3', 98], ['pcv3', 98], ['ipv', 98], ['vita1', 182], ['mr1', 273]];

function mother({ name, phone, fac = F1, share = true, weeks, babyDays, babyName, babyNames, risk = {}, bp = [], checks = [], questions = [], plan }) {
  const m = { id: id('m'), display_name: name, phone, home_facility: fac, lang: pick(['sw', 'sw', 'en']), role: 'mother', created_at: at(60) };
  D.profiles.push(m);
  D.consents.push({ mother_id: m.id, facility_id: fac, kind: 'share_with_facility', granted: share });
  let preg = null, baby = null; const kids = [];
  if (weeks != null) {
    preg = { id: id('p'), mother_id: m.id, lmp: day(weeks * 7 + 2), edd: day(weeks * 7 + 2 - 280), gravida: risk.gravida ?? 2, parity: risk.parity ?? 1, mother_age: risk.age ?? 26, prev_preeclampsia: !!risk.pe, prev_caesarean: !!risk.cs, anaemia: !!risk.an };
    D.pregnancies.push(preg);
    ANC.forEach((w, i) => { const due = weeks * 7 + 2 - w * 7; D.appointments.push({ id: id('a'), mother_id: m.id, kind: 'anc', contact_no: i + 1, due_on: day(due), attended_on: due > 3 && rnd() < 0.85 ? day(due) : null, note: null }); });
  }
  if (babyDays != null) {
    for (const bn of babyNames || [babyName]) {
      baby = { id: id('b'), mother_id: m.id, name: bn, dob: day(babyDays) };
      D.babies.push(baby); kids.push(baby);
      for (const [k, d] of VX) { const due = babyDays - d; D.vaccine_doses.push({ id: id('v'), mother_id: m.id, baby_id: baby.id, vaccine_key: k, due_on: day(due), given_on: due > 2 && rnd() < 0.9 ? day(due) : null }); }
    }
    [[1, 1], [2, 3], [3, 10], [4, 42]].forEach(([c, d]) => { const due = babyDays - d; D.appointments.push({ id: id('a'), mother_id: m.id, baby_id: kids[0].id, kind: 'pnc', contact_no: c, due_on: day(due), attended_on: due > 2 ? day(due) : null, note: null }); });
  }
  for (const [d, s, dd] of bp) D.bp_readings.push({ id: id('bp'), mother_id: m.id, systolic: s, diastolic: dd, level: s >= 160 || dd >= 110 ? 'red' : s >= 140 || dd >= 90 ? 'amber' : 'green', client_created_at: at(d, 10) });
  for (const c of checks) {
    const input = { stage: preg ? 'pregnant' : 'baby', feel: c.feel || 'good', move: c.move || 'normal', signs: c.signs || [], bfeed: c.bfeed || 'well', bsigns: c.bsigns || [], s: c.s || '', d: c.d || '', weeks: weeks ?? 0, babyDays: babyDays ?? 0 };
    const lvl = toDbLevel(triageRules(input).level), cid = id('c');
    D.checkins.push({ id: cid, mother_id: m.id, baby_id: preg ? null : (kids[c.baby || 0] || {}).id || null, stage: preg ? 'pregnant' : 'postnatal', feeling: { good: 'well', okay: 'ok', unwell: 'unwell' }[input.feel], signs: input.signs, baby_signs: input.bsigns, systolic: c.s || null, diastolic: c.d || null, level: lvl, server_level: lvl, note: c.note || null, client_created_at: at(c.ago, c.h ?? 19, c.min ?? 10) });
    if (lvl !== 'green' && share) {
      const aid = id('al'), created = at(c.ago, c.h ?? 19, (c.min ?? 10) + 1);
      const a = { id: aid, mother_id: m.id, facility_id: fac, source_table: 'checkins', source_id: cid, level: lvl, reasons: [...input.signs, ...input.bsigns, ...(c.s ? [`bp ${c.s}/${c.d}`] : [])], status: c.status || 'open', assigned_to: null, created_at: created, acknowledged_at: null, closed_at: null };
      if (a.status !== 'open') {
        const t = new Date(new Date(created).getTime() + (c.ackMin ?? 25) * 6e4).toISOString();
        Object.assign(a, { assigned_to: 'st-hw', acknowledged_at: t, closed_at: a.status === 'closed' ? t : null });
        D.alert_actions.push({ alert_id: aid, actor_id: 'st-hw', action: a.status === 'closed' ? 'closed' : 'called', note: c.actNote || 'Called her; she is going to the health centre.', created_at: t });
      }
      D.alerts.push(a);
    }
  }
  for (const q of questions) D.visit_questions.push({ id: id('q'), mother_id: m.id, body: q, answered: false, created_at: at(3), updated_at: at(3) });
  if (plan) D.birth_plans.push({ id: id('bpn'), mother_id: m.id, pregnancy_id: preg && preg.id, ...plan });
  return m;
}

// The proposal's case: Amina, 28 weeks, BP creeping 115 → 142/92 over 5 weeks, no symptoms.
mother({ name: 'Amina Salim', phone: '+255700000101', weeks: 28, risk: { gravida: 2, parity: 1, age: 27 },
  bp: [[35, 115, 74], [28, 118, 76], [21, 122, 80], [14, 128, 84], [7, 134, 88], [0, 142, 92]],
  checks: [{ ago: 6 }, { ago: 5 }, { ago: 3 }, { ago: 2 }, { ago: 0, h: 8, min: 5, s: 142, d: 92, note: 'The CHW measured my pressure this morning. I feel well.' }],
  questions: ['Is my blood pressure safe for the baby?', 'Where do I go if labour starts at night?'], plan: { items_ready: ['facility', 'card'], transport: 'Bajaji, neighbour Juma' } });
mother({ name: 'Rehema Mrisho', phone: '+255700000104', weeks: 33, risk: { gravida: 3, parity: 2, age: 31, pe: true },
  bp: [[14, 126, 82], [7, 132, 86]], checks: [{ ago: 0, h: 7, min: 40, feel: 'okay', signs: ['headache', 'vision'], note: 'Very bad headache and I see spots.' }, { ago: 4 }] });
mother({ name: 'Fatuma Ally', phone: '+255700000105', weeks: 30, checks: [{ ago: 1, move: 'fewer', status: 'contacted', ackMin: 18, actNote: 'Called. Advised to lie on left side and come to the clinic today.' }, { ago: 3 }] });
mother({ name: 'Bahati Juma', phone: '+255700000102', babyDays: 96, babyName: 'Zuri', checks: [{ ago: 0, h: 6, min: 50, bsigns: ['b_fever'] }, { ago: 2 },
  { ago: 4, bsigns: ['b_g_cold'] }, { ago: 6, bsigns: ['b_g_cold', 'b_g_spit'] }, { ago: 8 }, { ago: 11, bsigns: ['b_g_rash'] }], questions: ['When should Zuri start porridge?'] });
mother({ name: 'Mwanaidi Hassan', phone: '+255700000106', babyDays: 19, babyName: 'Baraka', checks: [{ ago: 0, h: 9, bsigns: ['b_fever'], status: 'referred', ackMin: 9, actNote: 'Newborn with fever: told to go to the hospital now. Husband taking her by bodaboda.' }] });
mother({ name: 'Rehema Mushi', phone: '+255700000114', babyDays: 21, babyNames: ['Hope', 'Faith'],
  checks: [{ ago: 0, h: 8, min: 20 }, { ago: 0, h: 8, min: 20, baby: 1, bsigns: ['b_fever'], note: 'Faith feels hot since the night. Hope is feeding well.' }] });
mother({ name: 'Zawadi Kimaro', phone: '+255700000107', weeks: 22, risk: { age: 17, an: true }, checks: [{ ago: 9 }] });
mother({ name: 'Upendo Massawe', phone: '+255700000108', weeks: 37, risk: { cs: true, parity: 2 }, checks: [{ ago: 2, signs: ['fever'], status: 'closed', ackMin: 40 }, { ago: 1 }, { ago: 0 }], plan: { items_ready: ['facility', 'transport', 'companion', 'cloths', 'card', 'net'] } });
mother({ name: 'Halima Omari', phone: '+255700000109', babyDays: 160, babyName: 'Imani', checks: [{ ago: 0, h: 7, min: 15, bsigns: ['b_g_cold', 'b_g_spit', 'b_g_fussy', 'b_g_stool'], note: 'Imani coughs at night, spits up and cries a lot. Few stools.' },
  { ago: 1, bsigns: ['b_g_cold'] }, { ago: 4, bfeed: 'less', status: 'closed', ackMin: 55 }, { ago: 7, bsigns: ['b_g_rash'] }, { ago: 9 }] });
mother({ name: 'Saida Ngowi', phone: '+255700000110', weeks: 16, checks: [{ ago: 1 }, { ago: 2 }] });
mother({ name: 'Esther Mollel', phone: '+255700000111', weeks: 26, risk: { age: 38, parity: 5, gravida: 6 }, bp: [[7, 138, 86]], checks: [{ ago: 5 }] });
mother({ name: 'Grace Temba', phone: '+255700000112', babyDays: 40, babyName: 'Neema', checks: [{ ago: 3, signs: ['pp_mood'], status: 'closed', ackMin: 70, actNote: 'Visited at home. Referred to the midwife for support; plans follow-up next week.' }, { ago: 0 },
  { ago: 5, bsigns: ['b_g_spit'] }, { ago: 10, bsigns: ['b_yellow'], status: 'closed', ackMin: 35, actNote: 'Checked at the clinic. Feeding well; review in 2 days.' }] });
mother({ name: 'Not Sharing Example', phone: '+255700000113', weeks: 20, share: false, checks: [{ ago: 0, signs: ['bleeding'] }] });
for (let i = 0; i < 6; i++) mother({ name: `Mother ${i + 1} (dispensary)`, phone: `+2557000002${i}0`, fac: F2, weeks: 10 + i * 4, checks: [{ ago: i, signs: i % 2 ? ['vomit'] : [] }] });

// health library (0010 workflow). One lesson waits for approval: edited by another programme admin, so the
// demo admin may approve it (four-eyes rule); 'twins' is a new draft.
const facts = (id, g) => (LESSON_FACTS[id] || []).map(x => x[g]);
for (const l of LESSONS) D.lessons.push({ id: l.id, category: l.cat, format: l.fmt, minutes: l.min, stage: l.stage === 'all' ? 'both' : l.stage, art_keys: LESSON_ART[l.id] || [],
  published: true, status: 'published', version: 1, review_due: null, related: LESSON_RELATED[l.id] || [],
  sources: (LESSON_SOURCES[l.id] || []).map(k => ({ t: SOURCES[k].t, y: SOURCES[k].y })),
  tr: { en: { title: l.t.en, steps: l.s.en, facts: facts(l.id, 'en'), reviewed_by: null, reviewed_on: null }, sw: { title: l.t.sw, steps: l.s.sw, facts: facts(l.id, 'sw'), reviewed_by: null, reviewed_on: null } },
  history: [] });
{ const k = D.lessons.find(l => l.id === 'kicks'); Object.assign(k, { published: false, status: 'in_review', version: 2 });
  k.history = [{ at: at(1, 15), version: 2, action: 'submit', actor: 'Halima Kweka', note: 'Adds a step for twins', actor_id: 'st-pa2' },
    { at: at(1, 14), version: 2, action: 'edit', actor: 'Halima Kweka', note: 'en', actor_id: 'st-pa2' },
    { at: at(2, 10), version: 2, action: 'new_version', actor: 'Halima Kweka', note: null, actor_id: 'st-pa2' }]; }
D.lessons.push({ id: 'twins', category: 'preg', format: 'guide', minutes: 3, stage: 'pregnant', art_keys: [], published: false, status: 'draft', version: 1, review_due: null,
  related: ['kicks', 'danger-preg'], sources: [{ t: SOURCES['who-anc-2016'].t, y: SOURCES['who-anc-2016'].y }],
  tr: { en: { title: 'Expecting twins', steps: ['Go to every clinic visit: twins need closer care.'], facts: [], reviewed_by: null, reviewed_on: null }, sw: { title: '', steps: [], facts: [], reviewed_by: null, reviewed_on: null } },
  history: [{ at: at(3, 11), version: 1, action: 'edit', actor: 'Juma Said', note: 'en', actor_id: 'st-pa' }] });

// what programme_kpis() / programme_weekly() return for this data (counts under 5 hidden)
const hide = v => v < 5 ? null : v;
D.programme_kpis = D.facilities.map(f => {
  const red = D.alerts.filter(a => a.facility_id === f.id && a.level === 'red'), amb = D.alerts.filter(a => a.facility_id === f.id && a.level === 'amber');
  const mothers = D.profiles.filter(p => p.home_facility === f.id).length;
  return { district: f.id === F3 ? 'Sample District B' : 'Sample District A', facility: f.name, mothers: hide(mothers), red_alerts: hide(red.length), amber_alerts: hide(amb.length),
    pct_red_ack_2h: red.length < 5 ? null : Math.round(red.filter(a => a.acknowledged_at && new Date(a.acknowledged_at) - new Date(a.created_at) <= 7.2e6).length / red.length * 100) / 100, lesson_views: Math.floor(rnd() * 40) };
});
// weekly series computed from the same records, with the same small-count rule
const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
D.programme_weekly = Array.from({ length: 5 }, (_, i) => {
  const w = monday(today.getTime() - (4 - i) * 7 * DAY), we = w.getTime() + 7 * DAY, inW = t => { const x = new Date(t).getTime(); return x >= w.getTime() && x < we; };
  const ck = D.checkins.filter(c => inW(c.client_created_at)), al = D.alerts.filter(a => inW(a.created_at));
  const fol = al.filter(a => D.alert_actions.some(x => x.alert_id === a.id && new Date(x.created_at) - new Date(a.created_at) <= DAY));
  const local = `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, '0')}-${String(w.getDate()).padStart(2, '0')}`;
  return { week_start: local, active_mothers: hide(new Set(ck.map(c => c.mother_id)).size), checkins: hide(ck.length), red_alerts: hide(al.filter(a => a.level === 'red').length),
    amber_alerts: hide(al.filter(a => a.level === 'amber').length), pct_followed_24h: al.length < 5 ? null : Math.round(fol.length / al.length * 100) / 100 };
});

// Synthetic tamper-evident ledger (what ledger_summary() / verify_record_proof() would return).
// Same hash shapes as supabase/migrations/0009_ledger_blockchain.sql, but over made-up entries: Simulated.
{
  const H = (...parts) => { const h = crypto.createHash('sha256'); for (const p of parts) h.update(typeof p === 'string' && /^[0-9a-f]{64}$/.test(p) ? Buffer.from(p, 'hex') : Buffer.from(String(p))); return h.digest('hex'); };
  const ent = [];
  const add = (kind, ref, atIso) => ent.push({ kind, ref, at: atIso });
  add('rules_version', '2026.11', at(13, 8, 0)); add('rules_version', '2026.12', at(12, 8, 30));
  D.consents.forEach((c, i) => add('consent', `c-${i + 1}`, at(13 - (i % 4), 10 + (i % 6), (i * 7) % 60)));
  for (const a of D.alert_actions) add('alert_action', a.alert_id, a.created_at);
  for (let d = 11; d >= 1; d--) add('record_proof', `rp-${d}`, at(d, 14, 5));
  add('record_proof', 'rp-sample', at(3, 16, 20)); add('record_proof', 'rp-today', at(0, 7, 45));
  ent.sort((a, b) => a.at < b.at ? -1 : 1);
  let prev = '0'.repeat(64);
  ent.forEach((e, i) => { e.seq = i + 1; e.payload = H(e.kind, e.ref, 'synthetic'); e.hash = prev = H(prev, e.payload, `${e.kind}|${e.ref}|${e.at}`); });
  const merkle = hs => { let l = hs.slice(); while (l.length > 1) { const n = []; for (let i = 0; i < l.length; i += 2) n.push(H(l[i], l[i + 1] ?? l[i])); l = n; } return l[0]; };
  const anchors = [];
  for (let d = 1; d <= 13; d++) {
    const k = day(d), es = ent.filter(e => e.at.slice(0, 10) === new Date(at(d, 12)).toISOString().slice(0, 10)); if (!es.length) continue;
    const st = d <= 2 ? 'submitted' : 'confirmed';
    anchors.push({ day: k, from_seq: es[0].seq, to_seq: es[es.length - 1].seq, root: merkle(es.map(e => e.hash)), status: st, calendar: 'https://a.pool.opentimestamps.org',
      submitted_at: at(d - 1, 0, 15), confirmed_at: st === 'confirmed' ? at(d - 1, 4, 40) : null, bitcoin_block: st === 'confirmed' ? 921400 - d * 144 + (d % 3) : null });
  }
  const head = ent[ent.length - 1], cnt = k => ent.filter(e => e.kind === k).length, sample = ent.find(e => e.ref === 'rp-sample');
  D.ledger = { entries: ent.length, by_kind: { consent: cnt('consent'), alert_action: cnt('alert_action'), rules_version: cnt('rules_version'), record_proof: cnt('record_proof') },
    head_seq: head.seq, head_hash: head.hash, head_at: head.at, rules_version: '2026.12', anchors,
    proofs: ent.filter(e => e.kind === 'record_proof').map(e => ({ hash: e.payload, seq: e.seq, recorded_at: e.at })), sample: 'SYM1:' + sample.payload };
}

process.stdout.write(JSON.stringify(D));
