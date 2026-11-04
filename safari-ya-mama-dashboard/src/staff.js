// ================= Safari ya Mama · staff dashboard =================
// Health worker and facility admin: alerts, mothers who share, visits, facility overview, staff.
// Programme admin: totals per facility (small counts hidden) and the health library.
const ST = {page:'alerts', alertFilter:'open', sel:null, mother:null, motherData:null, range:30, q:'', busy:false, err:'', lessonSel:null, toasts:[], fresh:new Set()};
const $ = id => document.getElementById(id);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sIc = (k, cls='') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k] || ''}</svg>`;
const ago = iso => { const m = Math.round((Date.now() - new Date(iso))/6e4); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m/60)} h ago` : `${Math.round(m/1440)} d ago`; };
const fDate = s => toDay(s).toLocaleDateString('en-GB', {day:'numeric', month:'short'});
const fDT = iso => new Date(iso).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
const SIGN_ALL = () => [...SIGNS, ...PP_SIGNS, ...BABY_SIGNS];
const SIGN_EXTRA = {bp_rise_20:'BP up 20+ mmHg in about 3 weeks', swelling_or_headache:'Swelling or headache', pain_upper:'Pain high in the belly'};
const signEn = k => { const s = SIGN_ALL().find(x => x.k === k); if(s) return s.en; const m = /^bp (\d+)\/(\d+)$/.exec(k); return m ? `BP ${m[1]}/${m[2]}` : SIGN_EXTRA[k] || k; };
const LVL = {red:{t:'Red · go now', i:'siren', c:'bad'}, amber:{t:'Amber · within 24 h', i:'alert', c:'warn'}, green:{t:'No warning signs', i:'tick', c:'ok'}};
const lvlChip = l => { const x = LVL[l] || LVL.green; return `<span class="lvl ${x.c}">${sIc(x.i)}${x.t}</span>`; };
const STATUS = {open:'Open', acknowledged:'Acknowledged', contacted:'Called', referred:'Advised to go', closed:'Closed'};
const ACTION = {acknowledged:'Acknowledged', called:'Called her', visited:'Visited', advised_facility:'Advised to go to the facility', referred:'Advised to go to the facility', closed:'Closed', note:'Note'};
const LOGO = `<span class="logo-mark sym"><svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="120" fill="#22372D"/><path d="M168 452 C 168 380, 340 372, 330 312 C 322 262, 250 266, 256 222" fill="none" stroke="#FBF7F3" stroke-width="44" stroke-linecap="round"/><path d="M256 196 s-92-52-92-112 a48 48 0 0 1 92-20 a48 48 0 0 1 92 20 c0 60-92 112-92 112z" fill="#C89720"/></svg></span>`;
const role = () => API.user && API.user.role;
const isAdmin = () => role() === 'programme_admin';
const fac = () => API.user && API.user.facilities[0];
const VXN = {bcg:'BCG', opv0:'OPV 0', opv1:'OPV 1', opv2:'OPV 2', opv3:'OPV 3', penta1:'Penta 1', penta2:'Penta 2', penta3:'Penta 3', pcv1:'PCV 1', pcv2:'PCV 2', pcv3:'PCV 3', rota1:'Rota 1', rota2:'Rota 2', ipv:'IPV', vita1:'Vitamin A', mr1:'Measles-Rubella 1'};
const visitName = (k, n) => k === 'anc' ? `ANC contact ${n} of 8` : k === 'pnc' ? `Postnatal visit ${n}` : k === 'immunisation' ? 'Vaccines' : 'Appointment';
const stageText = m => m.stage === 'pregnant' ? `Pregnant · ${m.weeks} wk` : m.stage === 'baby' ? `${m.babyName || 'Baby'} · ${m.babyDays < 61 ? Math.floor(m.babyDays/7) + ' wk' : Math.floor(m.babyDays/30.44) + ' mo'}` : '—';

// ---------------- shell ----------------
function nav(){
  const items = isAdmin()
    ? [['overview','trend','Programme overview'], ['library','book','Health library'], ['integrity','shield','Integrity']]
    : [['alerts','alert','Alerts'], ['risk','gauge','Risk ranking'], ['mothers','users','Mothers'], ['visits','cal','Visits'], ['overview','trend','Facility overview'], ['integrity','shield','Integrity']].concat(role() === 'facility_admin' ? [['staff','user','Staff']] : []);
  const open = API._open || 0;
  return `<aside class="st-nav">
    <div class="st-logo">${LOGO}<span><b>Safari ya Mama</b><small>Staff</small></span></div>
    <nav aria-label="Dashboard">${items.map(([k,i,l]) => `<button data-s="page" data-v="${k}" aria-current="${ST.page === k || (ST.page === 'mother' && k === 'mothers') ? 'page' : 'false'}">${sIc(i)}<span>${l}</span>${k === 'alerts' && open ? `<b class="badge">${open}</b>` : ''}</button>`).join('')}
      <a href="${h((SCFG.siteUrl || 'https://safariyamama.com/').replace(/#.*$/, ''))}" target="_blank" rel="noopener" data-nav-site>${sIc('home')}<span>Public website</span></a></nav>
    <div class="st-user"><div class="avatar sm">${h(API.user.name.charAt(0))}</div><div><b>${h(API.user.name)}</b><small>${{health_worker:'Health worker', facility_admin:'Facility admin', programme_admin:'Programme admin'}[role()]}${fac() ? ' · ' + h(fac().name) : ''}</small></div>
      <button class="btn sm ghost signout" data-s="signOut">Sign out</button></div>
    ${SLIVE ? '' : `<p class="st-demo">Demo data. ${SCFG.motherDemo ? '' : 'Nothing is saved.'}</p>`}
  </aside>`;
}
async function render(){
  const root = $('staff');
  if(!API.user){ root.innerHTML = signInPage(); return; }
  let body = '';
  try{ body = await PAGES[ST.page](); }catch(e){ body = `<div class="st-card"><p class="err">Could not load this page: ${h(e.message)}</p></div>`; }
  root.innerHTML = `<div class="st-shell">${nav()}<div class="st-body">${topBar()}<main class="st-main" id="stMain">${body}</main></div></div>`;
  afterRender();
}
const PAGE_T = {alerts:'Alerts', risk:'Risk ranking', mothers:'Mothers', mother:'Mother record', visits:'Visits', overview:'Overview', staff:'Staff', library:'Health library', integrity:'Integrity'};
function topBar(){
  const where = isAdmin() ? 'All facilities' : fac() ? fac().name : '';
  const today = new Date().toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
  return `<div class="st-top"><div class="st-crumb"><span>${h(where)}</span><span class="sep">/</span><span><b>${PAGE_T[ST.page] || ''}</b></span></div><span class="today">${today}</span></div>`;
}
function signInPage(){
  return `<div class="st-signin"><div class="st-card">
    <div class="st-logo big">${LOGO}<span><b>Safari ya Mama</b><small>Staff dashboard · Zatii Technologies</small></span></div>
    <h1>Sign in</h1>
    <p class="muted">For health workers, facility admins and programme staff. Mothers use the Safari ya Mama app.</p>
    <form id="signin" class="stack">
      <div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div>
      ${SLIVE ? `<div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>` : ''}
      <button class="btn block" ${ST.busy ? 'disabled' : ''}>${ST.busy ? 'Signing in…' : 'Sign in'}</button>
      ${ST.err ? `<p class="err" role="alert">${h(ST.err)}</p>` : ''}
    </form>
    ${SCFG.demoStaff ? `<div class="demo-acc"><div class="eyebrow">${SLIVE ? 'Local test accounts' : 'Demo accounts'}</div>${SCFG.demoStaff.map(([e,l]) => `<button class="lrow" data-s="demoLogin" data-v="${e}"><span class="lrow-t"><b>${l}</b><small class="mono">${e}</small></span>${sIc('chev')}</button>`).join('')}</div>` : ''}
    <p class="faint small">Staff see a mother's records only while she shares them with their facility. Every action is logged.</p>
  </div></div>`;
}

