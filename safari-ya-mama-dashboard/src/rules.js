// ================= Safari ya Mama · warning rules =================
// Fixed, explainable rules based on WHO danger signs (pregnancy), PCPNC (after birth)
// and IMCI (young infant). They never diagnose. The database runs the same rules in
// rate_checkin(); test/parity.mjs checks both give the same level for every case.
const RULES_VERSION = '2026.12';

function bpLevel(s, d){
  if(!s || !d) return null;
  if(s >= 160 || d >= 110) return 'red';
  if(s >= 140 || d >= 90) return 'yellow';
  if(s >= 130 || d >= 85) return 'elev';
  return 'green';
}
function bpSlope(bp){ if(bp.length < 4) return 0; return bp[bp.length-1].s - bp[bp.length-4].s; }

// c = {stage:'pregnant'|'baby', feel:'good'|'okay'|'unwell', move, signs:[], bfeed, bsigns:[],
//      s, d, weeks, babyDays, babyName}
function triageRules(c){
  const preg = c.stage === 'pregnant', red = [], yel = [];
  const signs = new Set(c.signs || []), bsigns = new Set(c.bsigns || []);
  const push = (lvl, r) => (lvl === 'red' ? red : yel).push(r);
  const nm = (list, k) => { const s = list.find(x => x.k === k); return s ? {en:s.en, sw:s.sw} : {en:k, sw:k}; };
  const pre = (who, r) => ({en:(who ? who.en + ': ' : '') + r.en, sw:(who ? who.sw + ': ' : '') + r.sw});
  const you = preg ? null : {en:'You', sw:'Wewe'}, bb = {en:c.babyName || 'Baby', sw:c.babyName || 'Mtoto'};
  if(preg){
    const has = k => signs.has(k), combo = new Set();
    if(has('headache') && has('vision')){ push('red', {en:'Severe headache with blurred vision', sw:'Kichwa kuuma sana na kuona ukungu'}); combo.add('headache'); combo.add('vision'); }
    if(has('swelling') && (has('headache') || has('vision'))){ push('red', {en:'Swelling with headache or vision changes', sw:'Kuvimba pamoja na kichwa au macho'}); combo.add('swelling'); combo.add('headache'); combo.add('vision'); }
    if(has('fever') && c.feel === 'unwell'){ push('red', {en:'Fever and feeling very unwell', sw:'Homa na kujisikia vibaya sana'}); combo.add('fever'); }
    for(const k of signs) if(!combo.has(k)) push(PREG_LVL[k], nm(SIGNS, k));
    if(c.weeks >= 20 && c.move === 'none') push('red', {en:'Baby not moving', sw:'Mtoto hachezi'});
    if(c.weeks >= 20 && c.move === 'fewer') push('yellow', {en:'Baby moving less than usual', sw:'Mtoto anacheza kidogo kuliko kawaida'});
  } else {
    for(const k of signs){ const s = PP_SIGNS.find(x => x.k === k); if(s) push(k === 'pp_fever' && c.feel === 'unwell' ? 'red' : s.lvl, pre(you, nm(PP_SIGNS, k))); }
    let greens = 0;
    for(const k of bsigns){ const s = BABY_SIGNS.find(x => x.k === k); if(!s) continue; if(s.lvl === 'green'){ greens++; continue; } const lvl = s.lvl === 'age' ? (c.babyDays < 60 ? 'red' : 'yellow') : s.lvl; push(lvl, pre(bb, nm(BABY_SIGNS, k))); }
    if(greens >= GREEN_STEP_UP) push('yellow', pre(bb, {en:`Several everyday signs together (${greens})`, sw:`Dalili kadhaa za kawaida kwa pamoja (${greens})`}));
    if(c.bfeed === 'not') push('red', pre(bb, {en:'Not feeding', sw:'Hanyonyi'}));
    if(c.bfeed === 'less') push('yellow', pre(bb, {en:'Feeding less than usual', sw:'Ananyonya kidogo kuliko kawaida'}));
  }
  const s = +c.s, d = +c.d, bl = bpLevel(s, d);
  const warn = preg ? ['headache','vision','bellypain','swelling'].some(k => signs.has(k)) : signs.has('pp_head');
  if(bl === 'red' || (bl === 'yellow' && warn)) push('red', {en:`Blood pressure ${s}/${d}`, sw:`Shinikizo la damu ${s}/${d}`});
  else if(bl === 'yellow') push('yellow', {en:`Blood pressure ${s}/${d} (at or above 140/90)`, sw:`Shinikizo la damu ${s}/${d} (140/90 au zaidi)`});
  if(c.feel === 'unwell' && !red.length && !yel.length) push('yellow', pre(you, {en:'Feeling unwell', sw:'Kujisikia vibaya'}));
  return {level: red.length ? 'red' : yel.length ? 'yellow' : 'green', reasons: red.length ? red : yel};
}

// The database says amber where the app says yellow
const toDbLevel = l => l === 'yellow' ? 'amber' : l;
const fromDbLevel = l => l === 'amber' ? 'yellow' : l;

// ---------- staff only: possible IMCI classifications to consider (never shown to mothers) ----------
// A memory aid for the health worker's own assessment, from the signs the mother ticked and the
// baby's age in days. It does not change the level and is not a diagnosis.
function imciHints(keys, babyDays){
  const k = new Set(keys || []), young = babyDays != null && babyDays < 60, out = [];
  const add = t => { if(!out.includes(t)) out.push(t); };
  const danger = ['b_feed','b_fits','b_sleepy','b_vomit','b_cold'].filter(x => k.has(x));
  if(young && (danger.length || k.has('b_chest') || k.has('b_breath') || k.has('b_fever'))) add('Possible serious bacterial infection (young infant)');
  if(!young && danger.length) add('Very severe disease (general danger sign)');
  if(!young && (k.has('b_chest') || k.has('b_breath'))) add('Pneumonia: count breaths and look for chest indrawing');
  if(k.has('b_yellow_severe')) add('Severe jaundice');
  else if(k.has('b_yellow')) add('Jaundice');
  if(k.has('b_diarr')) add('Diarrhoea with dehydration, or dysentery');
  if(k.has('b_belly')) add('Possible surgical abdomen (obstruction): urgent referral');
  if(k.has('b_cord')) add('Local bacterial infection (umbilicus)');
  if(k.has('b_wet')) add('Feeding problem or low intake: assess breastfeeding');
  if(!young && k.has('b_fever')) add('Fever: test for malaria, look for the cause');
  const greens = [...k].filter(x => x.startsWith('b_g_')).length;
  if(greens >= GREEN_STEP_UP) add(`${greens} everyday signs together: assess (cold, reflux, nappy rash, colic, constipation)`);
  return out;
}
