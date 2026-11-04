// ================= Safari ya Mama · staff data layer =================
// One interface, two backends: Supabase (live) and an in-memory snapshot (demo).
// Row-level security decides what a live user sees; the demo copies those rules.
const SCFG = Object.assign({mode:'demo'}, (typeof window !== 'undefined' && window.SYM_CONFIG) || {});
const SLIVE = SCFG.mode === 'supabase';
const dayStr = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const toDay = s => { const [y,m,d] = String(s).slice(0,10).split('-').map(Number); return new Date(y, m-1, d); };
const LVN = {green:0, amber:1, red:2};
const lvlOf = r => (LVN[r.server_level] || 0) > (LVN[r.level] || 0) ? r.server_level : r.level;

const LiveAPI = {
  sb:null, user:null,
  init(){ this.sb = supabase.createClient(SCFG.url, SCFG.anonKey, {auth:{persistSession:true, storageKey:'safariyamama-staff'}}); },
  async session(){ const {data:{session}} = await this.sb.auth.getSession(); return session; },
  async signIn(email, password){ const r = await this.sb.auth.signInWithPassword({email, password}); if(r.error) throw r.error; return this.me(); },
  async signOut(){ await this.sb.auth.signOut(); },
  async me(){
    const {data:{user}} = await this.sb.auth.getUser(); if(!user) return null;
    const p = await this.sb.from('profiles').select('id,display_name,role').eq('id', user.id).single(); if(p.error) throw p.error;
    if(p.data.role === 'mother' || p.data.role === 'caregiver'){ await this.signOut(); throw new Error('This account is for the mother app, not the staff dashboard.'); }
    const a = await this.sb.from('staff_assignments').select('facility_id, facilities(id,name,level,phone)').eq('staff_id', user.id).eq('active', true);
    return this.user = {id:user.id, name:p.data.display_name, role:p.data.role, facilities:(a.data || []).map(x => x.facilities)};
  },
  async alerts(){
    const r = await this.sb.from('alerts').select('*, mother:profiles!alerts_mother_id_fkey(id,display_name,phone), assigned:profiles!alerts_assigned_to_fkey(display_name)').order('created_at', {ascending:false}).limit(300);
    if(r.error) throw r.error;
    const ids = r.data.filter(a => a.source_table === 'checkins').map(a => a.source_id);
    const notes = ids.length ? await this.sb.from('checkins').select('id,note,baby_id').in('id', ids) : {data:[]};
    const nm = Object.fromEntries((notes.data || []).map(n => [n.id, n.note]));
    // which baby an alert is about (twins: one check-in row and one alert per baby)
    const bids = [...new Set((notes.data || []).map(n => n.baby_id).filter(Boolean))];
    const bb = bids.length ? await this.sb.from('babies').select('id,name,dob').in('id', bids) : {data:[]};
    const bname = Object.fromEntries((bb.data || []).map(b => [b.id, b.name || 'Baby']));
    const bOf = Object.fromEntries((notes.data || []).map(n => [n.id, n.baby_id ? bname[n.baby_id] : null]));
    const bdob = Object.fromEntries((bb.data || []).map(b => [b.id, b.dob])), dobOf = Object.fromEntries((notes.data || []).map(n => [n.id, n.baby_id ? bdob[n.baby_id] : null]));
    const ageAt = (dob, ts) => dob ? Math.round((new Date(String(ts).slice(0,10)) - new Date(dob))/864e5) : null;
    return r.data.map(a => ({...a, mother:{id:a.mother.id, name:a.mother.display_name, phone:a.mother.phone}, assigned:a.assigned ? a.assigned.display_name : null, note:nm[a.source_id] || null, baby:bOf[a.source_id] || null, babyDays:ageAt(dobOf[a.source_id], a.created_at)}));
  },
  async actions(alertId){
    const r = await this.sb.from('alert_actions').select('action,note,created_at, actor:profiles(display_name)').eq('alert_id', alertId).order('created_at');
    if(r.error) throw r.error; return r.data.map(x => ({...x, actor:x.actor ? x.actor.display_name : ''}));
  },
  async setStatus(id, status, note){ const r = await this.sb.rpc('set_alert_status', {p_alert:id, p_status:status, p_note:note || null}); if(r.error) throw r.error; return r.data; },
  async mothers(){
    const since = new Date(Date.now() - 30*864e5).toISOString();
    const [p, pr, bb, ck, al, ap] = await Promise.all([
      this.sb.from('profiles').select('id,display_name,phone,home_facility,created_at').eq('role','mother').order('display_name'),
      this.sb.from('pregnancies').select('id,mother_id,lmp,edd').eq('status','active'),
      this.sb.from('babies').select('id,mother_id,name,dob'),
      this.sb.from('checkins').select('mother_id,level,server_level,client_created_at').gte('client_created_at', since).order('client_created_at'),
      this.sb.from('alerts').select('mother_id,level,status').neq('status','closed'),
      this.sb.from('appointments').select('mother_id,kind,contact_no,due_on,attended_on').is('attended_on', null).gte('due_on', dayStr(new Date(Date.now() - 30*864e5))).order('due_on'),
    ]);
    for(const r of [p, pr, bb, ck, al, ap]) if(r.error) throw r.error;
    return shapeMothers(p.data, pr.data, bb.data, ck.data, al.data, ap.data);
  },
  async mother(id){
    const q = t => this.sb.from(t).select('*').eq('mother_id', id);
    const [p, pr, bb, ck, bp, ap, vx, al, qs, pl] = await Promise.all([
      this.sb.from('profiles').select('id,display_name,phone,home_facility,lang,created_at').eq('id', id).single(),
      q('pregnancies').order('created_at', {ascending:false}).limit(1), q('babies').order('dob', {ascending:false}).order('created_at'),
      q('checkins').order('client_created_at', {ascending:false}).limit(60), q('bp_readings').order('client_created_at'),
      q('appointments').order('due_on'), q('vaccine_doses').order('due_on'), q('alerts').order('created_at', {ascending:false}),
      q('visit_questions').order('created_at', {ascending:false}), q('birth_plans').order('updated_at', {ascending:false}).limit(1),
    ]);
    if(p.error) throw p.error;
    return {profile:p.data, preg:pr.data[0] || null, baby:bb.data[0] || null, babies:bb.data || [], checkins:ck.data, bp:bp.data, appts:ap.data, vx:vx.data, alerts:al.data, questions:qs.data || [], plan:(pl.data || [])[0] || null};
  },
  async riskQueue(fac){ const r = await this.sb.rpc('risk_queue', {p_facility:fac}); if(r.error) throw r.error; return r.data.sort((a,b) => b.score - a.score); },
  async logView(id, what){ const r = await this.sb.rpc('log_view', {p_mother:id, p_what:what || 'record'}); if(r.error) throw r.error; },
  async programmeWeekly(from, to){ const r = await this.sb.rpc('programme_weekly', {p_from:from, p_to:to}); if(r.error) throw r.error; return r.data; },
  async markAttended(id, on){ const r = await this.sb.from('appointments').update({attended_on:on ? dayStr(new Date()) : null, updated_at:new Date().toISOString()}).eq('id', id); if(r.error) throw r.error; },
  async markGiven(id, on, fac){ const r = await this.sb.from('vaccine_doses').update({given_on:on ? dayStr(new Date()) : null, facility_id:fac || null, updated_at:new Date().toISOString()}).eq('id', id); if(r.error) throw r.error; },
  async visits(){
    const from = dayStr(new Date(Date.now() - 21*864e5)), to = dayStr(new Date(Date.now() + 14*864e5));
    const [ap, vx, p] = await Promise.all([
      this.sb.from('appointments').select('id,mother_id,kind,contact_no,due_on,attended_on,note').is('attended_on', null).gte('due_on', from).lte('due_on', to).order('due_on'),
      this.sb.from('vaccine_doses').select('id,mother_id,baby_id,vaccine_key,due_on,given_on').is('given_on', null).gte('due_on', from).lte('due_on', to).order('due_on'),
      this.sb.from('profiles').select('id,display_name,phone').eq('role','mother'),
    ]);
    for(const r of [ap, vx, p]) if(r.error) throw r.error;
    return shapeVisits(ap.data, vx.data, p.data);
  },
  async facilityKpis(fac, from, to){ const r = await this.sb.rpc('facility_kpis', {p_facility:fac, p_from:from, p_to:to}); if(r.error) throw r.error; return r.data[0]; },
  async childKpis(fac, from, to){ const r = await this.sb.rpc('child_check_kpis', {p_facility:fac, p_from:from, p_to:to}); if(r.error) throw r.error; return r.data[0] || {checks:0, children:0, green:0, amber:0, red:0, top_signs:[]}; },
  async programmeKpis(from, to){ const r = await this.sb.rpc('programme_kpis', {p_from:from, p_to:to}); if(r.error) throw r.error; return r.data; },
  async lessons(){
    const [l, t] = await Promise.all([this.sb.from('lessons').select('*').order('sort'), this.sb.from('lesson_translations').select('*')]);
    if(l.error) throw l.error; return l.data.map(x => ({...x, tr:Object.fromEntries(t.data.filter(y => y.lesson_id === x.id).map(y => [y.lang, y]))}));
  },
  async saveLesson(id, patch){ const r = await this.sb.from('lessons').update(patch).eq('id', id); if(r.error) throw r.error; },
  // upsert: a new draft may not have a Kiswahili row yet
  async saveTranslation(id, lang, patch){ const r = await this.sb.from('lesson_translations').upsert({lesson_id:id, lang, ...patch}, {onConflict:'lesson_id,lang'}); if(r.error) throw r.error; },
  // 0010 workflow: the database enforces states, four-eyes approval and the audit trail
  async lessonAction(id, action, a = {}){
    const args = {submit:{p_id:id, p_note:a.note || null}, approve:{p_id:id, p_reviewer:a.reviewer, p_reviewed_on:a.reviewedOn, p_review_due:a.reviewDue, p_note:a.note || null},
      return:{p_id:id, p_note:a.note}, publish:{p_id:id, p_note:a.note || null}, new_version:{p_id:id, p_note:a.note || null}, retire:{p_id:id, p_note:a.note}}[action];
    const r = await this.sb.rpc('lesson_' + action, args); if(r.error) throw r.error; return r.data;
  },
  async lessonHistory(id){ const r = await this.sb.rpc('lesson_history', {p_id:id}); if(r.error) throw r.error; return r.data; },
  async staff(fac){
    const r = await this.sb.from('staff_assignments').select('staff_id,active,created_at, p:profiles!staff_assignments_staff_id_fkey(display_name,role)').eq('facility_id', fac);
    if(r.error) throw r.error; return r.data.map(x => ({id:x.staff_id, active:x.active, since:x.created_at, name:x.p ? x.p.display_name : '—', role:x.p ? x.p.role : ''}));
  },
  async setStaffActive(id, fac, on){ const r = await this.sb.from('staff_assignments').update({active:on}).eq('staff_id', id).eq('facility_id', fac); if(r.error) throw r.error; },
  subscribe(cb){ return this.sb.channel('alerts').on('postgres_changes', {event:'*', schema:'public', table:'alerts'}, p => cb(p)).subscribe(); },
  // ---- tamper-evident ledger (migration 0009): staff RPCs only, no identities come back
  async ledgerSummary(){ const r = await this.sb.rpc('ledger_summary'); if(r.error) throw r.error; return r.data; },
  async ledgerVerify(){ const r = await this.sb.rpc('ledger_verify', {p_from:null, p_to:null}); if(r.error) throw r.error; return (r.data || [])[0] || {ok:false, checked:0}; },
  async verifyProof(hex){ const r = await this.sb.rpc('verify_record_proof', {p_hash_hex:hex}); if(r.error) throw r.error; return (r.data || [])[0] || {matched:false}; },
  // ---- AI gateway (Edge Function). Callers pass name-free input only. Never throws for "AI is off":
  // returns {text:null, unavailable:true, reason} so the page falls back to the fixed template.
  async ai(task, lang, input, context){
    const s = await this.session(); if(!s) throw new Error('Signed out');
    let res;
    try{
      res = await fetch(`${SCFG.url}/functions/v1/ai-gateway`, {method:'POST',
        headers:{'Authorization':`Bearer ${s.access_token}`, 'apikey':SCFG.anonKey, 'content-type':'application/json'},
        body:JSON.stringify({task, lang, input, ...(context ? {context} : {})})});
    }catch(e){ return {text:null, unavailable:true, reason:'offline'}; }
    let body = {}; try{ body = await res.json(); }catch(e){}
    if(res.status === 429) return {text:null, unavailable:true, reason:'rate_limited'};
    if(!res.ok) return {text:null, unavailable:true, reason:body.error || ('http_' + res.status)};
    return body;
  },
};

