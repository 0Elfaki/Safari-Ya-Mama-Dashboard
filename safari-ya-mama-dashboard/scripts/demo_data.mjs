// Safari ya Mama · load demo accounts and synthetic records into a LOCAL Supabase.
// All names are made up. Never run against production.
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... node dashboard/scripts/demo_data.mjs
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY');
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.I_UNDERSTAND_THIS_IS_NOT_PROD !== 'yes')
  throw new Error('Refusing to load demo data into a non-local project');
const db = createClient(url, key, { auth: { persistSession: false } });

const F1 = '00000000-0000-4000-a000-0000000000f1', F2 = '00000000-0000-4000-a000-0000000000f2', F3 = '00000000-0000-4000-a000-0000000000f3';
export const PASSWORD = 'SafariMama-demo-2026';
const day = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
const iso = d => d.toISOString().slice(0, 10);
const ago = (days, h = 9, m = 0) => { const d = new Date(today.getTime() - days * day); d.setHours(h, m, 0, 0); return d; };
const ok = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];

// ---------- wipe previous demo data ----------
const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
for (const u of users) await db.auth.admin.deleteUser(u.id);
await db.from('audit_log').delete().gte('id', 0); // everything else is removed with its user (on delete cascade)

async function user(attrs) { return ok(await db.auth.admin.createUser({ ...attrs, email_confirm: true, phone_confirm: true }), 'createUser').user.id; }
async function profile(id, p) { ok(await db.from('profiles').upsert({ id, lang: 'sw', country_code: 'TZ', district_id: '00000000-0000-4000-a000-000000000d01', ...p }), 'profile'); }
async function share(mother, fac, on = true, daysAgo = 30) {
  ok(await db.from('consents').insert({ mother_id: mother, kind: 'share_with_facility', facility_id: fac, granted: on, text_version: 'consent-sw-2026-10', created_at: ago(daysAgo).toISOString() }), 'consent');
}

// ---------- staff ----------
const staff = {};
for (const [k, name, role, fac, email] of [
  ['hw1', 'Asha Mollel', 'health_worker', F1, 'hw@safariyamama.test'],
  ['hw2', 'Baraka Mushi', 'health_worker', F2, 'hw2@safariyamama.test'],
  ['fa1', 'Neema Kileo', 'facility_admin', F1, 'facility@safariyamama.test'],
  ['pa1', 'Juma Ally', 'programme_admin', null, 'programme@safariyamama.test'],
]) {
  const id = await user({ email, password: PASSWORD });
  await profile(id, { role, display_name: name, lang: 'en', home_facility: fac });
  if (fac) ok(await db.from('staff_assignments').insert({ staff_id: id, facility_id: fac }), 'assign');
  staff[k] = id;
}

// ---------- the two demo mothers who can sign in ----------
const amina = await user({ phone: '255700000101' });
await profile(amina, { display_name: 'Amina Salim', phone: '+255700000101', home_facility: F1 });
await share(amina, F1, true, 120);
const preg = randomUUID();
ok(await db.from('pregnancies').insert({ id: preg, mother_id: amina, lmp: iso(ago(196)), gravida: 2, parity: 1 }), 'pregnancy');
// past ANC contacts (the trigger only schedules future ones)
ok(await db.from('appointments').insert([[1, 12], [2, 20], [3, 26]].map(([n, w]) => ({
  id: randomUUID(), mother_id: amina, kind: 'anc', contact_no: n, due_on: iso(ago(196 - w * 7)), attended_on: iso(ago(196 - w * 7)), facility_id: F1, source: 'schedule',
  note: n === 1 ? 'BP 110/70 · Hb 11.8' : n === 2 ? 'BP 116/74 · fundal 20 cm' : 'BP 122/80 · Hb 11.2 · fundal 26 cm' }))), 'past anc');
ok(await db.from('bp_readings').insert([[112, 72], [115, 74], [118, 76], [122, 80], [128, 84], [134, 88]].map(([s, d], i) => ({
  id: randomUUID(), mother_id: amina, pregnancy_id: preg, systolic: s, diastolic: d, level: 'green', taken_by: i % 2 ? 'chw' : 'clinic', client_created_at: ago((5 - i) * 7 + 2).toISOString() }))), 'bp');