// ---------------- alerts ----------------
const PAGES = {};
PAGES.alerts = async () => {
  const all = await API.alerts(); API._alerts = all; API._open = all.filter(a => a.status === 'open').length;
  const f = ST.alertFilter, list = all.filter(a => f === 'all' ? true : f === 'open' ? a.status === 'open' : f === 'active' ? ['acknowledged','contacted','referred'].includes(a.status) : a.status === 'closed')
    .sort((a,b) => (f === 'open' ? (LVN[b.level] - LVN[a.level]) : 0) || (a.created_at < b.created_at ? 1 : -1));
  const cnt = k => all.filter(a => k === 'open' ? a.status === 'open' : k === 'active' ? ['acknowledged','contacted','referred'].includes(a.status) : k === 'closed' ? a.status === 'closed' : true).length;
  const sel = ST.sel && all.find(a => a.id === ST.sel);
  return `<header class="st-head"><div><h1>Alerts</h1><p class="muted">Amber and red check-ins from mothers who share with ${h(fac() ? fac().name : 'your facility')}. Red first.</p></div><span class="live-dot" title="Updates live">Live</span></header>
  <div class="chips">${[['open','Open'],['active','In progress'],['closed','Closed'],['all','All']].map(([k,l]) => `<button class="chip" data-s="alertFilter" data-v="${k}" aria-pressed="${f === k}">${l} <b class="mono">${cnt(k)}</b></button>`).join('')}</div>
  <div class="st-split ${sel ? 'has-sel' : ''}">
    <div class="st-list">${list.length ? list.map(a => `<button class="al-row ${a.level} ${ST.sel === a.id ? 'sel' : ''} ${ST.fresh.has(a.id) ? 'fresh' : ''}" data-s="selAlert" data-v="${a.id}">
        ${lvlChip(a.level)}<span class="al-main"><b>${h(a.mother.name)}${a.baby ? ` <span class="faint">· baby ${h(a.baby)}</span>` : ''}</b><small>${a.reasons.map(signEn).map(h).join(' · ') || '—'}</small></span>
        <span class="al-meta"><span>${ago(a.created_at)}</span><span class="st-status s-${a.status}">${STATUS[a.status]}${a.assigned && a.status !== 'open' ? ' · ' + h(a.assigned.split(' ')[0]) : ''}</span></span></button>`).join('')
      : `<div class="empty">${sIc('tick')}<b>${f === 'open' ? 'No open alerts' : 'Nothing here'}</b><span class="muted">${f === 'open' ? 'New amber and red check-ins appear here as they arrive.' : ''}</span></div>`}</div>
    ${sel ? await alertPanel(sel) : ''}
  </div>`;
};
async function alertPanel(a){
  const acts = await API.actions(a.id), m = a.mother, red = a.level === 'red';
  return `<section class="st-panel" aria-label="Alert detail">
    <div class="pn-head">${lvlChip(a.level)}<button class="iconbtn" data-s="selAlert" data-v="" aria-label="Close">${sIc('x')}</button></div>
    <h2>${h(m.name)}</h2>
    <p class="muted"><a class="mono" href="tel:${h(m.phone)}">${h(m.phone || '')}</a> · ${fDT(a.created_at)}</p>
    <div class="pn-block"><div class="eyebrow">She reported${a.baby ? ` · about baby ${h(a.baby)}` : ''}</div><ul>${a.reasons.map(r => `<li>${h(signEn(r))}</li>`).join('')}</ul>
      ${a.note ? `<div class="quote">“${h(a.note)}”<small>Her note for the health worker</small></div><div id="trBox">${trBlock(a)}</div>` : ''}</div>
    ${a.baby ? (() => { const hs = imciHints(a.reasons, a.babyDays); return hs.length ? `<div class="pn-block imci" data-imci><div class="eyebrow">To consider in your assessment (IMCI)${a.babyDays != null ? ` · baby ${a.babyDays} days old` : ''}</div><ul>${hs.map(x => `<li>${h(x)}</li>`).join('')}</ul><small class="faint">Staff only. Not shown to the mother. Confirm by examining the baby.</small></div>` : ''; })() : ''}
    <div class="pn-block guidance ${red ? 'red' : ''}">${red ? '<b>Red:</b> the app told her to go to a facility now. Call her straight away to check she is on her way and has transport.' : '<b>Amber:</b> the app told her to see a health worker within 24 hours. Call her today.'}</div>
    ${a.status !== 'closed' ? `<div class="pn-block"><div class="eyebrow">Record what you did</div>
      <textarea id="actNote" rows="2" placeholder="e.g. Called, she is going to the health centre with her husband"></textarea>
      <div class="pn-acts">${a.status === 'open' ? `<button class="btn sm ghost" data-s="act" data-v="acknowledged">Acknowledge</button>` : ''}
        <button class="btn sm ghost" data-s="act" data-v="contacted">${sIc('phone')} Called her</button>
        <button class="btn sm ghost" data-s="act" data-v="referred">Advised to go</button>
        <button class="btn sm" data-s="act" data-v="closed">${sIc('tick')} Close</button></div></div>` : ''}
    <div class="pn-block"><div class="eyebrow">History</div><ol class="hist"><li><b>Alert raised</b><small>${fDT(a.created_at)} · by the database when she synced</small></li>
      ${acts.map(x => `<li><b>${ACTION[x.action] || x.action}</b><small>${fDT(x.created_at)} · ${h(x.actor)}</small>${x.note ? `<span>${h(x.note)}</span>` : ''}</li>`).join('')}</ol></div>
    <button class="btn ghost block" data-s="openMother" data-v="${m.id}">Open her record</button>
  </section>`;
}

// ---------------- risk ranking (Layer 2) ----------------
const BAND = {high:{t:'High', c:'bad'}, medium:{t:'Medium', c:'warn'}, low:{t:'Low', c:'ok'}};
PAGES.risk = async () => {
  const rows = await API.riskQueue(fac().id);
  const n = b => rows.filter(r => r.band === b).length;
  return `<header class="st-head"><div><h1>Risk ranking · next 7 days</h1><p class="muted">Every mother who shares with ${h(fac().name)}, ranked by a transparent score so you know whom to call first. The score never changes the advice a mother received: only the fixed warning rules do that. Draft weights, under clinical review.</p></div></header>
  <div class="kpis">${tile(n('high'), 'high', 'score 50 or more', tone(n('high'), 'tone-bad'))}${tile(n('medium'), 'medium', 'score 25–49', tone(n('medium'), 'tone-warn'))}${tile(n('low'), 'low')}</div>
  <div class="st-table-wrap"><table class="st-table"><thead><tr><th>Mother</th><th>Stage</th><th class="num">Score</th><th>Why</th><th class="hide-sm">Phone</th></tr></thead><tbody>
  ${rows.map(r => `<tr data-s="openMother" data-v="${r.mother_id}" tabindex="0"><td><b>${h(r.display_name)}</b></td>
    <td>${r.stage === 'pregnant' ? `Pregnant · ${r.weeks} wk` : r.stage === 'baby' ? `Baby · ${r.baby_days < 61 ? Math.floor(r.baby_days/7) + ' wk' : Math.floor(r.baby_days/30.44) + ' mo'}` : '—'}</td>
    <td class="num"><span class="lvl ${BAND[r.band].c} sm">${r.score} · ${BAND[r.band].t}</span></td>
    <td><small>${r.reasons.map(h).join('<br>') || '<span class="faint">No risk factors recorded</span>'}</small></td>
    <td class="mono hide-sm"><a href="tel:${h(r.phone || '')}">${h(r.phone || '')}</a></td></tr>`).join('') || '<tr><td colspan="5" class="faint">No mothers share with this facility yet.</td></tr>'}
  </tbody></table></div>
  <details class="tbl"><summary>How the score is made</summary><p class="small muted">Red check-in in 7 days +40, amber +20 · BP ≥160/110 +30, ≥140/90 +20, ≥130/85 +8 · systolic up ≥20 mmHg vs 2–4 weeks earlier +15 (≥10: +6) · no check-in 7+ days +10 (3+ days +5) · past pre-eclampsia +12 · anaemia +8 · previous caesarean +6 · age under 18 or 35+ +8 · parity 5+ +5 · each overdue visit +8 (max 16) · unacknowledged red alert +10 · baby under 28 days +5. Capped at 100. High ≥50, medium 25–49.</p></details>`;
};