// Layer 2 · transparent 7-day risk score. Same weights as risk_queue() in
// supabase/migrations/0005_safari_ya_mama.sql (demo mode computes it here).
function riskScore(D, p, fac){
  const now = Date.now(), DAYMS = 864e5, today = new Date(); today.setHours(0,0,0,0);
  const mine = x => x.mother_id === p.id, r = []; let sc = 0;
  const add = (n, t) => { sc += n; r.push(`${t} (+${n})`); };
  const preg = (D.pregnancies || []).find(mine), baby = (D.babies || []).filter(mine).sort((a,b) => a.dob < b.dob ? 1 : -1)[0];
  const cks = D.checkins.filter(mine), recent = cks.filter(c => now - new Date(c.client_created_at) < 7*DAYMS);
  const worst = Math.max(-1, ...recent.map(c => Math.max(LVN[c.level] || 0, LVN[c.server_level] || 0)));
  if(worst === 2) add(40, 'Red check-in in the last 7 days'); else if(worst === 1) add(20, 'Amber check-in in the last 7 days');
  const bps = [...D.bp_readings.filter(mine).map(b => ({s:b.systolic, d:b.diastolic, at:b.client_created_at, log:true})), ...cks.filter(c => c.systolic).map(c => ({s:c.systolic, d:c.diastolic, at:c.client_created_at}))]
    .filter(b => now - new Date(b.at) < 28*DAYMS).sort((a,b) => a.at < b.at ? 1 : -1);
  const last = bps[0];
  if(last){
    if(last.s >= 160 || last.d >= 110) add(30, `BP ${last.s}/${last.d}, severe range`);
    else if(last.s >= 140 || last.d >= 90) add(20, `BP ${last.s}/${last.d}, at or above 140/90`);
    else if(last.s >= 130 || last.d >= 85) add(8, `BP ${last.s}/${last.d}, creeping up`);
    const day = s => { const x = new Date(s); x.setHours(0,0,0,0); return x.getTime(); }, ld = day(last.at);
    const win = D.bp_readings.filter(mine).filter(b => { const dd = Math.round((ld - day(b.client_created_at))/DAYMS); return dd >= 14 && dd <= 28; });
    if(win.length){ const rise = last.s - Math.min(...win.map(b => b.systolic));
      if(rise >= 20) add(15, `Systolic up ${rise} mmHg in about 3 weeks`); else if(rise >= 10) add(6, `Systolic up ${rise} mmHg in about 3 weeks`); }
  }
  const lastCk = cks.map(c => new Date(c.client_created_at).getTime()).sort((a,b) => b - a)[0];
  if(!lastCk || now - lastCk > 7*DAYMS) add(10, 'No check-in for 7+ days'); else if(now - lastCk > 3*DAYMS) add(5, 'No check-in for 3+ days');
  if(preg){
    if(preg.prev_preeclampsia) add(12, 'Pre-eclampsia in a past pregnancy');
    if(preg.anaemia) add(8, 'Anaemia recorded');
    if(preg.prev_caesarean) add(6, 'Previous caesarean');
    if(preg.mother_age && (preg.mother_age < 18 || preg.mother_age >= 35)) add(8, `Age ${preg.mother_age}`);
    if(preg.parity >= 5) add(5, `Parity ${preg.parity}`);
  }
  const over = D.appointments.filter(mine).filter(a => !a.attended_on && toDay(a.due_on) < today && (today - toDay(a.due_on)) <= 28*DAYMS).length;
  if(over) add(Math.min(16, 8*over), `${over} visit(s) overdue`);
  if(D.alerts.some(a => mine(a) && a.facility_id === fac && a.level === 'red' && a.status === 'open')) add(10, 'Red alert not yet acknowledged');
  const bdays = baby ? Math.round((today - toDay(baby.dob))/DAYMS) : null;
  if(!preg && baby && bdays < 28) add(5, 'Baby under 28 days old');
  const score = Math.min(100, sc);
  return {mother_id:p.id, display_name:p.display_name, phone:p.phone, stage:preg ? 'pregnant' : baby ? 'baby' : 'none',
    weeks:preg ? Math.floor((today - toDay(preg.lmp))/DAYMS/7) : null, baby_days:bdays, score, band:score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low', reasons:r};
}

function shapeMothers(profiles, pregs, babies, checks, alerts, appts){
  const today = new Date(); today.setHours(0,0,0,0);
  return profiles.map(p => {
    const pr = pregs.find(x => x.mother_id === p.id), bb = babies.filter(x => x.mother_id === p.id).sort((a,b) => a.dob < b.dob ? 1 : -1)[0];
    const ck = checks.filter(x => x.mother_id === p.id), last = ck[ck.length-1];
    const al = alerts.filter(x => x.mother_id === p.id), nv = appts.filter(x => x.mother_id === p.id)[0];
    return {id:p.id, name:p.display_name, phone:p.phone, facility:p.home_facility,
      stage:pr ? 'pregnant' : bb ? 'baby' : 'none', weeks:pr ? Math.floor((today - toDay(pr.lmp))/864e5/7) : null,
      babyName:bb ? babies.filter(x => x.mother_id === p.id && x.dob === bb.dob).map(x => x.name || 'Baby').join(' & ') : null, babyDays:bb ? Math.round((today - toDay(bb.dob))/864e5) : null,
      checks30:ck.length, last:last ? {level:lvlOf(last), at:last.client_created_at} : null,
      openRed:al.filter(a => a.level === 'red').length, openAmber:al.filter(a => a.level === 'amber').length,
      next:nv ? {kind:nv.kind, n:nv.contact_no, due:nv.due_on, late:toDay(nv.due_on) < today} : null};
  });
}
function shapeVisits(appts, doses, profiles){
  const name = id => (profiles.find(p => p.id === id) || {}).display_name || '—', phone = id => (profiles.find(p => p.id === id) || {}).phone || '';
  const rows = appts.map(a => ({type:'appt', id:a.id, mother_id:a.mother_id, name:name(a.mother_id), phone:phone(a.mother_id), kind:a.kind, n:a.contact_no, due:a.due_on, note:a.note}));
  const groups = {};
  for(const v of doses){ const k = v.baby_id + v.due_on; (groups[k] = groups[k] || {type:'vx', ids:[], mother_id:v.mother_id, name:name(v.mother_id), phone:phone(v.mother_id), kind:'immunisation', due:v.due_on, keys:[]}); groups[k].ids.push(v.id); groups[k].keys.push(v.vaccine_key); }
  return [...rows, ...Object.values(groups)].sort((a,b) => a.due < b.due ? -1 : 1);
}

// ---------------- demo backend: snapshot of the local database, edited in memory ----------------
const DemoAPI = {
  D:null, user:null, subs:[],
  init(){ this.D = JSON.parse(JSON.stringify(window.SYM_DEMO_SNAPSHOT || {})); this.shift(); },
  // move every date so the snapshot is always "now"
  shift(){
    const D = this.D; if(!D.taken_at) return; const delta = Date.now() - new Date(D.taken_at).getTime(), dd = Math.round(delta/864e5);
    const ts = v => v ? new Date(new Date(v).getTime() + delta).toISOString() : v, ds = v => v ? dayStr(new Date(toDay(v).getTime() + dd*864e5)) : v;
    for(const a of D.alerts){ a.created_at = ts(a.created_at); a.acknowledged_at = ts(a.acknowledged_at); a.closed_at = ts(a.closed_at); }
    for(const a of D.alert_actions) a.created_at = ts(a.created_at);
    for(const c of [...D.checkins, ...D.bp_readings]) c.client_created_at = ts(c.client_created_at);
    for(const p of D.pregnancies){ p.lmp = ds(p.lmp); p.edd = ds(p.edd); }
    for(const b of D.babies) b.dob = ds(b.dob);
    for(const a of D.appointments){ a.due_on = ds(a.due_on); a.attended_on = ds(a.attended_on); }
    for(const v of D.vaccine_doses){ v.due_on = ds(v.due_on); v.given_on = ds(v.given_on); }
    if(D.ledger){ const L = D.ledger; L.head_at = ts(L.head_at);
      for(const a of L.anchors){ a.day = ds(a.day); a.submitted_at = ts(a.submitted_at); a.confirmed_at = ts(a.confirmed_at); }
      for(const x of L.proofs) x.recorded_at = ts(x.recorded_at); }
    D.taken_at = new Date().toISOString();
  },
  async session(){ return this.user; },
  async signIn(email){ const s = this.D.staff.find(x => x.email === email); if(!s) throw new Error('Choose one of the demo accounts.'); this.user = {id:s.id, name:s.name, role:s.role, facilities:s.facilities.map(f => this.D.facilities.find(x => x.id === f))}; return this.user; },
  async signOut(){ this.user = null; },
  async me(){ return this.user; },
  myFacs(){ return this.user.facilities.map(f => f.id); },
  sharing(mid, fac){ const c = this.D.consents.filter(x => x.mother_id === mid && x.facility_id === fac); return c.length ? c[c.length-1].granted : false; },
  canRead(mid){ if(this.user.role === 'programme_admin') return false; const p = this.D.profiles.find(x => x.id === mid); return p && this.myFacs().some(f => this.sharing(mid, f)); },
  async alerts(){
    const D = this.D;
    return D.alerts.filter(a => this.myFacs().includes(a.facility_id) && this.canRead(a.mother_id)).sort((a,b) => a.created_at < b.created_at ? 1 : -1).map(a => {
      const m = D.profiles.find(p => p.id === a.mother_id), s = D.staff.find(x => x.id === a.assigned_to), c = D.checkins.find(x => x.id === a.source_id);
      const b = c && c.baby_id ? D.babies.find(x => x.id === c.baby_id) : null;
      return {...a, mother:{id:m.id, name:m.display_name, phone:m.phone}, assigned:s ? s.name : null, note:c ? c.note : null, baby:b ? b.name || 'Baby' : null,
        babyDays:b ? Math.round((new Date(a.created_at.slice(0,10)) - new Date(b.dob))/864e5) : null}; });
  },
  async actions(id){ return this.D.alert_actions.filter(x => x.alert_id === id).sort((a,b) => a.created_at < b.created_at ? -1 : 1).map(x => ({...x, actor:(this.D.staff.find(s => s.id === x.actor_id) || {}).name || ''})); },
  async setStatus(id, status, note){
    const a = this.D.alerts.find(x => x.id === id); if(!a || !this.myFacs().includes(a.facility_id)) throw new Error('not allowed');
    const now = new Date().toISOString();
    Object.assign(a, {status, assigned_to:a.assigned_to || this.user.id, acknowledged_at:a.acknowledged_at || now, closed_at:status === 'closed' ? now : null});
    this.D.alert_actions.push({alert_id:id, actor_id:this.user.id, action:{acknowledged:'acknowledged', contacted:'called', referred:'referred', closed:'closed'}[status] || 'note', note:note || null, created_at:now});
    this.emit(); return a;
  },
  async mothers(){
    const D = this.D, ids = D.profiles.filter(p => p.role === 'mother' && this.canRead(p.id)).map(p => p.id), has = x => ids.includes(x.mother_id);
    const since = new Date(Date.now() - 30*864e5).toISOString(), from = dayStr(new Date(Date.now() - 30*864e5));
    return shapeMothers(D.profiles.filter(p => ids.includes(p.id)).sort((a,b) => a.display_name < b.display_name ? -1 : 1), D.pregnancies.filter(has), D.babies.filter(has),
      D.checkins.filter(c => has(c) && c.client_created_at >= since).sort((a,b) => a.client_created_at < b.client_created_at ? -1 : 1),
      D.alerts.filter(a => has(a) && a.status !== 'closed'), D.appointments.filter(a => has(a) && !a.attended_on && a.due_on >= from).sort((a,b) => a.due_on < b.due_on ? -1 : 1));
  },
  async mother(id){
    const D = this.D, m = x => x.mother_id === id; if(!this.canRead(id)) throw new Error('not allowed');
    const kids = D.babies.filter(m).sort((a,b) => a.dob < b.dob ? 1 : a.dob > b.dob ? -1 : 0);
    return {profile:D.profiles.find(p => p.id === id), preg:D.pregnancies.find(m) || null, baby:kids[0] || null, babies:kids,
      checkins:D.checkins.filter(m).sort((a,b) => a.client_created_at < b.client_created_at ? 1 : -1), bp:D.bp_readings.filter(m).sort((a,b) => a.client_created_at < b.client_created_at ? -1 : 1),
      appts:D.appointments.filter(m).sort((a,b) => a.due_on < b.due_on ? -1 : 1), vx:D.vaccine_doses.filter(m).sort((a,b) => a.due_on < b.due_on ? -1 : 1), alerts:D.alerts.filter(m),
      questions:(D.visit_questions || []).filter(m), plan:(D.birth_plans || []).find(m) || null};
  },
  async riskQueue(fac){
    const D = this.D; if(!this.myFacs().includes(fac)) throw new Error('not allowed');
    return D.profiles.filter(p => p.home_facility === fac && this.sharing(p.id, fac)).map(p => riskScore(D, p, fac)).sort((a,b) => b.score - a.score);
  },
  async logView(){ /* demo: nothing to log */ },
  async programmeWeekly(){ return this.D.programme_weekly || []; },
  async markAttended(id, on){ const a = this.D.appointments.find(x => x.id === id); a.attended_on = on ? dayStr(new Date()) : null; },
  async markGiven(id, on, fac){ const v = this.D.vaccine_doses.find(x => x.id === id); v.given_on = on ? dayStr(new Date()) : null; v.facility_id = fac; },
  async visits(){
    const D = this.D, from = dayStr(new Date(Date.now() - 21*864e5)), to = dayStr(new Date(Date.now() + 14*864e5)), ok = x => this.canRead(x.mother_id);
    return shapeVisits(D.appointments.filter(a => ok(a) && !a.attended_on && a.due_on >= from && a.due_on <= to), D.vaccine_doses.filter(v => ok(v) && !v.given_on && v.due_on >= from && v.due_on <= to), D.profiles);
  },
  async facilityKpis(fac, from, to){
    const D = this.D, ids = D.profiles.filter(p => p.home_facility === fac && p.role === 'mother' && this.sharing(p.id, fac)).map(p => p.id);
    const inR = s => s.slice(0,10) >= from && s.slice(0,10) <= to, al = D.alerts.filter(a => a.facility_id === fac && inR(a.created_at));
    const ack = al.filter(a => a.acknowledged_at).map(a => (new Date(a.acknowledged_at) - new Date(a.created_at))/6e4).sort((a,b) => a-b);
    const anc = ids.map(id => D.appointments.filter(a => a.mother_id === id && a.kind === 'anc' && a.attended_on).length);
    return {mothers_sharing:ids.length, checkins:D.checkins.filter(c => ids.includes(c.mother_id) && inR(c.client_created_at)).length,
      red_alerts:al.filter(a => a.level === 'red').length, amber_alerts:al.filter(a => a.level === 'amber').length,
      median_ack_minutes:ack.length ? Math.round(ack[Math.floor(ack.length/2)]*10)/10 : null,
      anc4_rate:anc.length ? Math.round(anc.filter(n => n >= 4).length/anc.length*100)/100 : null,
      visits_missed:D.appointments.filter(a => ids.includes(a.mother_id) && !a.attended_on && a.due_on >= from && a.due_on < dayStr(new Date())).length};
  },
  async childKpis(fac, from, to){
    const D = this.D, ids = D.profiles.filter(p => p.home_facility === fac && p.role === 'mother' && this.sharing(p.id, fac)).map(p => p.id);
    const ck = D.checkins.filter(c => c.baby_id && ids.includes(c.mother_id) && c.client_created_at.slice(0,10) >= from && c.client_created_at.slice(0,10) <= to);
    const n = {}; for(const c of ck) for(const k of c.baby_signs || []) n[k] = (n[k] || 0) + 1;
    return {checks:ck.length, children:new Set(ck.map(c => c.baby_id)).size, green:ck.filter(c => c.level === 'green').length,
      amber:ck.filter(c => c.level === 'amber').length, red:ck.filter(c => c.level === 'red').length,
      top_signs:Object.entries(n).sort((a,b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([sign, n]) => ({sign, n}))};
  },
  async programmeKpis(){ return this.D.programme_kpis; },
  async lessons(){ return this.D.lessons; },
  // demo mirror of migration 0010 (same rules and messages as the database)
  _lesson(id){ if(!this.user || this.user.role !== 'programme_admin') throw new Error('not allowed'); return this.D.lessons.find(l => l.id === id); },
  _log(l, action, note){ l.history.unshift({at:new Date().toISOString(), version:l.version, action, actor:this.user.name, note:note || null, actor_id:this.user.id}); },
  async saveLesson(id, patch){ const l = this._lesson(id); if(l.status !== 'draft') throw new Error('only a draft can be edited: start a new version first'); Object.assign(l, patch); },
  async saveTranslation(id, lang, patch){
    const l = this._lesson(id), t = l.tr[lang] || (l.tr[lang] = {title:'', steps:[], facts:[], reviewed_by:null, reviewed_on:null});
    const changed = ['title','steps','facts'].some(k => k in patch && JSON.stringify(patch[k]) !== JSON.stringify(t[k]));
    if(!changed) return;
    if(l.status !== 'draft') throw new Error('only a draft can be edited: start a new version first');
    Object.assign(t, patch, {reviewed_by:null, reviewed_on:null}); this._log(l, 'edit', lang);
  },
  async lessonAction(id, action, a = {}){
    const l = this._lesson(id), need = (ok, msg) => { if(!ok) throw new Error(msg); }, today = dayStr(new Date());
    if(action === 'submit'){ need(l.status === 'draft', 'only a draft can be sent for review');
      need(['en','sw'].every(g => l.tr[g] && l.tr[g].title.trim() && l.tr[g].steps.length), 'English and Kiswahili text are both needed before review'); l.status = 'in_review'; }
    else if(action === 'approve'){ need(l.status === 'in_review', 'only a lesson in review can be approved');
      need((a.reviewer || '').trim().length >= 3, 'name the clinical reviewer role'); need(a.reviewedOn && a.reviewedOn <= today, 'review date must be today or earlier');
      need(a.reviewDue && a.reviewDue > today, 'set a future date for the next review');
      const ed = l.history.find(x => x.action === 'edit' || x.action === 'new_version'); need(!ed || ed.actor_id !== this.user.id, 'four-eyes rule: someone other than the last editor must approve');
      for(const g of ['en','sw']) Object.assign(l.tr[g], {reviewed_by:a.reviewer.trim(), reviewed_on:a.reviewedOn}); l.review_due = a.reviewDue; l.status = 'approved'; }
    else if(action === 'return'){ need(['in_review','approved'].includes(l.status), 'only a lesson in review or approved can be sent back'); need((a.note || '').trim(), 'say what needs to change'); l.status = 'draft'; }
    else if(action === 'publish'){ need(l.status === 'approved', 'only an approved lesson can be published'); l.status = 'published'; }
    else if(action === 'new_version'){ need(l.status !== 'draft', 'this lesson is already a draft'); l.status = 'draft'; l.version++; }
    else if(action === 'retire'){ need(l.status !== 'retired', 'already retired'); need((a.note || '').trim(), 'say why the lesson is retired'); l.status = 'retired'; }
    else throw new Error('unknown action');
    l.published = l.status === 'published'; this._log(l, action, a.note); return l.status;
  },
  async lessonHistory(id){ return this._lesson(id).history.map(({actor_id, ...x}) => x); },
  async staff(fac){ return this.D.staff.filter(s => s.facilities.includes(fac)).map(s => ({id:s.id, name:s.name, role:s.role, active:s.active !== false, since:this.D.taken_at})); },
  async setStaffActive(id, fac, on){ this.D.staff.find(s => s.id === id).active = on; },
  subscribe(cb){ this.subs.push(cb); return {unsubscribe:() => {}}; },
  emit(p){ for(const cb of this.subs) cb(p || {}); },
  // the mother app in the same demo page reports a check-in here
  receive(checkin){
    const D = this.D, amina = D.profiles.find(p => p.phone === '+255700000101'); if(!amina) return;
    const c = {id:checkin.id, mother_id:amina.id, ...checkin}; D.checkins.push(c);
    const lv = c.level === 'yellow' ? 'amber' : c.level;
    const aid = 'demo-' + c.id;
    if(lv !== 'green' && this.sharing(amina.id, amina.home_facility))
      D.alerts.push({id:aid, mother_id:amina.id, facility_id:amina.home_facility, source_table:'checkins', source_id:c.id, level:lv, reasons:[...c.signs, ...(c.baby_signs || [])], status:'open', assigned_to:null, created_at:new Date().toISOString(), acknowledged_at:null, closed_at:null});
    if(lv !== 'green') this.emit({eventType:'INSERT', new:{id:aid, level:lv}});
  },
  // ---- ledger (Simulated: synthetic entries from scripts/demo_snapshot.mjs, nothing is anchored for real)
  async ledgerSummary(){ if(!this.user) throw new Error('not allowed'); const {proofs, sample, ...L} = this.D.ledger || {}; return JSON.parse(JSON.stringify(L)); },
  async ledgerVerify(){ if(!this.user) throw new Error('not allowed'); return {ok:true, checked:(this.D.ledger || {}).entries || 0, first_bad_seq:null, first_bad_anchor:null}; },
  async verifyProof(hex){
    if(!this.user) throw new Error('not allowed');
    const L = this.D.ledger || {proofs:[], anchors:[]}, x = /^[0-9a-f]{64}$/i.test(hex || '') && L.proofs.find(p => p.hash === hex.toLowerCase());
    if(!x) return {matched:false, ledger_seq:null, recorded_at:null, anchor_day:null, anchor_status:null, bitcoin_block:null};
    const a = L.anchors.find(a => x.seq >= a.from_seq && x.seq <= a.to_seq);
    return {matched:true, ledger_seq:x.seq, recorded_at:x.recorded_at, anchor_day:dayStr(x.recorded_at), anchor_status:a ? a.status : 'open', bitcoin_block:a ? a.bitcoin_block : null};
  },
  demoSampleQr(){ return (this.D.ledger || {}).sample || ''; },
  // ---- AI (Simulated): no model runs in the demo. Drafts reuse the fixed template; translation is not attempted.
  async ai(task, lang, input, context){
    const lbl = {sbar_draft:'AI draft · check before use', visit_summary:'AI draft · check before use', translate:'AI translation · check with the mother'}[task];
    if(!lbl) return {text:null, unavailable:true, reason:'unknown_task'};
    const body = task === 'translate'
      ? 'Simulated: no AI model runs in this demo, so no translation was made. With a linked AI key, her note appears here in the other language.'
      : String((context && context.demoTemplate) || '');
    return {text:`${lbl}\n\n${body}`, label:lbl, provider:'demo', model:null, simulated:true, task};
  },
  setSharing(on){ const D = this.D, amina = D.profiles.find(p => p.phone === '+255700000101'); if(amina) D.consents.push({mother_id:amina.id, facility_id:amina.home_facility, kind:'share_with_facility', granted:on}); this.emit(); },
};
const API = SLIVE ? LiveAPI : DemoAPI;