const created = [];
for (const [d, signs, feel] of [[6, [], 'well'], [4, ['vomit'], 'ok'], [2, [], 'well'], [1, ['headache'], 'ok']]) {
  const cid = randomUUID(); created.push({ cid, at: ago(d, 8, 30), dAgo: d });
  ok(await db.from('checkins').insert({ id: cid, mother_id: amina, stage: 'pregnant', pregnancy_id: preg, feeling: feel, movement: 'normal', signs,
    level: signs.length ? 'amber' : 'green', rules_version: '2026.10', client_created_at: ago(d, 8, 30).toISOString() }), 'checkin');
}
ok(await db.from('journal_entries').insert([
  { id: randomUUID(), mother_id: amina, entry_on: iso(ago(9)), mood: 3, body: 'Back pain in the evening. A warm cloth helped.', question_for_visit: false },
  { id: randomUUID(), mother_id: amina, entry_on: iso(ago(3)), mood: 3, body: 'Swollen feet after market day.', question_for_visit: false },
  { id: randomUUID(), mother_id: amina, entry_on: iso(ago(1)), mood: 4, body: 'Is my rising blood pressure something to worry about?', question_for_visit: true },
  { id: randomUUID(), mother_id: amina, entry_on: iso(ago(1)), mood: 4, body: 'Can I keep working until 36 weeks?', question_for_visit: true },
]), 'journal');
ok(await db.from('medications').insert({ id: randomUUID(), mother_id: amina, name: 'Iron + folic acid', dose: '1 tablet', times: ['20:00'], start_on: iso(ago(112)), prescribed_by_clinician: true }), 'meds');
ok(await db.from('kick_counts').insert({ id: randomUUID(), mother_id: amina, pregnancy_id: preg, kicks: 10, minutes: 34, client_created_at: ago(1, 19, 10).toISOString() }), 'kicks');

const bahati = await user({ phone: '255700000102' });
await profile(bahati, { display_name: 'Bahati Juma', phone: '+255700000102', home_facility: F1, lang: 'sw' });
await share(bahati, F1, true, 100);
const zuri = randomUUID(), dob = ago(95);
ok(await db.from('babies').insert({ id: zuri, mother_id: bahati, name: 'Zuri', sex: 'f', dob: iso(dob), birth_weight_g: 3100 }), 'baby');
ok(await db.from('vaccine_doses').update({ given_on: null }).eq('baby_id', zuri), 'vx');
const { data: doses } = await db.from('vaccine_doses').select('id,due_on').eq('baby_id', zuri);
for (const v of doses) if (new Date(v.due_on) < today) ok(await db.from('vaccine_doses').update({ given_on: v.due_on, facility_id: F1 }).eq('id', v.id), 'vx given');
ok(await db.from('appointments').insert([[1, 1], [2, 3], [3, 10], [4, 42]].map(([n, d]) => ({
  id: randomUUID(), mother_id: bahati, baby_id: zuri, kind: 'pnc', contact_no: n, due_on: iso(new Date(dob.getTime() + d * day)), attended_on: iso(new Date(dob.getTime() + d * day)), facility_id: F1, source: 'schedule' }))), 'pnc');
ok(await db.from('growth_measures').insert([[0, 3100], [10, 3200], [42, 4500], [70, 5300]].map(([d, g]) => ({
  id: randomUUID(), mother_id: bahati, baby_id: zuri, weight_g: g, measured_on: iso(new Date(dob.getTime() + d * day)), source: 'clinic', client_created_at: new Date(dob.getTime() + d * day).toISOString() }))), 'growth');
ok(await db.from('milestones').insert(['m1a', 'm1b', 'm1c', 'm2a', 'm2b', 'm2c', 'm4b'].map(k => ({ baby_id: zuri, mother_id: bahati, milestone_key: k, achieved_on: iso(ago(20)) }))), 'miles');
ok(await db.from('feeds').insert(['05:40', '08:20'].map(t => { const d = new Date(); d.setHours(+t.slice(0, 2), +t.slice(3), 0, 0); return { id: randomUUID(), mother_id: bahati, baby_id: zuri, kind: 'breast', minutes: 15, client_created_at: d.toISOString() }; })), 'feeds');

// ---------- synthetic mothers for the dashboard (cannot sign in) ----------
const NAMES = ['Rehema Kweka', 'Zawadi Lyimo', 'Halima Said', 'Mwanaisha Omari', 'Upendo Massawe', 'Esther Mrema', 'Grace Shayo',
  'Fatuma Hassan', 'Joyce Minja', 'Salma Rashidi', 'Happiness Mbwambo', 'Agnes Temba', 'Mariamu Bakari', 'Witness Urio', 'Sikudhani Ndege', 'Pendo Swai'];