// ---------------- mothers ----------------
PAGES.mothers = async () => {
  const all = await API.mothers(), q = ST.q.trim().toLowerCase();
  const list = all.filter(m => !q || m.name.toLowerCase().includes(q) || (m.phone || '').includes(q));
  return `<header class="st-head"><div><h1>Mothers</h1><p class="muted">${all.length} mothers currently share their records with your facility. A mother who switches sharing off disappears from this list.</p></div></header>
  <div class="field st-search"><input id="mq" placeholder="Search by name or phone" value="${h(ST.q)}" aria-label="Search mothers"></div>
  <div class="st-table-wrap"><table class="st-table"><thead><tr><th>Name</th><th>Stage</th><th>Last check-in</th><th>Open alerts</th><th>Next visit</th><th class="hide-sm">Phone</th></tr></thead><tbody>
  ${list.map(m => `<tr data-s="openMother" data-v="${m.id}" tabindex="0"><td><b>${h(m.name)}</b></td><td>${stageText(m)}</td>
    <td>${m.last ? `${lvlDot(m.last.level)} ${ago(m.last.at)}` : '<span class="faint">None in 30 days</span>'}</td>
    <td>${m.openRed ? `<span class="lvl bad sm">${m.openRed} red</span> ` : ''}${m.openAmber ? `<span class="lvl warn sm">${m.openAmber} amber</span>` : ''}${!m.openRed && !m.openAmber ? '<span class="faint">—</span>' : ''}</td>
    <td>${m.next ? `${visitName(m.next.kind, m.next.n)} · ${fDate(m.next.due)}${m.next.late ? ' <span class="lvl warn sm">overdue</span>' : ''}` : '<span class="faint">—</span>'}</td>
    <td class="mono hide-sm">${h(m.phone || '')}</td></tr>`).join('') || `<tr><td colspan="6" class="faint">No mothers match.</td></tr>`}
  </tbody></table></div>`;
};
// One line per check-in, worded from its level so the text never contradicts the colour.
// Only facts she reported (signs, movement, feeding, BP); the level itself comes from the fixed rules.
const REPORTED = {movement:{fewer:'Baby moving less than usual', none:'Baby not moving'}, baby_feeding:{less:'Baby feeding less than usual', not:'Baby not feeding'}};
function ckText(c, level){
  const said = [...(c.signs || []), ...(c.baby_signs || [])].map(signEn)
    .concat(Object.entries(REPORTED).map(([k, m]) => m[c[k]]).filter(Boolean));
  const bp = c.systolic ? `BP ${c.systolic}/${c.diastolic}` : '';
  const high = c.systolic && (c.systolic >= 140 || c.diastolic >= 90);
  if(said.length) return said.join(' · ') + (bp ? ' · ' + bp : '');
  if(bp && high && level !== 'green') return `${bp}, at or above 140/90`;
  if(c.feeling === 'unwell') return 'Feeling unwell' + (bp ? ' · ' + bp : '');
  if(bp && level !== 'green') return `${bp}, rising over 3 weeks`;
  if(level !== 'green') return (LVL[level] || LVL.amber).t.split(' · ')[0] + ' from the warning rules' + (bp ? ' · ' + bp : '');
  return 'No warning signs reported' + (bp ? ' · ' + bp : '');
}
const lvlDot = l =>`<i class="dot ${(LVL[l] || LVL.green).c}" title="${(LVL[l] || LVL.green).t}"></i>`;
PAGES.mother = async () => {
  const d = await API.mother(ST.mother), p = d.profile, preg = d.preg, baby = d.baby, today = new Date(); today.setHours(0,0,0,0);
  if(ST._logged !== ST.mother){ ST._logged = ST.mother; try{ await API.logView(ST.mother, 'record'); }catch(e){} }
  let risk = null; try{ risk = (await API.riskQueue(fac().id)).find(r => r.mother_id === ST.mother) || null; }catch(e){}
  const weeks = preg ? Math.floor((today - toDay(preg.lmp))/864e5/7) : null, bd = baby ? Math.round((today - toDay(baby.dob))/864e5) : null;
  const bps = [...d.bp.map(b => ({s:b.systolic, d:b.diastolic, at:b.client_created_at})), ...d.checkins.filter(c => c.systolic).map(c => ({s:c.systolic, d:c.diastolic, at:c.client_created_at}))].sort((a,b) => a.at < b.at ? -1 : 1);
  const appts = d.appts.filter(a => !a.deleted_at), vx = d.vx; ST._md = {d, risk};
  return `<header class="st-head"><div><button class="linkbtn" data-s="page" data-v="mothers">← Mothers</button><h1>${h(p.display_name)}</h1>
    <p class="muted"><a class="mono" href="tel:${h(p.phone)}">${h(p.phone || '')}</a> · ${preg ? `Pregnant, ${weeks} weeks · due ${fDate(preg.edd)}` : baby ? `${d.babies.filter(b => b.dob === baby.dob).map(b => h(b.name || 'Baby')).join(' & ')}${d.babies.filter(b => b.dob === baby.dob).length > 1 ? ' (twins)' : ''}, born ${fDate(baby.dob)} (${bd} days)` : ''} · speaks ${p.lang === 'sw' ? 'Kiswahili' : 'English'}</p></div></header>
  ${motherSummary(d, risk, bps, appts)}
  <div class="st-grid2">
    <div class="stack" data-col="record">
    ${(d.babies || []).map(kid => childStrip(kid, d.checkins)).join('')}
    <section class="st-card"><h2>Check-ins <small class="faint">last ${d.checkins.length}</small></h2>
      <ol class="ck-list">${d.checkins.slice(0, 14).map(c => { const l = lvlOf(c); return `<li>${lvlDot(l)}<span><b>${fDT(c.client_created_at)}${d.babies && d.babies.length > 1 && c.baby_id ? ` · ${h((d.babies.find(b => b.id === c.baby_id) || {}).name || 'Baby')}` : ''}</b><small>${h(ckText(c, l))}</small>${c.note ? `<span class="quote sm">“${h(c.note)}”</span>` : ''}</span></li>`; }).join('') || '<li class="faint">No check-ins yet.</li>'}</ol>
      <p class="faint small">Her journal is private to her and never shown here.</p></section>
      ${bps.length ? `<section class="st-card"><h2>Blood pressure</h2>${bpChartStaff(bps)}</section>` : ''}
      <section class="st-card"><h2>Visits</h2><ul class="vlist">${appts.map(a => { const past = toDay(a.due_on) <= today; return `<li><span><b>${visitName(a.kind, a.contact_no)}${a.kind === 'other' && a.note ? ': ' + h(a.note) : ''}</b><small>${fDate(a.due_on)}${a.attended_on ? ' · attended' : past ? ' · <span class="warn-t">not recorded</span>' : ''}${a.note && a.kind !== 'other' ? ' · ' + h(a.note) : ''}</small></span>
        ${a.attended_on ? `<button class="btn sm ghost" data-s="attend" data-v="${a.id}:0">Undo</button>` : past || diffDaysS(a.due_on) < 3 ? `<button class="btn sm" data-s="attend" data-v="${a.id}:1">Mark attended</button>` : ''}</li>`; }).join('') || '<li class="faint">No visits.</li>'}</ul></section>
      ${(d.babies.length ? d.babies : [null]).map(kid => { const kvx = vx.filter(v => !kid || v.baby_id === kid.id); return kvx.length ? `<section class="st-card"><h2>Vaccines · ${h(kid ? kid.name || 'baby' : '')}</h2><ul class="vlist">${kvx.map(v => `<li><span><b>${VXN[v.vaccine_key] || v.vaccine_key}</b><small>due ${fDate(v.due_on)}${v.given_on ? ' · given ' + fDate(v.given_on) : toDay(v.due_on) < today ? ' · <span class="warn-t">not recorded</span>' : ''}</small></span>
        ${v.given_on ? `<button class="btn sm ghost" data-s="given" data-v="${v.id}:0">Undo</button>` : toDay(v.due_on) <= new Date(Date.now() + 3*864e5) ? `<button class="btn sm" data-s="given" data-v="${v.id}:1">Mark given</button>` : ''}</li>`).join('')}</ul></section>` : ''; }).join('')}
    </div>
    <div class="stack" data-col="handover">
      ${sbarCard(d, risk)}
      <section class="st-card"><h2>Questions for her next visit <small class="faint">${d.questions.filter(q => !q.answered).length} open</small></h2>
        <ul class="vlist">${d.questions.map(q => `<li><span><b${q.answered ? ' class="faint"' : ''}>${h(q.body)}</b><small>${fDT(q.created_at || q.updated_at)}${q.answered ? ' · answered' : ''}</small></span></li>`).join('') || '<li class="faint">No questions written.</li>'}</ul></section>
      ${d.plan ? `<section class="st-card"><h2>Birth plan</h2><p>${(d.plan.items_ready || []).length} of 6 items ready${d.plan.transport ? ' · transport: ' + h(d.plan.transport) : ''}${d.plan.companion ? ' · companion: ' + h(d.plan.companion) : ''}</p></section>` : ''}
    </div></div>`;
};
// At-a-glance strip: only figures already in her shared record (no new judgement).
function motherSummary(d, risk, bps, appts){
  const last = d.checkins[0], l = last ? lvlOf(last) : null, bp = bps[bps.length - 1];
  const done = appts.filter(a => a.attended_on).length, high = bp && (bp.s >= 140 || bp.d >= 90);
  const cell = (lbl, big, sub, cls='') => `<div class="kpi ${cls}"><b>${big}</b><span>${lbl}</span><small>${sub}</small></div>`;
  return `<div class="kpis summary">
    ${cell('Latest check-in', last ? (LVL[l] || LVL.green).t.split(' · ')[0] : '—', last ? fDT(last.client_created_at) : 'None yet', l === 'red' ? 'tone-bad' : l === 'amber' ? 'tone-warn' : '')}
    ${cell('7-day risk score', risk ? risk.score : '—', risk ? `${BAND[risk.band].t} · rules-based ranking` : 'Not available', risk && risk.band === 'high' ? 'tone-bad' : risk && risk.band === 'medium' ? 'tone-warn' : '')}
    ${cell('Latest BP', bp ? `${bp.s}/${bp.d}` : '—', bp ? fDate(bp.at) + (high ? ' · at or over 140/90' : '') : 'No readings shared', high ? 'tone-warn' : '')}
    ${cell('Visits recorded', `${done}/${appts.length}`, appts.length ? 'attended of scheduled' : 'No visits scheduled')}
  </div>`;
}
// SBAR handover drafted from her shared record by a fixed template (no AI, no free text invented).
// anon = true: no names ("The mother", "the baby") and her words scrubbed; for anything that may leave for the AI gateway.
function sbarText(d, risk, anon){
  const p = d.profile, preg = d.preg, baby = d.baby, today = new Date(); today.setHours(0,0,0,0);
  const scrub = anon ? scrubber(p.display_name, (d.babies || []).map(b => b.name)) : (t => t);
  const last = d.checkins[0], lvl = last ? lvlOf(last) : null;
  const weeks = preg ? Math.floor((today - toDay(preg.lmp))/864e5/7) : null;
  const bps = [...d.bp].sort((a,b) => a.client_created_at < b.client_created_at ? -1 : 1);
  const anc = d.appts.filter(a => a.kind === 'anc'), ancDone = anc.filter(a => a.attended_on).length;
  const nextV = d.appts.filter(a => !a.attended_on && toDay(a.due_on) >= today)[0];
  const S = `${anon ? 'The mother' : p.display_name}, ${preg ? `pregnant ${weeks} weeks (EDD ${fDate(preg.edd)})` : baby ? `${(d.babies || [baby]).filter(b => b.dob === baby.dob).length > 1 ? 'twins' : 'baby'}${anon ? '' : ' ' + (d.babies || [baby]).filter(b => b.dob === baby.dob).map(b => b.name || 'Baby').join(' & ')} ${Math.round((today - toDay(baby.dob))/864e5)} days old` : 'stage not recorded'}. `
    + (last ? `Latest check-in ${fDT(last.client_created_at)}: ${(LVL[lvl] || LVL.green).t}${[...last.signs, ...(last.baby_signs || [])].length ? '; reported ' + [...last.signs, ...(last.baby_signs || [])].map(signEn).join(', ') : ''}${last.systolic ? `; BP ${last.systolic}/${last.diastolic}` : ''}.${last.note ? ` Her words: "${scrub(last.note)}"` : ''}` : 'No check-ins yet.');
  const B = [preg && (preg.gravida || preg.parity) ? `G${preg.gravida ?? '?'} P${preg.parity ?? '?'}` : null, preg && preg.mother_age ? `age ${preg.mother_age}` : null,
    preg && preg.prev_preeclampsia ? 'past pre-eclampsia' : null, preg && preg.prev_caesarean ? 'previous caesarean' : null, preg && preg.anaemia ? 'anaemia' : null,
    anc.length ? `ANC contacts recorded ${ancDone} of ${anc.length}` : null,
    bps.length >= 2 ? `BP ${bps[0].systolic}/${bps[0].diastolic} (${fDate(bps[0].client_created_at)}) → ${bps[bps.length-1].systolic}/${bps[bps.length-1].diastolic} (${fDate(bps[bps.length-1].client_created_at)})` : bps.length ? `BP ${bps[0].systolic}/${bps[0].diastolic}` : null].filter(Boolean).join('; ') || 'No background recorded.';
  const A = risk ? `7-day risk score ${risk.score} (${risk.band}): ${risk.reasons.join('; ') || 'no factors'}. Rules-based ranking, not a diagnosis.` : 'Risk score not available.';
  const R = lvl === 'red' ? 'Call now: confirm she is on her way to a facility with transport and a companion; tell the receiving facility she is coming.'
    : lvl === 'amber' || (risk && risk.band === 'high') ? 'Contact her today; arrange a BP re-measure within 24 hours (CHW or clinic) and review danger signs with her.'
    : `Routine follow-up${nextV ? `; next visit ${fDate(nextV.due_on)}` : ''}.`;
  const Q = d.questions.filter(q => !q.answered).map(q => scrub(q.body));
  return `S — ${S}\nB — ${B}\nA — ${A}\nR — ${R}${Q.length ? `\nHer questions: ${Q.join(' | ')}` : ''}`;
}
// Replace her name, her babies' names and phone numbers before any text leaves for the AI gateway.
function scrubber(motherName, babyNames){
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), full = String(motherName || '').trim();
  const subs = [[full, 'the mother'], ...full.split(/\s+/).map(x => [x, 'the mother']), ...(babyNames || []).map(x => [String(x || '').trim(), 'the baby'])].filter(([n]) => n.length >= 3);
  return t => subs.reduce((x, [n, r]) => x.replace(new RegExp(`(^|[^\\p{L}])${esc(n)}(?![\\p{L}])`, 'giu'), `$1${r}`), String(t ?? '')).replace(/\+?\d[\d\s-]{6,}\d/g, '[phone]');
}
// Name-free structured record for the gateway's sbar_draft task (CLAUDE.md: never send names or phone).
// `level` is the level the fixed rules already gave her latest check-in; the model may only echo it.
function sbarRecord(d, risk){
  const p = d.profile, preg = d.preg, baby = d.baby, today = new Date(); today.setHours(0,0,0,0);
  const scrub = scrubber(p.display_name, (d.babies || []).map(b => b.name)), last = d.checkins[0], lvl = last ? lvlOf(last) : null;
  const anc = d.appts.filter(a => a.kind === 'anc'), nextV = d.appts.filter(a => !a.attended_on && toDay(a.due_on) >= today)[0];
  const bps = [...d.bp].sort((a,b) => a.client_created_at < b.client_created_at ? -1 : 1).slice(-6);
  return {subject:'the mother', level:lvl, stage:preg ? 'pregnant' : baby ? 'baby' : 'not recorded',
    pregnancy:preg ? {weeks:Math.floor((today - toDay(preg.lmp))/864e5/7), edd:preg.edd, gravida:preg.gravida ?? null, parity:preg.parity ?? null, mother_age:preg.mother_age ?? null,
      past_preeclampsia:!!preg.prev_preeclampsia, previous_caesarean:!!preg.prev_caesarean, anaemia:!!preg.anaemia} : null,
    baby:!preg && baby ? {age_days:Math.round((today - toDay(baby.dob))/864e5), twins:(d.babies || []).filter(b => b.dob === baby.dob).length > 1} : null,
    latest_checkin:last ? {at:last.client_created_at, level:lvl, reported:[...last.signs, ...(last.baby_signs || [])].map(signEn), bp:last.systolic ? `${last.systolic}/${last.diastolic}` : null, her_words:last.note ? scrub(last.note) : null} : null,
    anc_contacts:anc.length ? {recorded:anc.filter(a => a.attended_on).length, scheduled:anc.length} : null,
    bp_readings:bps.map(b => ({date:dayStr(b.client_created_at), bp:`${b.systolic}/${b.diastolic}`})),
    risk_score:risk ? {score:risk.score, band:risk.band, reasons:risk.reasons, note:'rules-based ranking, not a diagnosis'} : null,
    next_visit:nextV ? {kind:visitName(nextV.kind, nextV.contact_no), due:nextV.due_on} : null,
    open_questions:d.questions.filter(q => !q.answered).map(q => scrub(q.body))};
}
const SIM = `<span class="sim-tag" data-sim title="Demo: no real AI model, ledger or blockchain is involved">Simulated</span>`;
function sbarCard(d, risk){
  const ai = ST.sbarAi && ST.sbarAi.mother === ST.mother ? ST.sbarAi : null, showAi = !!(ai && ai.text && ST.sbarView === 'ai');
  const t = showAi ? ai.text : sbarText(d, risk);
  const who = ai && (ai.simulated ? 'Simulated: no AI model ran in this demo. This is the fixed template with her name removed, shown the way an AI draft would appear.'
    : `Drafted by ${h(ai.provider || 'an AI model')}${ai.model ? ' · ' + h(ai.model) : ''} from her record without her name or phone. Check every line against her clinic card. The warning level comes only from the fixed rules.`);
  return `<section class="st-card" id="sbarCard"><h2>SBAR handover <small class="faint">${showAi ? 'AI draft · check before use' : 'draft from a fixed template'}</small>${showAi && ai.simulated ? SIM : ''}</h2>
    <pre class="sbar ${showAi ? 'ai' : ''}" id="sbarText">${h(t)}</pre>
    <p class="faint small">${showAi ? who : 'Built only from what she shared. Check it against her clinic card before handing over.'}</p>
    ${ai && ai.unavailable ? `<p class="faint small" data-ai-off>AI not available. Showing the fixed template.</p>` : ''}
    <div class="sbar-acts"><button class="btn sm ghost" data-s="copySbar">${sIc('copy')} Copy</button>
      ${showAi ? `<button class="btn sm ghost" data-s="sbarView" data-v="template">Use fixed template</button>`
        : ai && ai.text ? `<button class="btn sm ghost" data-s="sbarView" data-v="ai">Show AI draft</button>`
        : `<button class="btn sm ghost" data-s="aiDraft" ${ST.sbarBusy ? 'disabled' : ''}>${sIc('chat')} ${ST.sbarBusy ? 'Drafting…' : 'AI draft'}</button>`}</div></section>`;
}
// ---- translate her note (alert panel). The language guess only picks the target; staff see both texts.
const SW_HINT = /(^|[^\p{L}])(na|ya|wa|kwa|ni|sana|mimi|nina|mtoto|homa|kichwa|damu|tumbo|leo|jana|usiku|asubuhi|vizuri|hana|hajala|siwezi|naona|nime\p{L}*|ame\p{L}*|ana\p{L}*|ina\p{L}+)(?![\p{L}])/giu;
const noteLang = t => (String(t).match(SW_HINT) || []).length >= 2 ? 'sw' : 'en';
function trBlock(a){
  const tr = ST.tr && ST.tr.alert === a.id ? ST.tr : null, to = noteLang(a.note) === 'sw' ? 'en' : 'sw';
  if(tr && tr.text) return `<div class="ai-out" data-ai-tr>${tr.simulated ? SIM : ''}<pre>${h(tr.text)}</pre></div>`;
  return `${tr && tr.unavailable ? '<p class="faint small" data-ai-off>AI not available. No translation.</p>' : ''}
    <button class="btn sm ghost tr-btn" data-s="translate" data-v="${a.id}" ${tr && tr.busy ? 'disabled' : ''}>${sIc('globe')} ${tr && tr.busy ? 'Translating…' : `Translate to ${to === 'en' ? 'English' : 'Kiswahili'}`}</button>`;
}
const diffDaysS = s => Math.round((toDay(s) - new Date(new Date().setHours(0,0,0,0)))/864e5);

// ---------------- visits ----------------
PAGES.visits = async () => {
  const rows = await API.visits(), today = dayStr(new Date()), wk = dayStr(new Date(Date.now() + 7*864e5));
  const g = [['Overdue', rows.filter(r => r.due < today)], ['Today and this week', rows.filter(r => r.due >= today && r.due <= wk)], ['Next week', rows.filter(r => r.due > wk)]];
  return `<header class="st-head"><div><h1>Visits</h1><p class="muted">Antenatal, postnatal and vaccine visits not yet recorded, for mothers who share with your facility.</p></div></header>
  ${g.map(([t, rs]) => `<section class="st-card"><h2>${t} <small class="faint">${rs.length}</small></h2>${rs.length ? `<ul class="vlist">${rs.map(r => `<li><span><b>${h(r.name)}</b><small>${r.type === 'vx' ? 'Vaccines: ' + r.keys.map(k => VXN[k] || k).join(', ') : visitName(r.kind, r.n) + (r.note ? ' · ' + h(r.note) : '')} · ${fDate(r.due)}</small></span>
    <span class="row-acts"><a class="btn sm ghost" href="tel:${h(r.phone)}" aria-label="Call ${h(r.name)}">${sIc('phone')}</a>${r.type === 'vx' ? `<button class="btn sm" data-s="givenAll" data-v="${r.ids.join(',')}">Mark given</button>` : `<button class="btn sm" data-s="attend" data-v="${r.id}:1">Attended</button>`}</span></li>`).join('')}</ul>` : '<p class="faint">None.</p>'}</section>`).join('')}`;
};