const PREG_SIGNS = ['headache', 'vision', 'swelling', 'fever', 'vomit', 'urine', 'bellypain', 'bleeding', 'water'];
for (let i = 0; i < NAMES.length; i++) {
  const id = await user({ email: `mother${i + 1}@demo.safariyamama.test`, password: randomUUID() });
  const fac = i < 10 ? F1 : i < 13 ? F2 : F3, sharing = i % 7 !== 3;
  await profile(id, { display_name: NAMES[i], phone: `+2557001000${String(i + 10).padStart(2, '0')}`, home_facility: fac });
  if (sharing) await share(id, fac, true, 60);
  const pregnant = i % 4 !== 0;
  let pid = null, bid = null;
  if (pregnant) {
    pid = randomUUID(); const lmpAgo = 70 + Math.floor(rnd() * 190);
    ok(await db.from('pregnancies').insert({ id: pid, mother_id: id, lmp: iso(ago(lmpAgo)) }), 'p');
    // past ANC contacts: most attended, some never recorded
    const past = [[1, 12], [2, 20], [3, 26], [4, 30], [5, 34], [6, 36]].filter(([, w]) => w * 7 < lmpAgo);
    if (past.length) ok(await db.from('appointments').insert(past.map(([n, w]) => ({ id: randomUUID(), mother_id: id, kind: 'anc', contact_no: n, due_on: iso(ago(lmpAgo - w * 7)),
      attended_on: rnd() > 0.22 ? iso(ago(lmpAgo - w * 7)) : null, facility_id: fac, source: 'schedule', note: null }))), 'past anc');
  }
  else { bid = randomUUID(); ok(await db.from('babies').insert({ id: bid, mother_id: id, name: pick(['Imani', 'Baraka', 'Neema', 'Tumaini', 'Faraja']), dob: iso(ago(10 + Math.floor(rnd() * 220))) }), 'b'); }
  for (let k = 0; k < 6; k++) {
    const dAgo = Math.floor(rnd() * 21), roll = rnd();
    let signs = [], bsigns = [], feel = 'well';
    if (roll > 0.88) { signs = pregnant ? [pick(['bleeding', 'bellypain', 'water'])] : ['pp_bleed']; feel = 'unwell'; }
    else if (roll > 0.82 && pregnant) { signs = ['headache', 'vision']; }
    else if (roll > 0.62) { signs = pregnant ? [pick(PREG_SIGNS.slice(0, 6))] : []; bsigns = pregnant ? [] : [pick(['b_yellow', 'b_cord', 'b_wet'])]; feel = 'ok'; }
    const level = (roll > 0.82) ? 'red' : (roll > 0.62 ? 'amber' : 'green');
    const at = ago(dAgo, 7 + Math.floor(rnd() * 12), Math.floor(rnd() * 59));
    const cid = randomUUID();
    ok(await db.from('checkins').insert({ id: cid, mother_id: id, stage: pregnant ? 'pregnant' : 'postnatal', pregnancy_id: pid, baby_id: bid, feeling: feel,
      movement: pregnant ? 'normal' : null, baby_feeding: pregnant ? null : 'normal', signs, baby_signs: bsigns, level, rules_version: '2026.10', client_created_at: at.toISOString() }), 'c');
    created.push({ cid, at, dAgo });
  }
  if (pregnant && rnd() > 0.5) ok(await db.from('bp_readings').insert({ id: randomUUID(), mother_id: id, pregnancy_id: pid, systolic: 142 + Math.floor(rnd() * 14), diastolic: 90 + Math.floor(rnd() * 8), level: 'amber', taken_by: 'chw', client_created_at: ago(Math.floor(rnd() * 14), 10).toISOString() }), 'bp2');
}

// backdate alerts to their check-in time and resolve older ones, as staff would have
const { data: alerts } = await db.from('alerts').select('id,source_table,source_id,level,facility_id,mother_id');
const byId = Object.fromEntries(created.map(c => [c.cid, c]));
for (const a of alerts) {
  const c = byId[a.source_id];
  const at = c ? c.at : ago(Math.floor(rnd() * 14), 11), dAgo = c ? c.dAgo : 5;
  const patch = { created_at: at.toISOString() };
  const hw = a.facility_id === F2 ? staff.hw2 : staff.hw1;
  if (a.mother_id === amina || dAgo === 0) { /* leave open */ }
  else if (dAgo >= 2 || rnd() > 0.5) {
    const ackMin = a.level === 'red' ? 8 + Math.floor(rnd() * 70) : 30 + Math.floor(rnd() * 600);
    Object.assign(patch, { status: 'closed', assigned_to: hw, acknowledged_at: new Date(at.getTime() + ackMin * 6e4).toISOString(), closed_at: new Date(at.getTime() + (ackMin + 90) * 6e4).toISOString() });
  } else {
    Object.assign(patch, { status: 'acknowledged', assigned_to: hw, acknowledged_at: new Date(at.getTime() + 20 * 6e4).toISOString() });
  }
  ok(await db.from('alerts').update(patch).eq('id', a.id), 'alert patch');
  if (patch.status) ok(await db.from('alert_actions').insert([
    { alert_id: a.id, actor_id: hw, action: 'acknowledged', created_at: patch.acknowledged_at },
    ...(patch.status === 'closed' ? [{ alert_id: a.id, actor_id: hw, action: a.level === 'red' ? 'advised_facility' : 'called', note: a.level === 'red' ? 'Called. She went to the health centre the same day.' : 'Called and advised a visit within 24 hours.', created_at: patch.closed_at },
      { alert_id: a.id, actor_id: hw, action: 'closed', created_at: patch.closed_at }] : []),
  ]), 'actions');
}
// some lesson views for the programme dashboard
const { data: mothers } = await db.from('profiles').select('id').eq('role', 'mother');
const { data: lessons } = await db.from('lessons').select('id');
const views = [];
for (const m of mothers) for (const l of lessons) if (rnd() > 0.6) views.push({ mother_id: m.id, lesson_id: l.id, completed: rnd() > 0.4, viewed_at: ago(Math.floor(rnd() * 25), 12).toISOString() });
ok(await db.from('lesson_views').insert(views), 'views');

const { count } = await db.from('alerts').select('*', { count: 'exact', head: true });
console.log(JSON.stringify({ staff: Object.keys(staff).length, mothers: mothers.length, alerts: count, lessonViews: views.length }));