// ---------------- overview ----------------
const rangeChips = () => `<div class="chips">${[[7,'7 days'],[30,'30 days'],[90,'90 days']].map(([k,l]) => `<button class="chip" data-s="range" data-v="${k}" aria-pressed="${ST.range === k}">${l}</button>`).join('')}</div>`;
// tone only when the figure is above 0, so an empty red count stays neutral
const tone = (v, t) => (+v > 0 ? t : '');
const tile = (big, lbl, sub='', t='') => `<div class="kpi ${t}"><b>${big}</b><span>${lbl}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
PAGES.overview = async () => {
  const to = dayStr(new Date()), from = dayStr(new Date(Date.now() - (ST.range - 1)*864e5));
  if(isAdmin()) return programmeOverview(from, to);
  const [k, alerts, ck] = await Promise.all([API.facilityKpis(fac().id, from, to), API.alerts(), API.childKpis(fac().id, from, to)]);
  const days = Math.min(ST.range, 30), byDay = [];
  for(let i = days - 1; i >= 0; i--){ const d = dayStr(new Date(Date.now() - i*864e5)); byDay.push({d, red:alerts.filter(a => a.level === 'red' && dayStr(a.created_at) === d).length, amber:alerts.filter(a => a.level === 'amber' && dayStr(a.created_at) === d).length}); }
  const openRed = alerts.filter(a => a.level === 'red' && a.status === 'open');
  return `<header class="st-head"><div><h1>Facility overview</h1><p class="muted">${h(fac().name)} · mothers who share their records</p></div>${rangeChips()}</header>
  <div class="kpis">${tile(k.mothers_sharing, 'mothers sharing')}${tile(k.checkins, 'check-ins')}${tile(k.red_alerts, 'red alerts', 'go-now results', tone(k.red_alerts, 'tone-bad'))}${tile(k.amber_alerts, 'amber alerts', '', tone(k.amber_alerts, 'tone-warn'))}
    ${tile(k.median_ack_minutes == null ? '—' : Math.round(k.median_ack_minutes) + ' min', 'median time to acknowledge')}${tile(k.anc4_rate == null ? '—' : Math.round(k.anc4_rate*100) + '%', 'with 4+ ANC visits')}${tile(k.visits_missed, 'visits not recorded')}</div>
  <section class="st-card"><h2>Alerts per day <small class="faint">last ${days} days</small></h2>${barsByDay(byDay)}</section>
  ${childCard(ck)}
  ${openRed.length ? `<section class="st-card" data-open-red><h2>Red alerts still open <span class="lvl bad sm">${openRed.length}</span></h2><ul class="vlist">${openRed.map(a => `<li><span><b>${h(a.mother.name)}</b><small>${a.reasons.map(signEn).join(' · ')} · ${ago(a.created_at)}</small></span><button class="btn sm" data-s="gotoAlert" data-v="${a.id}">Open</button></li>`).join('')}</ul></section>` : ''}`;
};
// One child's daily checks, last 14 days, coloured by the most urgent result of each day.
function childStrip(kid, checkins){
  const worst = {}, rank = {green:0, amber:1, red:2};
  for(const c of checkins.filter(c => c.baby_id === kid.id)){ const d = dayStr(c.client_created_at), l = lvlOf(c), w = worst[d]; if(!w || rank[l] > rank[w]) worst[d] = l; }
  const days = []; for(let i = 13; i >= 0; i--) days.push(dayStr(new Date(Date.now() - i*864e5)));
  const n = days.filter(x => worst[x]).length;
  return `<section class="st-card" data-strip><h2>Daily checks · ${h(kid.name || 'baby')} <small class="faint">${n} of the last 14 days</small></h2>
    <div class="strip">${days.map(x => `<i class="${worst[x] || 'none'}" title="${fDate(x)}: ${worst[x] || 'no check'}"></i>`).join('')}</div></section>`;
}
// Child daily checks (colour-coded): share of green / orange / red, and the signs mothers tick most.
function childCard(ck){
  const tot = ck.checks || 0, pct = n => tot ? Math.round(n / tot * 100) : 0;
  const seg = (n, cls, lbl) => n ? `<span class="cseg ${cls}" style="flex:${n}" title="${lbl}: ${n}">${pct(n)}%</span>` : '';
  const max = Math.max(1, ...(ck.top_signs || []).map(x => x.n));
  return `<section class="st-card" data-child-kpis><h2>Child daily checks <small class="faint">babies of sharing mothers</small></h2>
    <div class="kpis">${tile(tot, 'child checks')}${tile(ck.children || 0, 'children checked')}${tile(ck.red || 0, 'red', 'go now', tone(ck.red, 'tone-bad'))}${tile(ck.amber || 0, 'orange', 'within 24 hours', tone(ck.amber, 'tone-warn'))}</div>
    ${tot ? `<div class="cbar" role="img" aria-label="Green ${pct(ck.green)}%, orange ${pct(ck.amber)}%, red ${pct(ck.red)}%">${seg(ck.green, 'green', 'Green')}${seg(ck.amber, 'amber', 'Orange')}${seg(ck.red, 'red', 'Red')}</div>` : '<p class="muted">No child checks in this period.</p>'}
    ${(ck.top_signs || []).length ? `<h3>Signs ticked most</h3><ul class="hbars">${ck.top_signs.map(x => `<li><span>${h(signEn(x.sign))}</span><i style="width:${Math.round(x.n / max * 100)}%"></i><b>${x.n}</b></li>`).join('')}</ul>` : ''}
  </section>`;
}
async function programmeOverview(from, to){
  const weekly = await API.programmeWeekly(from, to); API._prog = {from, to};
  const rows = await API.programmeKpis(from, to), sum = k => rows.reduce((t, r) => t + (r[k] || 0), 0), n = v => v == null ? '<span class="faint" title="Fewer than 5: hidden to protect privacy">&lt;5</span>' : v;
  return `<header class="st-head"><div><h1>Programme overview</h1><p class="muted">All facilities. Counts under 5 are hidden so no mother can be identified. No names are shown to programme staff.</p></div>${rangeChips()}</header>
  <div class="kpis">${tile(rows.length, 'facilities')}${tile(sum('mothers'), 'mothers enrolled', 'in facilities with 5 or more')}${tile(sum('red_alerts'), 'red alerts', '', tone(sum('red_alerts'), 'tone-bad'))}${tile(sum('amber_alerts'), 'amber alerts', '', tone(sum('amber_alerts'), 'tone-warn'))}${tile(sum('lesson_views'), 'lessons opened')}</div>
  <section class="st-card"><h2>Red alerts acknowledged within 2 hours</h2>${rows.some(r => r.pct_red_ack_2h != null) ? ackBars(rows) : '<p class="muted" data-ack-hidden>Every facility had fewer than 5 red alerts in this period, so the rate is hidden to protect privacy. Target: 90% acknowledged within 2 hours.</p>'}</section>
  <section class="st-card"><h2>By facility</h2><div class="st-table-wrap"><table class="st-table"><thead><tr><th>Facility</th><th>District</th><th class="num">Mothers</th><th class="num">Red</th><th class="num">Amber</th><th class="num">Red ack ≤ 2 h</th><th class="num">Lessons opened</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td><b>${h(r.facility)}</b></td><td>${h(r.district)}</td><td class="num">${n(r.mothers)}</td><td class="num">${n(r.red_alerts)}</td><td class="num">${n(r.amber_alerts)}</td><td class="num">${r.pct_red_ack_2h == null ? n(null) : Math.round(r.pct_red_ack_2h*100) + '%'}</td><td class="num">${r.lesson_views ?? 0}</td></tr>`).join('')}</tbody></table></div>
    <button class="btn sm ghost" data-s="exportCsv">Export CSV (aggregate only)</button></section>
  <section class="st-card"><h2>By week</h2><div class="st-table-wrap"><table class="st-table"><thead><tr><th>Week starting</th><th class="num">Active mothers</th><th class="num">Check-ins</th><th class="num">Red</th><th class="num">Amber</th><th class="num">Followed up ≤ 24 h</th></tr></thead>
    <tbody>${weekly.map(w => `<tr><td>${fDate(w.week_start)}</td><td class="num">${n(w.active_mothers)}</td><td class="num">${n(w.checkins)}</td><td class="num">${n(w.red_alerts)}</td><td class="num">${n(w.amber_alerts)}</td><td class="num">${w.pct_followed_24h == null ? n(null) : Math.round(w.pct_followed_24h*100) + '%'}</td></tr>`).join('') || '<tr><td colspan="6" class="faint">No data</td></tr>'}</tbody></table></div></section>`;
}

// ---------------- charts (small, accessible, hover tooltips) ----------------
function barsByDay(data){
  const W = 720, H = 200, l = 30, r = 8, t = 12, b = 26, max = Math.max(2, ...data.map(d => Math.max(d.red, d.amber)));
  const step = (W - l - r)/data.length, bw = Math.max(3, Math.min(12, step/2 - 3)), y = v => t + (H - t - b)*(1 - v/max);
  let g = '';
  for(let v = 0; v <= max; v += Math.max(1, Math.ceil(max/4))) g += `<line class="gl" x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  data.forEach((d, i) => { const x = l + i*step + step/2;
    if(d.red) g += `<rect class="b-red" x="${x - bw - 1}" y="${y(d.red)}" width="${bw}" height="${y(0) - y(d.red)}" rx="2"/>`;
    if(d.amber) g += `<rect class="b-amber" x="${x + 1}" y="${y(d.amber)}" width="${bw}" height="${y(0) - y(d.amber)}" rx="2"/>`;
    g += `<rect class="hit" x="${x - step/2}" y="${t}" width="${step}" height="${H - t - b}" data-tip="${fDate(d.d)}: ${d.red} red, ${d.amber} amber"/>`;
    if(i % Math.ceil(data.length/7) === 0 || i === data.length - 1) g += `<text x="${i === data.length - 1 ? W - r : x}" y="${H - 8}" text-anchor="${i === data.length - 1 ? 'end' : 'middle'}">${fDate(d.d)}</text>`; });
  return `<div class="chart-wrap"><svg class="chart st-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Red and amber alerts per day">${g}</svg></div>
    <div class="legend"><span><i class="sw-red"></i>Red · go now</span><span><i class="sw-amber"></i>Amber · within 24 h</span></div>
    <details class="tbl"><summary>Show as a table</summary><table class="st-table"><thead><tr><th>Day</th><th class="num">Red</th><th class="num">Amber</th></tr></thead><tbody>${data.filter(d => d.red || d.amber).map(d => `<tr><td>${fDate(d.d)}</td><td class="num">${d.red}</td><td class="num">${d.amber}</td></tr>`).join('') || '<tr><td colspan="3" class="faint">No alerts</td></tr>'}</tbody></table></details>`;
}
function ackBars(rows){
  const W = 720, rowH = 30, l = 190, r = 60, H = rows.length*rowH + 30, x = v => l + (W - l - r)*v;
  let g = `<line class="thr2" x1="${x(.9)}" x2="${x(.9)}" y1="6" y2="${H - 22}"/><text x="${x(.9)}" y="${H - 6}" text-anchor="middle">target 90%</text>`;
  rows.forEach((rw, i) => { const yy = 10 + i*rowH, v = rw.pct_red_ack_2h;
    g += `<text x="${l - 10}" y="${yy + 15}" text-anchor="end" class="lbl">${h(rw.facility)}</text>`;
    g += v == null ? `<text x="${l + 4}" y="${yy + 15}" class="muted-t">fewer than 5 red alerts</text>` : `<rect class="b-c1" x="${l}" y="${yy + 4}" width="${Math.max(2, x(v) - l)}" height="16" rx="3"/><text x="${x(v) + 6}" y="${yy + 16}" class="val">${Math.round(v*100)}%</text>`;
    g += `<rect class="hit" x="0" y="${yy}" width="${W}" height="${rowH}" data-tip="${h(rw.facility)}: ${v == null ? 'hidden (fewer than 5)' : Math.round(v*100) + '% of red alerts acknowledged within 2 hours'}"/>`; });
  return `<div class="chart-wrap"><svg class="chart st-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of red alerts acknowledged within 2 hours, by facility">${g}</svg></div>`;
}
function bpChartStaff(bp){
  const W = 520, H = 190, l = 34, r = 12, t = 12, b = 26, lo = 60, hi = 170, n = bp.length;
  const xs = i => l + i*(W - l - r)/Math.max(1, n - 1), ys = v => t + (hi - v)/(hi - lo)*(H - t - b);
  let g = '';
  for(const v of [60, 90, 120, 140, 160]) g += `<line class="gl" x1="${l}" x2="${W - r}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${l - 6}" y="${ys(v) + 3}" text-anchor="end">${v}</text>`;
  g += `<line class="thr" x1="${l}" x2="${W - r}" y1="${ys(140)}" y2="${ys(140)}"/><line class="thr2" x1="${l}" x2="${W - r}" y1="${ys(90)}" y2="${ys(90)}"/>`;
  g += `<path class="l-c1" d="${bp.map((p, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(p.s)}`).join('')}"/><path class="l-c2" d="${bp.map((p, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(p.d)}`).join('')}"/>`;
  bp.forEach((p, i) => { g += `<circle class="p-c1" cx="${xs(i)}" cy="${ys(p.s)}" r="4"/><circle class="p-c2" cx="${xs(i)}" cy="${ys(p.d)}" r="4"/><rect class="hit" x="${xs(i) - 12}" y="${t}" width="24" height="${H - t - b}" data-tip="${fDT(p.at)}: ${p.s}/${p.d}"/>`;
    if(i === 0 || i === n - 1) g += `<text x="${xs(i)}" y="${H - 8}" text-anchor="${i ? 'end' : 'start'}">${fDate(p.at)}</text>`; });
  const last = bp[n - 1]; g += `<text x="${xs(n - 1) - 8}" y="${ys(last.s) - 8}" text-anchor="end" class="val">${last.s}/${last.d}</text>`;
  return `<div class="chart-wrap"><svg class="chart st-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Blood pressure readings">${g}</svg></div>
    <div class="legend"><span><i class="sw-c1"></i>Systolic</span><span><i class="sw-c2"></i>Diastolic</span><span><i class="sw-thr"></i>140/90 limit</span></div>`;
}

// ---------------- integrity (tamper-evident ledger, migration 0009) ----------------
const shortHash = x => x ? `${String(x).slice(0, 10)}…${String(x).slice(-8)}` : '—';
const ANCHOR_T = a => a.status === 'confirmed' ? `Confirmed in Bitcoin block ${a.bitcoin_block ?? '—'}` : a.status === 'submitted' ? 'Submitted, waiting for Bitcoin' : a.status === 'failed' ? 'Failed' : a.status === 'open' ? 'Not yet closed (the day is anchored after it ends)' : 'Pending';
const anchorPill = a => `<span class="pill ${a.status === 'confirmed' ? 'brand' : a.status === 'failed' ? 'acc' : 'none'}">${sIc(a.status === 'confirmed' ? 'lock' : 'clock')}${ANCHOR_T(a)}</span>`;
const parseQr = t => { const m = /^\s*(?:SYM1:)?\s*([0-9a-f]{64})\s*$/i.exec(String(t || '')); return m ? m[1].toLowerCase() : null; };
function chainResult(c){
  if(c.error) return `<p class="err">Could not check the chain: ${h(c.error)}</p>`;
  return c.ok ? `<p class="ig-res good" data-chain-ok>${sIc('tick')}<span><b>Chain verified.</b> ${c.checked} entries re-checked; every hash and daily root matches.</span></p>`
    : `<p class="ig-res fail" data-chain-bad>${sIc('alert')}<span><b>Chain does not match${c.first_bad_seq != null ? ` at entry #${c.first_bad_seq}` : ''}.</b>${c.first_bad_anchor ? ` The anchor for ${fDate(c.first_bad_anchor)} does not match its entries.` : ''} ${c.checked} entries checked. Tell the programme team.</span></p>`;
}
function qrResult(r){
  if(r.error) return `<p class="err">Could not check: ${h(r.error)}</p>`;
  if(r.invalid) return `<p class="ig-res fail" data-qr-bad>${sIc('alert')}<span>That is not a Safari ya Mama record code. The QR text is SYM1: followed by 64 letters and digits.</span></p>`;
  if(!r.matched) return `<p class="ig-res fail" data-qr-bad>${sIc('alert')}<span><b>Not found</b> — this record was not issued by Safari ya Mama or was changed.</span></p>`;
  const st = ANCHOR_T({status:r.anchor_status, bitcoin_block:r.bitcoin_block});
  return `<p class="ig-res good" data-qr-ok>${sIc('tick')}<span><b>Genuine:</b> recorded ${fDT(r.recorded_at)}, entry #${r.ledger_seq}, anchor ${st.charAt(0).toLowerCase() + st.slice(1)}.</span></p>
    <p class="faint small">This shows her visit and vaccine record was issued and has not been changed since. It does not show whose record it is and is not a clinical result.</p>`;
}
PAGES.integrity = async () => {
  const L = (await API.ledgerSummary()) || {}, k = L.by_kind || {}, anchors = L.anchors || [];
  const sample = !SLIVE && API.demoSampleQr ? API.demoSampleQr() : '';
  return `<header class="st-head"><div><h1>Integrity ${SLIVE ? '' : SIM}</h1><p class="muted">A tamper-evident ledger of consents, health-worker actions, rule versions and mothers' record QR codes. Entries hold fingerprints (hashes) only: no names, notes or readings.${SLIVE ? '' : ' Demo: every entry, hash and Bitcoin block on this page is made up.'}</p></div></header>
  <div class="kpis">${tile(L.entries ?? 0, 'ledger entries')}${tile(k.consent ?? 0, 'consent changes')}${tile(k.alert_action ?? 0, 'health-worker actions')}${tile(k.rules_version ?? 0, 'rule-set versions')}${tile(k.record_proof ?? 0, 'record QR proofs')}${tile(h(L.rules_version || '—'), 'current rules version')}</div>
  <div class="ig-grid">
    <section class="st-card" data-chain><h2>${sIc('shield')} Chain</h2>
      <dl class="ig-kv"><div><dt>Newest entry</dt><dd class="mono">${L.head_seq != null ? '#' + L.head_seq : '—'}${L.head_at ? ' · ' + fDT(L.head_at) : ''}</dd></div>
        <div><dt>Head hash</dt><dd><code class="mono" title="${h(L.head_hash || '')}">${shortHash(L.head_hash)}</code>${L.head_hash ? ` <button class="btn sm ghost" data-s="copyText" data-v="${h(L.head_hash)}" aria-label="Copy the full head hash">${sIc('copy')} Copy</button>` : ''}</dd></div></dl>
      <p class="small muted">Each entry's hash includes the entry before it, so changing any past entry breaks every hash after it.</p>
      <div class="ig-acts"><button class="btn sm" data-s="verifyChain" ${ST.busyChain ? 'disabled' : ''}>${ST.busyChain ? 'Checking…' : 'Verify the whole chain'}</button></div>
      <div id="chainRes">${ST.chainCheck ? chainResult(ST.chainCheck) : ''}</div>
    </section>
    <section class="st-card" data-qr><h2>${sIc('lock')} Check a mother's record QR</h2>
      <p class="small muted">Paste the text from the QR on her phone (it starts with SYM1:). It confirms the record was issued by Safari ya Mama and not changed. It never shows whose record it is.</p>
      <div class="field"><label for="qrIn">QR text</label><input id="qrIn" class="mono" placeholder="SYM1:…" value="${h(ST.qrText || '')}" autocomplete="off" spellcheck="false"></div>
      <div class="ig-acts"><button class="btn sm" data-s="verifyQr">Check record</button></div>
      ${sample ? `<p class="small faint ig-try">Try: <code class="mono" data-sample-qr>${h(sample)}</code> <button class="btn sm ghost" data-s="useSample">Use sample</button></p>` : ''}
      <div id="qrRes">${ST.qrCheck ? qrResult(ST.qrCheck) : ''}</div>
    </section>
  </div>
  <section class="st-card" data-anchors><h2>Daily anchors <small class="faint">latest ${anchors.length}</small></h2>
    <p class="small muted">Each day's records are fingerprinted and stamped on the Bitcoin blockchain with OpenTimestamps. No personal data leaves the system.</p>
    <div class="st-table-wrap"><table class="st-table"><thead><tr><th>Day</th><th>Entries</th><th>Merkle root</th><th>Status</th></tr></thead><tbody>
    ${anchors.map(a => `<tr><td>${fDate(a.day)}</td><td class="mono">#${a.from_seq}–#${a.to_seq}</td><td><code class="mono" title="${h(a.root)}">${shortHash(a.root)}</code></td><td>${anchorPill(a)}</td></tr>`).join('') || '<tr><td colspan="4" class="faint">No day has been closed yet. The first anchor appears after the daily anchor job runs.</td></tr>'}
    </tbody></table></div></section>`;
};

// ---------------- staff (facility admin) ----------------
PAGES.staff = async () => {
  const s = await API.staff(fac().id);
  return `<header class="st-head"><div><h1>Staff</h1><p class="muted">People who can see alerts for ${h(fac().name)}. New accounts are created by the programme team.</p></div></header>
  <section class="st-card"><ul class="vlist">${s.map(x => `<li><span><b>${h(x.name)}</b><small>${{health_worker:'Health worker', facility_admin:'Facility admin'}[x.role] || x.role}${x.active ? '' : ' · <span class="warn-t">access paused</span>'}</small></span>
    ${x.id === API.user.id ? '<span class="faint small">You</span>' : `<button class="btn sm ${x.active ? 'ghost' : ''}" data-s="staffActive" data-v="${x.id}:${x.active ? 0 : 1}">${x.active ? 'Pause access' : 'Restore access'}</button>`}</li>`).join('')}</ul></section>`;
};

// ---------------- library (programme admin) ----------------
// AD-06/09/10: draft → in review → approved → published (→ retired). The database (0010) enforces every rule shown here.
const LSTATE = {draft:['Draft','s-open'], in_review:['In review','s-open'], approved:['Approved','s-open'], published:['Published','s-closed'], retired:['Retired','s-closed']};
const LACT = {edit:'Edited', submit:'Sent for review', approve:'Approved', return:'Sent back', publish:'Published', new_version:'New version started', retire:'Retired'};
const siteUrl = () => (SCFG.siteUrl || 'https://safariyamama.com/').replace(/#.*$/, '');
const plusDays = n => dayStr(new Date(Date.now() + n*864e5));
const dueSoon = l => l.status === 'published' && l.review_due && l.review_due <= plusDays(60);
const LFILT = {all:['All', () => true], action:['Needs action', l => ['draft','in_review','approved'].includes(l.status)], published:['Published', l => l.status === 'published'], due:['Review due', dueSoon]};
PAGES.library = async () => {
  const ls = await API.lessons(), sel = ST.lessonSel && ls.find(l => l.id === ST.lessonSel), f = LFILT[ST.libFilter || 'all'] ? ST.libFilter || 'all' : 'all';
  const hist = sel ? await API.lessonHistory(sel.id).catch(() => []) : [];
  return `<header class="st-head"><div><h1>Health library</h1><p class="muted">Lessons reach the app and the public website only after review, approval by a second admin and publishing. Every step is recorded.</p></div>
    <a class="btn ghost sm" href="${h(siteUrl())}#learn" target="_blank" rel="noopener" data-site-link>${sIc('book')}<span>Open the website library</span></a></header>
  <div class="chips" aria-label="Filter lessons">${Object.entries(LFILT).map(([k, [t, fn]]) => `<button class="chip" data-s="libFilter" data-v="${k}" aria-pressed="${f === k}">${t} <b class="mono">${ls.filter(fn).length}</b></button>`).join('')}</div>
  <div class="st-split ${sel ? 'has-sel' : ''}"><div class="st-list" data-lib-list>${ls.filter(LFILT[f][1]).map(l => { const [st, cls] = LSTATE[l.status || (l.published ? 'published' : 'draft')]; return `<button class="al-row ${ST.lessonSel === l.id ? 'sel' : ''}" data-s="lessonSel" data-v="${l.id}">
      <span class="lib-pic cat-${l.category}">${illus((l.art_keys || [])[0] || CAT_ART[l.category])}</span>
      <span class="al-main"><b>${h(l.tr.en && l.tr.en.title ? l.tr.en.title : l.id)}</b><small>${h(l.tr.sw ? l.tr.sw.title : '')} · v${l.version || 1} · ${l.minutes} min${dueSoon(l) ? ' · <span class="warn-t">review due ' + fDate(l.review_due) + '</span>' : ''}</small></span>
      <span class="st-status ${cls}" data-state="${l.status}">${st}</span></button>`; }).join('') || '<p class="muted" style="padding:16px">No lessons here.</p>'}</div>
    ${sel ? lessonEditor(sel, hist) : ''}</div>`;
};
function lessonEditor(l, hist){
  const tr = g => l.tr[g] || {title:'', steps:[], facts:[]}, draft = l.status === 'draft', [st] = LSTATE[l.status];
  const rev = g => tr(g).reviewed_by ? `reviewed by ${h(tr(g).reviewed_by)}${tr(g).reviewed_on ? ' on ' + fDate(tr(g).reviewed_on) : ''}` : 'clinical review pending';
  const field = (id, label, val, rows) => rows ? `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" rows="${rows}" ${draft ? '' : 'readonly'}>${h(val)}</textarea></div>`
    : `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${h(val)}" ${draft ? '' : 'readonly'}></div>`;
  const btn = (a, t, cls = '') => `<button class="btn ${cls}" data-s="lessonAct" data-v="${a}">${t}</button>`;
  const acts = {
    draft: `<button class="btn ghost" data-s="saveLesson" data-v="${l.id}">Save draft</button>${btn('submit', 'Send for clinical review')}`,
    in_review: `<div class="pn-block" data-approve><div class="eyebrow">Clinical sign-off</div>
        <div class="field"><label for="revBy">Reviewer role and cadre (not a private name)</label><input id="revBy" placeholder="Registered midwife, Sample District"></div>
        <div class="field"><label for="revOn">Reviewed on</label><input type="date" id="revOn" value="${dayStr(new Date())}" max="${dayStr(new Date())}"></div>
        <div class="field"><label for="revDue">Next review due</label><input type="date" id="revDue" value="${plusDays(730)}"></div>
        <p class="faint small">You cannot approve a lesson you edited last: a second admin must approve.</p></div>${btn('approve', 'Approve')}${btn('return', 'Send back', 'ghost')}`,
    approved: `${btn('publish', 'Publish to app and website')}${btn('return', 'Send back', 'ghost')}`,
    published: `<a class="btn ghost" href="${h(siteUrl())}#learn/${encodeURIComponent(l.id)}" target="_blank" rel="noopener" data-view-site>View on website</a>${btn('new_version', 'Start a new version', 'ghost')}${btn('retire', 'Retire', 'ghost')}`,
    retired: btn('new_version', 'Start a new version', 'ghost'),
  }[l.status];
  return `<section class="st-panel" data-lesson-panel><div class="pn-head"><span class="eyebrow">${h(l.id)} · v${l.version || 1} · ${st}${l.review_due ? ' · next review ' + fDate(l.review_due) : ''}</span><button class="iconbtn" data-s="lessonSel" data-v="" aria-label="Close">${sIc('x')}</button></div>
    ${draft ? '' : `<p class="faint small" data-locked>Text is locked while the lesson is ${st.toLowerCase()}. ${l.status === 'published' || l.status === 'retired' ? 'Start a new version to edit it; it leaves the app feed and the website until it is approved again.' : 'Send it back to edit it.'}</p>`}
    ${(l.art_keys || []).length ? `<div class="lesson-prev cat-${l.category}">${l.art_keys.map(k => `<span>${illus(k)}</span>`).join('')}</div>` : ''}
    ${['en','sw'].map(g => `<div class="pn-block"><div class="eyebrow">${g === 'en' ? 'English' : 'Kiswahili'} · ${rev(g)}</div>
      ${field('t-' + g, 'Title', tr(g).title)}${field('f-' + g, 'Key facts, one per line (shown first)', (tr(g).facts || []).join('\n'), 3)}${field('s-' + g, 'Steps, one per line', tr(g).steps.join('\n'), 5)}</div>`).join('')}
    <div class="pn-block"><div class="eyebrow">Sources and related lessons</div>
      ${field('srcs', 'Guideline sources, one per line: Title (year)', (l.sources || []).map(s => `${s.t} (${s.y})`).join('\n'), 3)}
      ${field('rel', 'Related lesson ids, comma separated', (l.related || []).join(', '))}</div>
    ${l.status === 'draft' || l.status === 'in_review' || l.status === 'approved' || l.status === 'published' || l.status === 'retired' ? `<div class="field"><label for="lnote">Note for the history (needed to send back or retire)</label><input id="lnote"></div>` : ''}
    <div class="pn-actions" style="display:flex;flex-wrap:wrap;gap:8px">${acts}</div>
    <div class="pn-block" data-history><div class="eyebrow">History</div>${hist.length ? `<ul class="vlist">${hist.map(x => `<li><span><b>${LACT[x.action] || x.action}</b> · v${x.version}<small>${h(x.actor)} · ${fDT(x.at)}${x.note && x.action !== 'edit' ? ' · ' + h(x.note) : x.action === 'edit' && x.note ? ' · ' + (x.note === 'sw' ? 'Kiswahili' : 'English') : ''}</small></span></li>`).join('')}</ul>` : '<p class="faint small">No changes recorded yet.</p>'}</div></section>`;
}
const lines = id => ($(id) ? $(id).value : '').split('\n').map(x => x.trim()).filter(Boolean);
const parseSources = () => lines('srcs').map(x => { const m = /^(.*?)\s*\((\d{4})\)\s*$/.exec(x); return m ? {t:m[1], y:+m[2]} : {t:x, y:null}; });

// ---------------- actions ----------------
const SA = {
  async page(v){ ST.page = v; ST.sel = null; ST.chainCheck = ST.qrCheck = null; await render(); $('stMain')?.scrollTo(0, 0); },
  async alertFilter(v){ ST.alertFilter = v; ST.sel = null; await render(); },
  async selAlert(v){ ST.sel = v || null; ST.fresh.delete(v); await render();
    // one column below 960px: bring the detail into view (scroll-margin keeps it clear of the sticky header)
    const pn = v && innerWidth < 960 && document.querySelector('.st-panel');
    if(pn) pn.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'}); },
  async gotoAlert(v){ ST.page = 'alerts'; ST.alertFilter = 'open'; ST.sel = v; await render(); },
  async act(v){ const note = $('actNote')?.value.trim(); try{ await API.setStatus(ST.sel, v, note); sToast({acknowledged:'Acknowledged', contacted:'Call recorded', referred:'Recorded: advised to go', closed:'Alert closed'}[v]); if(v === 'closed') ST.sel = null; }catch(e){ sToast('Could not save: ' + e.message, 'bad'); } await render(); },
  async openMother(v){ ST.mother = v; ST.page = 'mother'; ST.sbarAi = null; ST.sbarView = 'template'; ST.sel = null; await render(); $('stMain')?.scrollTo(0, 0); },
  async attend(v){ const [id, on] = v.split(':'); try{ await API.markAttended(id, on === '1'); sToast(on === '1' ? 'Visit recorded' : 'Undone'); }catch(e){ sToast(e.message, 'bad'); } await render(); },
  async given(v){ const [id, on] = v.split(':'); try{ await API.markGiven(id, on === '1', fac() && fac().id); sToast(on === '1' ? 'Vaccine recorded' : 'Undone'); }catch(e){ sToast(e.message, 'bad'); } await render(); },
  async givenAll(v){ try{ for(const id of v.split(',')) await API.markGiven(id, true, fac() && fac().id); sToast('Vaccines recorded'); }catch(e){ sToast(e.message, 'bad'); } await render(); },
  async range(v){ ST.range = +v; await render(); },
  async staffActive(v){ const [id, on] = v.split(':'); try{ await API.setStaffActive(id, fac().id, on === '1'); }catch(e){ sToast(e.message, 'bad'); } await render(); },
  async lessonSel(v){ ST.lessonSel = v || null; await render(); },
  async libFilter(v){ ST.libFilter = v; ST.lessonSel = null; await render(); },
  async saveLesson(id){
    try{ for(const g of ['en','sw']) await API.saveTranslation(id, g, {title:$('t-' + g).value.trim(), steps:lines('s-' + g), facts:lines('f-' + g)});
      await API.saveLesson(id, {sources:parseSources(), related:$('rel').value.split(',').map(x => x.trim()).filter(Boolean)});
      sToast('Draft saved'); }catch(e){ sToast('Could not save: ' + e.message, 'bad'); } await render(); },
  async lessonAct(action){
    const id = ST.lessonSel, note = $('lnote') ? $('lnote').value.trim() : '';
    const a = action === 'approve' ? {reviewer:$('revBy').value, reviewedOn:$('revOn').value, reviewDue:$('revDue').value, note} : {note};
    if(action === 'retire' && !confirm('Retire this lesson? It leaves the app feed and the website.')) return;
    try{ await API.lessonAction(id, action, a);
      sToast({submit:'Sent for clinical review', approve:'Approved', return:'Sent back to draft', publish:'Published to the app and website', new_version:'New version started: off the app and website until approved', retire:'Lesson retired'}[action]); }
    catch(e){ sToast('Not done: ' + e.message, 'bad'); } await render(); },
  async aiDraft(){
    const md = ST._md; if(!md || ST.sbarBusy) return;
    const rec = sbarRecord(md.d, md.risk), paint = () => { const el = $('sbarCard'); if(el) el.outerHTML = sbarCard(md.d, md.risk); };
    ST.sbarBusy = true; paint();
    let r; try{ r = await API.ai('sbar_draft', 'en', rec, SLIVE ? {level:rec.level} : {level:rec.level, demoTemplate:sbarText(md.d, md.risk, true)}); }catch(e){ r = {text:null, unavailable:true, reason:'error'}; }
    ST.sbarAi = {mother:ST.mother, ...r}; ST.sbarView = r && r.text ? 'ai' : 'template'; ST.sbarBusy = false; paint();
  },
  async sbarView(v){ ST.sbarView = v; const md = ST._md, el = $('sbarCard'); if(md && el) el.outerHTML = sbarCard(md.d, md.risk); },
  async translate(id){
    const a = (API._alerts || []).find(x => x.id === id); if(!a || !a.note) return;
    const paint = () => { const el = $('trBox'); if(el) el.innerHTML = trBlock(a); }, to = noteLang(a.note) === 'sw' ? 'en' : 'sw';
    ST.tr = {alert:id, busy:true}; paint();
    let r; try{ r = await API.ai('translate', to, scrubber(a.mother.name, a.baby ? [a.baby] : [])(a.note)); }catch(e){ r = {text:null, unavailable:true, reason:'error'}; }
    ST.tr = {alert:id, ...r, busy:false}; paint();
  },
  async verifyChain(){
    ST.busyChain = true; ST.qrText = $('qrIn') ? $('qrIn').value : ST.qrText; await render();
    try{ ST.chainCheck = await API.ledgerVerify(); }catch(e){ ST.chainCheck = {error:e.message}; }
    ST.busyChain = false; await render();
  },
  async verifyQr(){
    ST.qrText = $('qrIn') ? $('qrIn').value.trim() : ''; const hex = parseQr(ST.qrText);
    if(!hex) ST.qrCheck = {invalid:true};
    else try{ ST.qrCheck = await API.verifyProof(hex); }catch(e){ ST.qrCheck = {error:e.message}; }
    const el = $('qrRes'); if(el) el.innerHTML = qrResult(ST.qrCheck); else await render();
  },
  async useSample(){ const s = API.demoSampleQr ? API.demoSampleQr() : ''; ST.qrText = s; const el = $('qrIn'); if(el){ el.value = s; el.focus(); } },
  async copyText(v){ try{ await navigator.clipboard.writeText(v); sToast('Copied'); }catch(e){ sToast('Select the text and copy it', 'bad'); } },
  async copySbar(){ try{ await navigator.clipboard.writeText($('sbarText').textContent); sToast('Handover copied'); }catch(e){ sToast('Select the text and copy it', 'bad'); } },
  async exportCsv(){
    const {from, to} = API._prog || {}; const rows = await API.programmeKpis(from, to), weekly = await API.programmeWeekly(from, to);
    const q = v => v == null ? '<5' : String(v).includes(',') ? `"${v}"` : v;
    const csv = ['section,district,facility,week_start,mothers,active_mothers,checkins,red_alerts,amber_alerts,pct_red_ack_2h,pct_followed_24h,lesson_views',
      ...rows.map(r => ['facility', r.district, r.facility, '', q(r.mothers), '', '', q(r.red_alerts), q(r.amber_alerts), r.pct_red_ack_2h ?? '', '', r.lesson_views ?? 0].join(',')),
      ...weekly.map(w => ['week', '', '', w.week_start, '', q(w.active_mothers), q(w.checkins), q(w.red_alerts), q(w.amber_alerts), '', w.pct_followed_24h ?? '', ''].join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = `safari-ya-mama-programme-${from}-${to}.csv`; a.click();
    sToast('CSV exported: counts under 5 are shown as <5'); },
  async signOut(){ await API.signOut(); API.user = null; ST.page = 'alerts'; render(); },
  async demoLogin(v){ $('em').value = v; if($('pw')) $('pw').value = SCFG.demoPassword || ''; await doSignIn(); },
};
async function doSignIn(){
  const email = $('em') ? $('em').value.trim() : '', pw = $('pw') ? $('pw').value : '';
  ST.busy = true; ST.err = ''; render();
  try{ await API.signIn(email, pw); ST.page = isAdmin() ? 'overview' : 'alerts'; startLive(); }
  catch(e){ ST.err = /Invalid login/i.test(e.message) ? 'Email or password is not right.' : e.message; }
  ST.busy = false; render();
}
let liveSub = null;
function startLive(){
  if(liveSub || isAdmin()) return;
  liveSub = API.subscribe(async p => {
    if(p && p.eventType === 'INSERT'){ const lv = p.new && p.new.level; if(p.new && p.new.id) ST.fresh.add(p.new.id); sToast(lv === 'red' ? 'New RED alert' : 'New amber alert', lv === 'red' ? 'bad' : ''); }
    if(['alerts','overview','mothers'].includes(ST.page)) await render(); else { const all = await API.alerts(); API._open = all.filter(a => a.status === 'open').length; const n = document.querySelector('.st-nav nav'); if(n){ const tmp = document.createElement('div'); tmp.innerHTML = nav(); n.replaceWith(tmp.querySelector('nav')); } }
  });
}
function sToast(msg, cls=''){ const x = {msg, cls}; ST.toasts.push(x); paintToasts(); setTimeout(() => { ST.toasts = ST.toasts.filter(y => y !== x); paintToasts(); }, 4000); }
function paintToasts(){ const el = $('stToasts') || $('toasts'); if(el) el.innerHTML = ST.toasts.map(x => `<div class="toast ${x.cls}" role="status">${sIc(x.cls === 'bad' ? 'alert' : 'tick')}<span>${h(x.msg)}</span></div>`).join(''); }
let tipEl;
function afterRender(){
  const q = $('mq'); if(q){ q.oninput = () => { ST.q = q.value; clearTimeout(q._t); q._t = setTimeout(async () => { await render(); const n = $('mq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }; }
  const f = $('signin'); if(f) f.onsubmit = e => { e.preventDefault(); doSignIn(); };
}
document.addEventListener('click', e => { const el = e.target.closest('[data-s]'); if(!el || el.disabled) return; const fn = SA[el.dataset.s]; if(fn){ e.preventDefault(); fn(el.dataset.v, el); } });
document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('tr[data-s]')) SA[e.target.dataset.s](e.target.dataset.v); });
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if(!tipEl){ tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
  if(!t){ tipEl.hidden = true; return; }
  tipEl.hidden = false; tipEl.textContent = t.dataset.tip; tipEl.style.left = Math.min(innerWidth - tipEl.offsetWidth - 8, e.clientX + 12) + 'px'; tipEl.style.top = (e.clientY - 36) + 'px';
});

async function bootStaff(){
  API.init();
  if(SLIVE){ try{ if(await API.session()){ await API.me(); ST.page = isAdmin() ? 'overview' : 'alerts'; startLive(); } }catch(e){ ST.err = e.message; } }
  render();
}
window.SYM_STAFF = {API, render, ST};
if(!SLIVE) window.SYM_BRIDGE = {checkin:c => API.receive(c), sharing:on => API.setSharing(on)};
bootStaff();
