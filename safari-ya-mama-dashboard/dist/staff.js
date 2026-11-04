(function(){'use strict';
const S = {lang:'en'};
// ---------- utilities ----------
const DAY = 864e5;
const sod = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const TODAY = sod(new Date());
const addDays = (d,n) => new Date(sod(d).getTime() + n*DAY);
const diffDays = (a,b) => Math.round((sod(a) - sod(b)) / DAY);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const nowTime = () => new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_SW = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ago','Sep','Okt','Nov','Des'];
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_SW = ['Jpi','Jtt','Jnn','Jtn','Alh','Ijm','Jms'];
const fmtD = (d,lang='en') => `${d.getDate()} ${(lang==='sw'?MONTHS_SW:MONTHS_EN)[d.getMonth()]}`;
const fmtDW = (d,lang='en') => `${(lang==='sw'?DAYS_SW:DAYS_EN)[d.getDay()]} ${fmtD(d,lang)}`;

// ---------- icons ----------
const P = {
  pill:'<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="m7 10 7 7"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scale:'<path d="M5 20h14l-2-12H7z"/><circle cx="12" cy="5" r="2"/><path d="M12 7v3"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  wifi:'<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  siren:'<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M4 18h16v3H4zM12 3v2M4.5 6.5 6 8M19.5 6.5 18 8"/>',
  star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  headphones:'<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
  film:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  image:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  syringe:'<path d="m18 2 4 4M16 4l4 4M14 6l4 4-9 9H5v-4z"/><path d="m11 9 2 2M8 12l2 2"/>',
  bottle:'<path d="M9 2h6M10 2v3l-2 3v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8l-2-3V2"/><path d="M8 12h8"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  check:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
  book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  diary:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  play:'<path d="M8 5v14l11-7z"/>', pause:'<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  cal:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  food:'<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 3v4M9 3v4M17 3c-2 0-3 3-3 6s1 4 3 4v8"/>',
  act:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  shield:'<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  alert:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.5h.01"/>',
  chev:'<path d="m9 6 6 6-6 6"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  vol:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  gauge:'<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
  seed:'<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/>',
  keypad:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6v4H9zM9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01"/>',
  send:'<path d="M4 12 20 4l-6 16-3-7z"/>', tick:'<path d="m5 12 5 5 9-10"/>',
  drop:'<path d="M12 2.7s-6 6.6-6 11.3a6 6 0 0 0 12 0C18 9.3 12 2.7 12 2.7z"/>',
  head:'<path d="M5 14a7 7 0 1 1 14 0v4H5z"/><path d="M8 6.5l2-2 2 2 2-2 2 2"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bolt:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  thermo:'<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
  belly:'<path d="M8 3c-2 4-3 7-3 10a7 7 0 0 0 14 0c0-3-1-6-3-10"/><path d="M11 11l1.5 2-1.5 2 1.5 2"/>',
  hand:'<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.7L7 14"/>',
  wind:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
  wave:'<path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  urine:'<path d="M12 4s-4 4.5-4 7.5a4 4 0 0 0 8 0C16 8.5 12 4 12 4z"/><path d="M5 20h14"/>',
  vomit:'<circle cx="12" cy="12" r="9"/><path d="M8 15.5c1.5-1.5 6.5-1.5 8 0M9 9h.01M15 9h.01"/>',
  baby:'<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9.5 14.5a3.5 3.5 0 0 0 5 0"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  code:'<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/>',
};
const ic = (n, cls='') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;

// ---------- i18n (English + Kiswahili) ----------
const T = {
  en:{ home:'Home', check:'Check', book:'ANC book', diary:'Diary', more:'More',
    hello:'Hello', weeks:'weeks', week:'Week', day:'day', sizeOf:'Your baby is about the size of a',
    todayCheck:"Today's check", notDone:"Not done yet. It takes about 1 minute.", startCheck:'Start today\'s check', doneAt:'Done at',
    nextVisit:'Next antenatal visit', contact:'Contact', of:'of', inDays:'in {n} days', today:'today', overdue:'overdue',
    video:'Your 30-second update', videoSub:'Week {w}: baby, danger signs, food, next visit',
    weeklyBp:'Weekly blood pressure', lastBp:'Last reading', explore:'For you',
    howFeel:'How are you feeling today?', good:'Good', okay:'Okay', unwell:'Unwell',
    moves:'Baby\'s movements today', mvNormal:'Normal', mvFewer:'Fewer than usual', mvNone:'Not moving',
    anyOf:'Do you have any of these right now?', tapAll:'Tap all that apply',
    ifa:'I took my iron + folic acid tablet', net:'I slept under a mosquito net',
    bpOpt:'Blood pressure (if you measured it)', submit:'Send my check',
    green:'You are doing well today', greenSub:'No danger signs. Keep taking your tablets and do your check again tomorrow.',
    yellow:'Contact your health worker within 24 hours', yellowSub:'Something needs a closer look. Your health facility can see this check.',
    red:'Emergency: go to the health facility now', redSub:'These are danger signs. Do not wait. Your facility has been alerted.',
    alerted:'Nyota Health Centre has been alerted', callFac:'Facility emergency line', transport:'Ask your CHW for transport',
    explain:'Explain this to me', redo:'Change my answers', why:'Why',
    disclaimer:'Safari ya Mama supports your health worker. It does not replace them.',
  },
  sw:{ home:'Nyumbani', check:'Ukaguzi', book:'Kliniki', diary:'Shajara', more:'Zaidi',
    hello:'Habari', weeks:'wiki', week:'Wiki', day:'siku', sizeOf:'Mtoto wako ana ukubwa wa',
    todayCheck:'Ukaguzi wa leo', notDone:'Bado haujafanya. Inachukua dakika 1 tu.', startCheck:'Anza ukaguzi wa leo', doneAt:'Umefanya saa',
    nextVisit:'Kliniki ijayo (ANC)', contact:'Ziara', of:'kati ya', inDays:'baada ya siku {n}', today:'leo', overdue:'imepita',
    video:'Ujumbe wako wa sekunde 30', videoSub:'Wiki {w}: mtoto, dalili za hatari, chakula, kliniki',
    weeklyBp:'Shinikizo la damu la wiki', lastBp:'Kipimo cha mwisho', explore:'Kwa ajili yako',
    howFeel:'Unajisikiaje leo?', good:'Vizuri', okay:'Kawaida', unwell:'Mgonjwa',
    moves:'Mtoto anacheza leo?', mvNormal:'Kama kawaida', mvFewer:'Kidogo kuliko kawaida', mvNone:'Hachezi',
    anyOf:'Una mojawapo ya hizi sasa hivi?', tapAll:'Gusa zote zinazohusika',
    ifa:'Nimemeza kidonge cha madini ya chuma na foliki', net:'Nimelala ndani ya chandarua',
    bpOpt:'Shinikizo la damu (kama umepima)', submit:'Tuma ukaguzi wangu',
    green:'Uko salama leo', greenSub:'Hakuna dalili za hatari. Endelea kumeza vidonge na ufanye ukaguzi tena kesho.',
    yellow:'Wasiliana na mhudumu wa afya ndani ya saa 24', yellowSub:'Kuna jambo linalohitaji kuangaliwa. Kituo chako cha afya kinaona ukaguzi huu.',
    red:'Dharura: nenda kituo cha afya sasa', redSub:'Hizi ni dalili za hatari. Usisubiri. Kituo chako kimearifiwa.',
    alerted:'Kituo cha Afya Nyota kimearifiwa', callFac:'Simu ya dharura ya kituo', transport:'Muombe mhudumu wa afya ya jamii usafiri',
    explain:'Nieleze kwa lugha rahisi', redo:'Badilisha majibu', why:'Kwa nini',
    disclaimer:'Safari ya Mama inamsaidia mhudumu wako wa afya. Haichukui nafasi yake.',
  }
};

// danger signs (WHO danger signs in pregnancy)
const SIGNS = [
  {k:'bleeding', i:'drop',  en:'Bleeding from the vagina', sw:'Kutokwa na damu ukeni'},
  {k:'headache', i:'head',  en:'Severe headache', sw:'Maumivu makali ya kichwa'},
  {k:'vision',   i:'eye',   en:'Blurred vision', sw:'Kuona ukungu'},
  {k:'fits',     i:'bolt',  en:'Fits (convulsions)', sw:'Degedege'},
  {k:'bellypain',i:'belly', en:'Severe belly pain', sw:'Maumivu makali ya tumbo'},
  {k:'swelling', i:'hand',  en:'Swollen face or hands', sw:'Uso au mikono kuvimba'},
  {k:'breathing',i:'wind',  en:'Hard to breathe', sw:'Kupumua kwa shida'},
  {k:'fever',    i:'thermo',en:'Fever / very hot', sw:'Homa kali'},
  {k:'water',    i:'wave',  en:'Water leaking', sw:'Maji kutoka ukeni'},
  {k:'urine',    i:'urine', en:'Pain when urinating', sw:'Maumivu wakati wa kukojoa'},
  {k:'vomit',    i:'vomit', en:'Vomiting a lot', sw:'Kutapika sana'},
];
const signName = (k,lang='en') => (SIGNS.find(s=>s.k===k)||{})[lang] || k;

// local fruit sizes by week
const SIZES = [[8,'bean','haragwe'],[12,'passion fruit','pasheni'],[16,'avocado','parachichi'],[20,'banana','ndizi'],[24,'maize cob','gunzi la mahindi'],[28,'pawpaw','papai'],[32,'pineapple','nanasi'],[36,'small jackfruit','fenesi dogo'],[40,'small watermelon','tikiti maji dogo']];
const sizeFor = (w,lang) => { let s=SIZES[0]; for(const x of SIZES) if(w>=x[0]) s=x; return lang==='sw'?s[2]:s[1]; };

// WHO 2016 ANC model: 8 contacts
const ANC = [
  {w:12, en:'First contact', sw:'Ziara ya kwanza', items:['Confirm pregnancy & dating ultrasound (before 24 weeks)','BP, weight, height','Hb (anaemia), blood group & Rhesus','HIV, syphilis, hepatitis B tests','Urine test','Start daily iron + folic acid','Tetanus vaccine (Td) dose 1','Get an insecticide-treated mosquito net']},
  {w:20, en:'Second contact', sw:'Ziara ya pili', items:['BP & weight','Baby growth (fundal height)','Malaria prevention IPTp-SP (malaria areas)','Deworming','Ultrasound if not yet done']},
  {w:26, en:'Third contact', sw:'Ziara ya tatu', items:['BP, urine protein','Hb re-check','Td dose 2','Diabetes screen if at risk']},
  {w:30, en:'Fourth contact', sw:'Ziara ya nne', items:['BP, urine protein','Baby growth & movements','IPTp-SP dose','Start your birth plan']},
  {w:34, en:'Fifth contact', sw:'Ziara ya tano', items:['BP','Baby\'s position','IPTp-SP dose','Review danger signs']},
  {w:36, en:'Sixth contact', sw:'Ziara ya sita', items:['BP','Baby\'s position (breech?)','Confirm where you will give birth','Transport and money plan']},
  {w:38, en:'Seventh contact', sw:'Ziara ya saba', items:['BP','Signs of labour','Choose a birth companion']},
  {w:40, en:'Eighth contact', sw:'Ziara ya nane', items:['BP','Check for overdue pregnancy','Plan if no labour by 41 weeks']},
];

// foods: approx contribution per typical serving
// protein g, iron mg, folate µg, calcium mg. Daily needs in pregnancy ≈ 71 g, 27 mg, 600 µg, 1000 mg
const NEEDS = {protein:71, iron:27, folate:600, calcium:1000};
const FOOD_BASE = [
  {k:'beans',  p:15, fe:4,  fo:250, ca:80,  n:{UG:'Beans',KE:'Beans (maharagwe)',TZ:'Maharage',ET:'Shiro (chickpea)',RW:'Ibishyimbo (beans)'}, sv:'1 cup cooked'},
  {k:'greens', p:3,  fe:3,  fo:150, ca:180, n:{UG:'Dodo (amaranth)',KE:'Sukuma wiki',TZ:'Mchicha',ET:'Gomen (collards)',RW:'Isombe (cassava leaves)'}, sv:'1 cup cooked'},
  {k:'fish',   p:25, fe:3,  fo:10,  ca:600, n:{UG:'Mukene (silverfish)',KE:'Omena',TZ:'Dagaa',ET:'Dried small fish',RW:'Sambaza'}, sv:'50 g, eaten whole'},
  {k:'eggs',   p:12, fe:1.8,fo:45,  ca:50,  n:{UG:'Eggs',KE:'Eggs',TZ:'Mayai',ET:'Eggs (enkulal)',RW:'Amagi (eggs)'}, sv:'2 eggs'},
  {k:'gnuts',  p:8,  fe:0.7,fo:70,  ca:30,  n:{UG:'Groundnut paste (ebinyebwa)',KE:'Groundnuts',TZ:'Karanga',ET:'Peanuts / flax',RW:'Ubunyobwa'}, sv:'2 tbsp'},
  {k:'milk',   p:8,  fe:0.1,fo:12,  ca:300, n:{UG:'Milk',KE:'Milk / mala',TZ:'Maziwa',ET:'Milk / yogurt (ergo)',RW:'Amata'}, sv:'1 cup'},
  {k:'liver',  p:20, fe:5,  fo:190, ca:5,   n:{UG:'Liver (ebibumba)',KE:'Liver (maini)',TZ:'Maini',ET:'Liver (gubet)',RW:'Umwijima'}, sv:'75 g'},
  {k:'avocado',p:2,  fe:0.5,fo:80,  ca:10,  n:{UG:'Avocado',KE:'Avocado',TZ:'Parachichi',ET:'Avocado',RW:'Avoka'}, sv:'half'},
  {k:'fruit',  p:1,  fe:0.2,fo:40,  ca:40,  n:{UG:'Orange / mango',KE:'Orange / mango',TZ:'Chungwa / embe',ET:'Orange / mango',RW:'Icunga / umwembe'}, sv:'1 fruit, helps iron absorb'},
  {k:'staple', p:4,  fe:1,  fo:20,  ca:20,  n:{UG:'Matooke / posho',KE:'Ugali',TZ:'Ugali / wali',ET:'Injera (teff)',RW:'Ibitoki / ubugari'}, sv:'1 plate'},
  {k:'ifa',    p:0,  fe:60, fo:400, ca:0,   n:{UG:'Iron + folic acid tablet',KE:'Iron + folic acid tablet',TZ:'Kidonge cha IFA',ET:'Iron + folic acid tablet',RW:'Iron + folic acid tablet'}, sv:'1 tablet daily'},
];
const COUNTRIES = {TZ:'Tanzania',UG:'Uganda',KE:'Kenya',ET:'Ethiopia',RW:'Rwanda'};
const RECIPES = {
  UG:[{n:'Katogo: matooke with beans & dodo',t:['Iron','Protein','Folate'],s:['Peel and cut 4 matooke fingers.','Boil with 1 cup pre-cooked beans, onion and tomato for 20 min.','Stir in chopped dodo for the last 5 min.','Eat with an orange to help absorb the iron.']},
      {n:'Mukene in groundnut sauce',t:['Calcium','Protein'],s:['Rinse a handful of mukene in warm water.','Fry onion & tomato, add 3 tbsp groundnut paste mixed with water.','Add mukene and simmer 15 min.','Serve with sweet potato or posho.']},
      {n:'Liver with greens and posho',t:['Iron','Folate'],s:['Slice 75 g liver, fry with onion until cooked through.','Add sukuma or dodo and a little water, cook 5 min.','Serve with posho. Once a week is enough.']}],
  KE:[{n:'Githeri with sukuma wiki',t:['Iron','Protein','Folate'],s:['Boil maize and beans (soaked overnight) until soft.','Fry onion, tomato, add githeri and simmer 10 min.','Serve with sukuma wiki cooked with onion.']},
      {n:'Omena with ugali',t:['Calcium','Protein'],s:['Rinse omena twice in warm water.','Fry with onion, tomato and a little oil for 10 min.','Serve with ugali and greens.']},
      {n:'Ndengu (green gram) stew',t:['Protein','Folate'],s:['Boil 1 cup ndengu until soft.','Fry onion, garlic and tomato; add ndengu and simmer.','Serve with chapati or rice and avocado.']}],
  TZ:[{n:'Maharage ya nazi with mchicha',t:['Iron','Protein','Folate'],s:['Boil maharage until soft.','Add coconut milk, onion and tomato; simmer 15 min.','Serve with rice and mchicha.']},
      {n:'Dagaa wa nazi',t:['Calcium','Protein'],s:['Wash dagaa in warm water.','Fry onion and tomato, add dagaa and coconut milk.','Simmer 10 min, serve with ugali.']},
      {n:'Mchicha wa karanga',t:['Folate','Calcium'],s:['Cook chopped mchicha with onion and tomato.','Stir in 2 tbsp peanut paste and a little water.','Simmer 5 min.']}],
  ET:[{n:'Shiro wat with injera',t:['Protein','Iron'],s:['Cook onion in a little oil, add berbere to taste.','Whisk in shiro powder with water, simmer 15 min.','Serve with teff injera (rich in iron).']},
      {n:'Misir wot (red lentils)',t:['Protein','Folate','Iron'],s:['Cook onion, garlic and ginger.','Add red lentils and water, simmer until soft.','Serve with injera and gomen.']},
      {n:'Gomen with eggs',t:['Folate','Protein'],s:['Cook chopped collards with onion and garlic.','Add 2 boiled eggs on the side.']}],
  RW:[{n:'Isombe with beans',t:['Iron','Folate','Protein'],s:['Pound cassava leaves and boil 45 min.','Add onion, aubergine and a spoon of peanut paste.','Serve with beans.']},
      {n:'Sambaza with greens',t:['Calcium','Protein'],s:['Fry sambaza with onion until crisp.','Serve with greens and ubugari.']},
      {n:'Ibiharage with avocado',t:['Protein','Folate'],s:['Cook beans with onion and tomato.','Serve with sliced avocado and plantain.']}],
};

// exercises by trimester; month chips map onto these
const EX = {
  1:[{n:'Brisk walk',d:'15–20 min, talk-test pace',f:'walk'},{n:'Pelvic floor squeezes',d:'3 sets of 10, hold 5 sec',f:'sit'},{n:'Cat–cow stretch',d:'10 slow rounds on hands & knees',f:'cat'},{n:'Belly breathing',d:'5 min, slow breaths in and out',f:'sit'}],
  2:[{n:'Walk',d:'30 min, flat ground',f:'walk'},{n:'Wall squats',d:'2 × 10, back against the wall',f:'squat'},{n:'Side-lying leg lifts',d:'2 × 10 each side',f:'side'},{n:'Arm circles with water bottles',d:'2 × 15',f:'arms'}],
  3:[{n:'Gentle walk',d:'20–30 min, rest when needed',f:'walk'},{n:'Supported squats',d:'10, holding a chair',f:'squat'},{n:'Pelvic tilts on hands & knees',d:'10 slow rounds, eases back pain',f:'cat'},{n:'Labour breathing practice',d:'5 min: in for 4, out for 6',f:'sit'}],
};
const MONTH_TIP = {1:'Nausea is common: short sessions are fine.',2:'Drink water before and after.',3:'Keep it light; rest if tired.',4:'From now, avoid lying flat on your back to exercise.',5:'Energy often returns this month.',6:'Wear supportive clothing; keep your balance.',7:'Slow down; use a chair or wall for support.',8:'Focus on breathing and pelvic tilts.',9:'Walking can help baby move down. Practise labour breathing.'};
const FIG = {
  walk:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="21" cy="7" r="3.5"/><path d="M20 12l-2 10 5 5 2 9M18 22l-5 13M19 14l-6 5M21 14l6 4"/><path d="M19 15c3 0 5 3 4 6" stroke-width="0" /></svg>',
  sit:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="20" cy="8" r="3.5"/><path d="M20 13v12M20 17l-7 5M20 17l7 5M8 32c4-5 20-5 24 0"/></svg>',
  cat:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="33" cy="16" r="3.5"/><path d="M8 20c6-6 14-6 21-3M9 20v12M28 18v14M4 33h33"/></svg>',
  squat:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="18" cy="7" r="3.5"/><path d="M18 12l-1 11h-7l2 11M17 23l8 0 1 11M18 15l9 0M34 4v32"/></svg>',
  side:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="6" cy="26" r="3.5"/><path d="M10 27h16l10-9M26 27h10M4 33h33M12 27l-2-5"/></svg>',
  arms:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="20" cy="8" r="3.5"/><path d="M20 13v12l-4 10M20 25l4 10M20 16l-11-3M20 16l11-3"/><circle cx="7" cy="12" r="2"/><circle cx="33" cy="12" r="2"/></svg>',
};

// pre-pregnancy steps
const PRE = [
  {k:'folic', en:'Start folic acid 400 µg daily', d:'At least 3 months before trying. Prevents spine and brain defects.'},
  {k:'tests', en:'Test for HIV, syphilis, hepatitis B', d:'Free at most public facilities. Treatment protects your baby.'},
  {k:'hb',    en:'Check for anaemia (Hb)', d:'Treat low iron before pregnancy.'},
  {k:'td',    en:'Get your tetanus (Td) vaccine', d:'Ask about rubella vaccine too.'},
  {k:'bp',    en:'Check blood pressure & blood sugar', d:'Control high BP or diabetes before conceiving.'},
  {k:'net',   en:'Sleep under a treated mosquito net', d:'Malaria in pregnancy causes anaemia and low birth weight.'},
  {k:'space', en:'Wait 24 months after your last birth', d:'Healthy spacing lowers risk for you and your baby.'},
  {k:'stop',  en:'Stop alcohol and smoking', d:'Also avoid traditional medicines unless a health worker approves.'},
];

// ---------- the mother using the app (seeded relative to today) ----------
let ME_WEEKS = 28;
let ME_LMP = addDays(TODAY, -ME_WEEKS*7);
const BP_ME = [[112,72],[115,74],[118,76],[122,80],[128,84],[134,88]].map((v,i,a)=>({s:v[0],d:v[1],date:addDays(TODAY,-(a.length-1-i)*7-2)}));

const ME_DIARY = [
  {date:addDays(TODAY,-12), sym:['Heartburn'], sev:1, note:'After supper, better when sitting up.'},
  {date:addDays(TODAY,-8), sym:['Swollen feet'], sev:1, note:'Evening only, gone by morning.'},
  {date:addDays(TODAY,-5), sym:['Headache'], sev:2, note:'Mild, went away after resting and water.'},
  {date:addDays(TODAY,-2), sym:['Back pain','Trouble sleeping'], sev:2, note:''},
];
const DIARY_SYMPTOMS = ['Nausea','Headache','Back pain','Heartburn','Swollen feet','Cramps','Dizziness','Constipation','Unusual discharge','Trouble sleeping','Feeling low or worried','Itching'];


// ---------- mother & baby content (English + Kiswahili) ----------
const L = o => (o && (o[S.lang] ?? o.en)) ?? '';

const PREG_MONTHS = {
  1:{baby:{en:'Baby is a tiny cluster of cells settling into the womb. The heart and spine start to form.',sw:'Mtoto ni kundi dogo la seli linalojishikiza tumboni. Moyo na uti wa mgongo vinaanza kuumbika.'},
     you:{en:'Your period stops. You may feel tired or sick. Start folic acid and book your first antenatal visit.',sw:'Hedhi inakoma. Unaweza kuchoka au kuhisi kichefuchefu. Anza vidonge vya foliki na panga kliniki ya kwanza.'}},
  2:{baby:{en:'The heart beats. Arms, legs and face begin to form.',sw:'Moyo unadunda. Mikono, miguu na uso vinaanza kuumbika.'},
     you:{en:'Nausea and tender breasts are common. Eat small meals often.',sw:'Kichefuchefu na matiti kuuma ni kawaida. Kula kidogo mara nyingi.'}},
  3:{baby:{en:'All the organs have formed. Baby moves, but you cannot feel it yet.',sw:'Viungo vyote vimeumbika. Mtoto anasogea lakini bado huhisi.'},
     you:{en:'Go to your first antenatal visit by 12 weeks. Nausea often eases soon.',sw:'Hudhuria kliniki ya kwanza kabla ya wiki 12. Kichefuchefu hupungua hivi karibuni.'}},
  4:{baby:{en:'Baby can hear sounds. Hair and nails are growing.',sw:'Mtoto anasikia sauti. Nywele na kucha zinaota.'},
     you:{en:'Energy often returns. Keep taking your iron and folic acid tablet.',sw:'Nguvu mara nyingi hurudi. Endelea kumeza kidonge cha madini ya chuma na foliki.'}},
  5:{baby:{en:'You may feel the first movements, like small flutters.',sw:'Unaweza kuhisi mtoto akicheza kwa mara ya kwanza.'},
     you:{en:'Your belly shows. Start sleeping on your side.',sw:'Tumbo linaonekana. Anza kulala kwa ubavu.'}},
  6:{baby:{en:"Baby's lungs are developing and baby reacts to your voice.",sw:'Mapafu ya mtoto yanakua na anaitikia sauti yako.'},
     you:{en:'Back pain and heartburn are common. Rest and eat smaller meals.',sw:'Maumivu ya mgongo na kiungulia ni kawaida. Pumzika na kula milo midogo.'}},
  7:{baby:{en:'Baby opens their eyes and puts on fat.',sw:'Mtoto anafumbua macho na kuongeza mafuta mwilini.'},
     you:{en:'Notice baby’s movements every day. Watch for headache, swelling or blurred vision.',sw:'Fuatilia mateke ya mtoto kila siku. Angalia kichwa kuuma, kuvimba au kuona ukungu.'}},
  8:{baby:{en:'Baby grows fast and usually turns head-down.',sw:'Mtoto anakua haraka na kwa kawaida hugeuka kichwa chini.'},
     you:{en:'Finish your birth plan and learn the signs of labour.',sw:'Kamilisha mpango wa kujifungua na jifunze dalili za uchungu.'}},
  9:{baby:{en:'Baby is getting ready to be born.',sw:'Mtoto anajiandaa kuzaliwa.'},
     you:{en:'Keep your bag ready. Go to the facility when labour starts or your water breaks.',sw:'Weka begi tayari. Nenda kituoni uchungu ukianza au chupa ikipasuka.'}},
};

// Postnatal (mother) warning signs — WHO PCPNC
const PP_SIGNS = [
  {k:'pp_bleed', i:'drop',  lvl:'red',    en:'Heavy bleeding (a pad soaked in under an hour)', sw:'Kutokwa damu nyingi (pedi inalowa chini ya saa moja)'},
  {k:'pp_fits',  i:'bolt',  lvl:'red',    en:'Fits (convulsions)', sw:'Degedege'},
  {k:'pp_head',  i:'head',  lvl:'red',    en:'Severe headache or blurred vision', sw:'Kichwa kuuma sana au kuona ukungu'},
  {k:'pp_breath',i:'wind',  lvl:'red',    en:'Hard to breathe or chest pain', sw:'Kupumua kwa shida au maumivu ya kifua'},
  {k:'pp_leg',   i:'act',   lvl:'red',    en:'Painful, swollen leg', sw:'Mguu kuvimba na kuuma'},
  {k:'pp_fever', i:'thermo',lvl:'yellow', en:'Fever', sw:'Homa'},
  {k:'pp_belly', i:'belly', lvl:'yellow', en:'Belly pain', sw:'Maumivu ya tumbo'},
  {k:'pp_discharge', i:'urine', lvl:'yellow', en:'Smelly discharge from the vagina', sw:'Uchafu wenye harufu mbaya ukeni'},
  {k:'pp_breast',i:'heart', lvl:'yellow', en:'Painful, red or hot breast', sw:'Titi kuuma, jekundu au la moto'},
  {k:'pp_mood',  i:'moon',  lvl:'yellow', en:'Very sad or hopeless most days', sw:'Huzuni kubwa au kukata tamaa siku nyingi'},
  {k:'pp_harm',  i:'alert', lvl:'red',    en:'Thoughts of harming myself or my baby', sw:'Mawazo ya kujidhuru au kumdhuru mtoto'},
];
// Baby warning signs — WHO IMCI (young infant / child)
const BABY_SIGNS = [
  {k:'b_feed',   i:'bottle', lvl:'red',    en:'Not able to breastfeed or drink', sw:'Hawezi kunyonya wala kunywa'},
  {k:'b_fits',   i:'bolt',   lvl:'red',    en:'Fits (convulsions)', sw:'Degedege'},
  {k:'b_breath', i:'wind',   lvl:'red',    en:'Fast or difficult breathing', sw:'Anapumua haraka au kwa shida'},
  {k:'b_chest',  i:'act',    lvl:'red',    en:'Chest pulls in when breathing', sw:'Kifua kinavutika ndani anapovuta pumzi'},
  {k:'b_sleepy', i:'moon',   lvl:'red',    en:'Very sleepy, hard to wake', sw:'Amelegea, ni vigumu kumwamsha'},
  {k:'b_vomit',  i:'vomit',  lvl:'red',    en:'Vomits everything', sw:'Anatapika kila kitu'},
  {k:'b_diarr',  i:'drop',   lvl:'red',    en:'Diarrhoea with blood, or sunken eyes', sw:'Kuharisha damu, au macho yameingia ndani'},
  {k:'b_cold',   i:'thermo', lvl:'red',    en:'Feels cold to touch', sw:'Mwili wa baridi'},
  {k:'b_fever',  i:'thermo', lvl:'age',    en:'Feels hot (fever)', sw:'Ana homa'},
  {k:'b_yellow', i:'sun',    lvl:'yellow', en:'Yellow skin or eyes', sw:'Ngozi au macho ya njano'},
  {k:'b_cord',   i:'baby',   lvl:'yellow', en:'Red or smelly cord, or pus', sw:'Kitovu chekundu, usaha au harufu'},
  {k:'b_wet',    i:'urine',  lvl:'yellow', en:'Fewer wet nappies than usual', sw:'Nepi chache zenye mkojo kuliko kawaida'},
  // rules 2026.12: IMCI severe jaundice and abdominal danger signs (clinical sign-off pending)
  {k:'b_yellow_severe', i:'sun', lvl:'red', en:'Yellow palms or soles, or yellow on the first day of life', sw:'Viganja au nyayo za njano, au njano siku ya kwanza ya maisha'},
  {k:'b_belly',  i:'vomit',  lvl:'red',    en:'Swollen, hard belly or green vomit', sw:'Tumbo limevimba na gumu, au matapishi ya kijani'},
  // rules 2026.12: everyday signs (green). 4 or more together make the check amber: a
  // Safari ya Mama rule, not a WHO rule (clinical sign-off pending).
  {k:'b_g_cold', i:'wind',   lvl:'green',  en:'Mild cough or runny nose', sw:'Kikohozi kidogo au mafua'},
  {k:'b_g_spit', i:'drop',   lvl:'green',  en:'Small spit-ups after feeds', sw:'Kucheua maziwa kidogo baada ya kunyonya'},
  {k:'b_g_rash', i:'baby',   lvl:'green',  en:'Nappy rash', sw:'Vipele vya nepi'},
  {k:'b_g_fussy',i:'moon',   lvl:'green',  en:'Crying or fussy more than usual', sw:'Analia au anasumbua kuliko kawaida'},
  {k:'b_g_stool',i:'baby',   lvl:'green',  en:'Hard or fewer stools', sw:'Kinyesi kigumu au kichache'},
];
// Number of everyday (green) baby signs on one check that makes it amber (rules 2026.12)
const GREEN_STEP_UP = 4;
// Pregnancy sign levels (SIGNS list lives in data.js)
const PREG_LVL = {bleeding:'red', fits:'red', bellypain:'red', breathing:'red', water:'red', headache:'yellow', vision:'yellow', swelling:'yellow', fever:'yellow', urine:'yellow', vomit:'yellow'};

const MILESTONES = [
  {m:1, items:[{k:'m1a',en:'Lifts head briefly on tummy',sw:'Huinua kichwa kidogo akilala kifudifudi'},{k:'m1b',en:'Looks at your face',sw:'Hutazama uso wako'},{k:'m1c',en:'Startles at loud sounds',sw:'Hushtuka kwa sauti kubwa'}]},
  {m:2, items:[{k:'m2a',en:'Smiles at people',sw:'Huwatabasamia watu'},{k:'m2b',en:'Coos and makes sounds',sw:'Hutoa sauti za kuongea'},{k:'m2c',en:'Follows you with eyes',sw:'Hukufuata kwa macho'}]},
  {m:4, items:[{k:'m4a',en:'Holds head steady',sw:'Hushikilia kichwa imara'},{k:'m4b',en:'Laughs',sw:'Hucheka'},{k:'m4c',en:'Brings hands to mouth',sw:'Hupeleka mikono mdomoni'},{k:'m4d',en:'Pushes up on arms on tummy',sw:'Hujiinua kwa mikono akilala kifudifudi'}]},
  {m:6, items:[{k:'m6a',en:'Rolls over',sw:'Hujigeuza'},{k:'m6b',en:'Sits with support',sw:'Hukaa akishikiliwa'},{k:'m6c',en:'Reaches for things',sw:'Hunyoosha mkono kushika vitu'},{k:'m6d',en:'Turns to their name',sw:'Huitikia jina lake'}]},
  {m:9, items:[{k:'m9a',en:'Sits without support',sw:'Hukaa bila kushikiliwa'},{k:'m9b',en:'Crawls or pulls up to stand',sw:'Hutambaa au hujaribu kusimama'},{k:'m9c',en:'Says “mama”, “baba” sounds',sw:'Hutamka “mama”, “baba”'},{k:'m9d',en:'Shy with strangers',sw:'Huogopa wageni'}]},
];

// Routine schedule as used in Tanzania (always follow the child health card)
const VACCINES = [
  {d:0,   en:'At birth', sw:'Wakati wa kuzaliwa', items:['BCG','OPV 0']},
  {d:42,  en:'6 weeks',  sw:'Wiki 6',  items:['OPV 1','Pentavalent 1','PCV 1','Rotavirus 1']},
  {d:70,  en:'10 weeks', sw:'Wiki 10', items:['OPV 2','Pentavalent 2','PCV 2','Rotavirus 2']},
  {d:98,  en:'14 weeks', sw:'Wiki 14', items:['OPV 3','Pentavalent 3','PCV 3','IPV']},
  {d:183, en:'6 months', sw:'Miezi 6', items:['Vitamin A']},
  {d:274, en:'9 months', sw:'Miezi 9', items:['Measles-Rubella 1']},
];
const POSTNATAL = [
  {d:0,  en:'Postnatal check within 24 hours', sw:'Uchunguzi ndani ya saa 24', note:{en:'Mother and Zuri checked. Zuri 3.1 kg, breastfeeding started in the first hour.',sw:'Mama na Zuri walichunguzwa. Zuri kilo 3.1, alianza kunyonya saa ya kwanza.'}},
  {d:3,  en:'Postnatal visit, day 3', sw:'Kliniki ya siku ya 3', note:{en:'Cord clean and dry. Mild yellow skin checked, no treatment needed.',sw:'Kitovu kisafi na kikavu. Ngozi ya njano kidogo ilichunguzwa, hakuna tiba iliyohitajika.'}},
  {d:10, en:'Postnatal visit, day 7–14', sw:'Kliniki ya siku 7–14', note:{en:'Zuri 3.2 kg, back above birth weight. Mother’s BP 118/76.',sw:'Zuri kilo 3.2, amerudi juu ya uzito wa kuzaliwa. Shinikizo la mama 118/76.'}},
  {d:42, en:'Postnatal visit, week 6', sw:'Kliniki ya wiki 6', note:{en:'Zuri 4.5 kg. 6-week vaccines given. Family planning discussed.',sw:'Zuri kilo 4.5. Chanjo za wiki 6 zimetolewa. Uzazi wa mpango ulijadiliwa.'}},
];

const LIB_CATS = [
  {k:'preg',    i:'belly', en:'Pregnancy and birth preparation', sw:'Ujauzito na maandalizi ya kujifungua'},
  {k:'nutri',   i:'food',  en:'Nutrition and wellbeing', sw:'Lishe na ustawi wa mama'},
  {k:'feed',    i:'heart', en:'Breastfeeding and infant feeding', sw:'Kunyonyesha na ulishaji wa mtoto'},
  {k:'newborn', i:'baby',  en:'Newborn care and hygiene', sw:'Matunzo ya mtoto na usafi'},
];
const LESSONS = [
  {id:'danger-preg', cat:'preg', fmt:'video', min:1, stage:'pregnant', icons:['drop','head','hand','thermo'],
   t:{en:'Danger signs in pregnancy',sw:'Dalili za hatari wakati wa ujauzito'},
   s:{en:['Bleeding from the vagina: go to the facility now.','Severe headache, blurred vision or fits: go now.','Swollen face or hands with headache or blurred vision, or severe belly pain: go now.','Water leaking: go now. Fever, or baby moving less: see a health worker today.'],
      sw:['Kutokwa damu ukeni: nenda kituoni sasa.','Kichwa kuuma sana, kuona ukungu au degedege: nenda sasa.','Uso au mikono kuvimba pamoja na kichwa kuuma au kuona ukungu, au maumivu makali ya tumbo: nenda sasa.','Maji kutoka: nenda sasa. Homa, au mtoto kucheza kidogo: muone mhudumu wa afya leo.']}},
  {id:'birth-plan', cat:'preg', fmt:'guide', min:3, stage:'pregnant', icons:['home','phone','users','book'],
   t:{en:'Your birth plan',sw:'Mpango wako wa kujifungua'},
   s:{en:['Choose the facility where you will give birth.','Plan transport and save money for the journey.','Choose a birth companion and someone to care for your home.','Pack clean cloths, baby clothes and your clinic card.'],
      sw:['Chagua kituo utakachojifungulia.','Panga usafiri na weka akiba ya nauli.','Chagua msindikizaji na mtu wa kutunza nyumbani.','Andaa vitambaa safi, nguo za mtoto na kadi ya kliniki.']}},
  {id:'kicks', cat:'preg', fmt:'audio', min:2, stage:'pregnant', icons:['baby','clock','heart','phone'],
   t:{en:"Knowing your baby's movements",sw:'Kuifahamu mitikisiko ya mtoto'},
   s:{en:["From about 28 weeks, notice your baby's movements every day.",'Lie on your left side after a meal and notice the kicks, rolls and swishes. There is no number to reach.',"Learn your baby's usual pattern.",'If movements are fewer than usual or stop, contact a health worker today. Do not wait until tomorrow.'],
      sw:['Kuanzia wiki 28, fuatilia mateke ya mtoto kila siku.','Lala kwa ubavu wa kushoto baada ya kula na fuatilia mateke na mizunguko. Hakuna idadi ya kufikia.','Jifunze mtindo wa kawaida wa mtoto wako.','Mateke yakipungua au kukoma, wasiliana na mhudumu wa afya leo. Usisubiri kesho.']}},
  {id:'labour', cat:'preg', fmt:'guide', min:2, stage:'pregnant', icons:['clock','drop','wave','alert'],
   t:{en:'Signs of labour',sw:'Dalili za uchungu'},
   s:{en:['Regular, painful tightenings that get stronger and closer together.','A show of mucus with a little blood.','Your water breaks: go to the facility, even without pain.','Heavy bleeding is not normal labour: go now.'],
      sw:['Maumivu ya tumbo yanayokuja kwa mpangilio na kuongezeka.','Ute wenye damu kidogo.','Chupa ikipasuka: nenda kituoni hata bila maumivu.','Damu nyingi si uchungu wa kawaida: nenda sasa.']}},
  {id:'eat-well', cat:'nutri', fmt:'guide', min:3, stage:'all', icons:['food','seed','drop','sun'],
   t:{en:'Eating well, the East African way',sw:'Lishe bora kwa vyakula vya nyumbani'},
   s:{en:['Add beans, lentils or groundnuts to one meal every day.','Eat dark green leaves like mchicha or sukuma wiki.','Small fish like dagaa give protein and calcium.','Eat a fruit with meals to help your body use iron.'],
      sw:['Ongeza maharage, dengu au karanga kwenye mlo mmoja kila siku.','Kula mboga za majani kama mchicha au sukuma wiki.','Samaki wadogo kama dagaa wana protini na kalsiamu.','Kula tunda pamoja na chakula kusaidia mwili kutumia madini ya chuma.']}},
  {id:'ifa', cat:'nutri', fmt:'audio', min:2, stage:'all', icons:['pill','drop','clock','check'],
   t:{en:'Iron and folic acid tablets',sw:'Vidonge vya madini ya chuma na foliki'},
   s:{en:['Take one tablet every day, as your clinic prescribed.','Take it with water or juice, not with tea or coffee.','Dark stools are normal. Mild nausea often passes.','If you forget a day, continue the next day. Do not take two.'],
      sw:['Meza kidonge kimoja kila siku, kama kliniki ilivyokuandikia.','Meza kwa maji au juisi, si kwa chai au kahawa.','Choo cheusi ni kawaida. Kichefuchefu kidogo hupita.','Ukisahau siku moja, endelea kesho. Usimeze viwili.']}},
  {id:'mood', cat:'nutri', fmt:'audio', min:3, stage:'all', icons:['moon','users','chat','phone'],
   t:{en:'Feeling low in pregnancy or after birth',sw:'Huzuni wakati wa ujauzito au baada ya kujifungua'},
   s:{en:['Many mothers feel tired, worried or tearful. You are not alone.','Talk to someone you trust, and rest when you can.','If you feel very sad for more than two weeks, tell your health worker.','If you have thoughts of harming yourself or your baby, get help today.'],
      sw:['Akina mama wengi huchoka, huwa na wasiwasi au hulia. Hauko peke yako.','Ongea na mtu unayemwamini, na pumzika unapoweza.','Ukihisi huzuni kubwa kwa zaidi ya wiki mbili, mwambie mhudumu wa afya.','Ukiwa na mawazo ya kujidhuru au kumdhuru mtoto, tafuta msaada leo.']}},
  {id:'breastfeed', cat:'feed', fmt:'video', min:1, stage:'all', icons:['heart','drop','clock','moon'],
   t:{en:'Breastfeeding from the first hour',sw:'Kunyonyesha tangu saa ya kwanza'},
   s:{en:['Hold baby skin-to-skin and start breastfeeding within one hour of birth.','The first yellow milk (colostrum) protects your baby.','Give breast milk only, with no water or other food, until 6 months.','Feed whenever baby wants, day and night, at least 8 times a day.'],
      sw:['Mweke mtoto ngozi kwa ngozi na anza kunyonyesha ndani ya saa moja baada ya kuzaliwa.','Maziwa ya kwanza ya njano yanamkinga mtoto.','Mpe maziwa ya mama pekee, bila maji wala chakula kingine, hadi miezi 6.','Nyonyesha kila mtoto anapotaka, mchana na usiku, angalau mara 8 kwa siku.']}},
  {id:'attach', cat:'feed', fmt:'guide', min:2, stage:'baby', icons:['baby','eye','vol','hand'],
   t:{en:'Good attachment at the breast',sw:'Kunyonya kwa usahihi'},
   s:{en:["Baby's chin touches the breast and the mouth is wide open.",'More of the dark area shows above the lip than below.','You hear slow, deep sucks and swallowing.','Pain or cracked nipples: ask a health worker to check the attachment.'],
      sw:['Kidevu cha mtoto kinagusa titi na mdomo uko wazi.','Sehemu nyeusi ya titi inaonekana zaidi juu ya mdomo kuliko chini.','Unasikia mivuto ya polepole na kumeza.','Maumivu au chuchu kupasuka: muombe mhudumu wa afya aangalie unavyonyonyesha.']}},
  {id:'solids', cat:'feed', fmt:'guide', min:3, stage:'baby', icons:['food','seed','sun','hand'],
   t:{en:'Starting foods at 6 months',sw:'Kuanza vyakula akiwa na miezi 6'},
   s:{en:['At 6 months, keep breastfeeding and add soft foods.','Start with thick porridge (uji) with groundnut or dagaa powder.','Add mashed banana, avocado, pumpkin and well-cooked beans.','Wash hands and use a clean cup and spoon. Avoid feeding bottles.'],
      sw:['Akifikisha miezi 6, endelea kunyonyesha na ongeza vyakula laini.','Anza na uji mzito ulioongezwa unga wa karanga au dagaa.','Ongeza ndizi, parachichi, maboga na maharage yaliyopondwa.','Nawa mikono na tumia kikombe na kijiko safi. Epuka chupa.']}},
  {id:'warm', cat:'newborn', fmt:'guide', min:2, stage:'all', icons:['heart','sun','drop','thermo'],
   t:{en:'Keeping your newborn warm',sw:'Kumweka mtoto mchanga katika joto'},
   s:{en:['Dry baby straight after birth and hold them skin-to-skin.','Dress baby in one more layer than you, with a hat.','Wait at least 24 hours before the first bath.','Cold hands, feet and body: warm baby and see a health worker today.'],
      sw:['Mkaushe mtoto mara baada ya kuzaliwa na mkumbatie ngozi kwa ngozi.','Mvalishe mtoto nguo moja zaidi yako, na kofia.','Subiri angalau saa 24 kabla ya kumwogesha mara ya kwanza.','Mikono, miguu na mwili wa baridi: mpe joto na muone mhudumu wa afya leo.']}},
  {id:'cord', cat:'newborn', fmt:'audio', min:2, stage:'all', icons:['hand','drop','baby','alert'],
   t:{en:'Caring for the cord',sw:'Kutunza kitovu'},
   s:{en:['Keep the cord clean and dry. Wash your hands before touching it.','Do not put anything on the cord.','Fold the nappy below the cord.','Redness, pus or a bad smell: see a health worker today.'],
      sw:['Weka kitovu kisafi na kikavu. Nawa mikono kabla ya kukigusa.','Usiweke kitu chochote kwenye kitovu.','Kunja nepi chini ya kitovu.','Wekundu, usaha au harufu mbaya: muone mhudumu wa afya leo.']}},
  {id:'danger-baby', cat:'newborn', fmt:'video', min:1, stage:'all', icons:['bottle','bolt','wind','thermo'],
   t:{en:'Danger signs in babies',sw:'Dalili za hatari kwa mtoto'},
   s:{en:['Not able to breastfeed, or vomiting everything.','Fits, or very sleepy and hard to wake.','Fast breathing, or the chest pulling in.','Fever or feeling cold, especially before 2 months: go to the facility now.'],
      sw:['Hawezi kunyonya, au anatapika kila kitu.','Degedege, au amelegea na ni vigumu kumwamsha.','Anapumua haraka, au kifua kinavutika ndani.','Homa au baridi, hasa kabla ya miezi 2: nenda kituoni sasa.']}},
  {id:'hygiene', cat:'newborn', fmt:'guide', min:2, stage:'all', icons:['hand','drop','home','moon'],
   t:{en:'Handwashing and safe water',sw:'Kunawa mikono na maji salama'},
   s:{en:['Wash hands with soap after the toilet and before feeding or cooking.','Boil or treat drinking water for the family.',"Keep baby's cups, spoons and cloths clean.",'Sleep under a treated mosquito net with your baby.'],
      sw:['Nawa mikono kwa sabuni baada ya choo na kabla ya kulisha au kupika.','Chemsha au tibu maji ya kunywa ya familia.','Weka vikombe, vijiko na vitambaa vya mtoto safi.','Lala na mtoto ndani ya chandarua chenye dawa.']}},
  {id:'spacing', cat:'nutri', fmt:'guide', min:2, stage:'baby', icons:['cal','heart','chat','shield'],
   t:{en:'Spacing your next pregnancy',sw:'Kupanga uzazi'},
   s:{en:['Waiting at least 2 years before the next pregnancy is healthier for you and your baby.','Breastfeeding alone is not reliable protection after 6 months or once your period returns.','Ask about family planning at your postnatal or child clinic visit.','Many methods are safe while breastfeeding.'],
      sw:['Kusubiri angalau miaka 2 kabla ya ujauzito mwingine ni bora kwako na kwa mtoto.','Kunyonyesha pekee si kinga ya kuaminika baada ya miezi 6 au hedhi ikirudi.','Uliza kuhusu uzazi wa mpango kliniki ya baada ya kujifungua au ya mtoto.','Njia nyingi ni salama wakati wa kunyonyesha.']}},
  {id:'sleep-preg', cat:'preg', fmt:'guide', min:2, stage:'pregnant', icons:['moon','heart','home','sun'],
   t:{en:'Sleeping well in pregnancy',sw:'Kulala vizuri wakati wa ujauzito'},
   s:{en:['From 28 weeks, go to sleep on your side, left or right.','If you wake up on your back, just turn onto your side.','Sleep under a treated mosquito net every night.','Rest in the shade in the day when you can.'],
      sw:['Kuanzia wiki 28, lala kwa ubavu, kushoto au kulia.','Ukiamka umelala chali, geuka tu ulale kwa ubavu.','Lala ndani ya chandarua chenye dawa kila usiku.','Pumzika kivulini mchana unapoweza.']}},
  {id:'bp-preg', cat:'preg', fmt:'guide', min:2, stage:'pregnant', icons:['heart','act','alert','cal'],
   t:{en:'Blood pressure in pregnancy',sw:'Shinikizo la damu wakati wa ujauzito'},
   s:{en:['High blood pressure can come with no signs at all. Have it measured.','140/90 or higher: see a health worker within 24 hours.','High blood pressure with headache, blurred vision, pain under the ribs or a swollen face: go now.','From 20 weeks, have it measured every week by your CHW or clinic.'],
      sw:['Shinikizo la juu linaweza kuja bila dalili yoyote. Pimwa.','140/90 au zaidi: muone mhudumu wa afya ndani ya saa 24.','Shinikizo la juu pamoja na kichwa kuuma, kuona ukungu, maumivu chini ya mbavu au uso kuvimba: nenda sasa.','Kuanzia wiki 20, pimwa kila wiki na mhudumu wa jamii au kliniki.']}},
  {id:'bf-positions', cat:'feed', fmt:'guide', min:2, stage:'all', icons:['baby','heart','moon','users'],
   t:{en:'Breastfeeding positions',sw:'Mikao ya kunyonyesha'},
   s:{en:['Cradle hold: baby\'s whole body faces you, ear, shoulder and hip in a line.','Cross-cradle hold: your other arm supports the neck and shoulders. Good for newborns.','Lying on your side helps after a caesarean or at night. Keep pillows away from baby.','Twins: hold one baby under each arm, on a pillow.'],
      sw:['Mkao wa kubeba: mwili wote wa mtoto unakuelekea, sikio, bega na nyonga katika mstari mmoja.','Mkao wa kubeba kwa mkono mwingine: mkono wako mwingine unashika shingo na mabega. Unafaa kwa watoto wachanga.','Kulala kwa ubavu kunasaidia baada ya upasuaji au usiku. Weka mito mbali na mtoto.','Mapacha: beba mtoto mmoja chini ya kila mkono, juu ya mto.']}},
  {id:'expressing', cat:'feed', fmt:'guide', min:3, stage:'all', icons:['hand','drop','clock','baby'],
   t:{en:'Expressing milk by hand',sw:'Kukamua maziwa kwa mkono'},
   s:{en:['Wash your hands and use a clean, wide cup.','Put your thumb and finger at the edge of the dark area, press back, then together. Do not squeeze the nipple.','Cover the milk and keep it cool. Use it within 6 hours.','Feed from a small open cup, with baby sitting up. Do not use a bottle.'],
      sw:['Nawa mikono na tumia kikombe kisafi na kipana.','Weka kidole gumba na kidole kingine pembeni mwa sehemu nyeusi, bonyeza kuelekea ndani, kisha bana. Usibane chuchu.','Funika maziwa na yaweke mahali penye ubaridi. Yatumie ndani ya saa 6.','Mlishe kwa kikombe kidogo kilicho wazi, mtoto akiwa amekaa wima. Usitumie chupa.']}},
  {id:'safe-sleep', cat:'newborn', fmt:'guide', min:2, stage:'all', icons:['moon','baby','home','shield'],
   t:{en:'Safe sleep for your baby',sw:'Usingizi salama kwa mtoto'},
   s:{en:['Lay baby on the back for every sleep, on a firm, flat place.','Keep pillows, toys and heavy blankets away from baby\'s face.','Keep baby close, in the same room, under a treated net.','Nobody smokes in the house or near baby.'],
      sw:['Mlaze mtoto chali kila anapolala, mahali pagumu na tambarare.','Weka mito, vitu vya kuchezea na blanketi nzito mbali na uso wa mtoto.','Mweke mtoto karibu, chumba kimoja nawe, ndani ya chandarua chenye dawa.','Mtu yeyote asivute sigara ndani ya nyumba wala karibu na mtoto.']}},
  {id:'kmc', cat:'newborn', fmt:'guide', min:3, stage:'all', icons:['heart','baby','users','clock'],
   t:{en:'Kangaroo care for small babies',sw:'Malezi ya kangaruu kwa watoto wadogo'},
   s:{en:['A small or early baby stays warm best skin-to-skin, upright on your chest, in a nappy and hat.','Tie a kanga around you both so baby is held safely, face free.','Your partner or a grandmother can take turns.','Breastfeed often, at least every 2 to 3 hours.'],
      sw:['Mtoto mdogo au aliyezaliwa kabla ya wakati hupata joto zaidi akiwa ngozi kwa ngozi, wima kifuani kwako, akiwa na nepi na kofia.','Funga kanga kuwazunguka wote wawili ili mtoto akae salama, uso wazi.','Mwenzako au bibi anaweza kupokezana nawe.','Mnyonyeshe mara nyingi, angalau kila saa 2 hadi 3.']}},
];

const READY = [
  {k:'facility', en:'Facility chosen for the birth', sw:'Kituo cha kujifungulia kimechaguliwa'},
  {k:'transport',en:'Transport planned, money saved', sw:'Usafiri umepangwa, akiba ipo'},
  {k:'companion',en:'Birth companion chosen', sw:'Msindikizaji amechaguliwa'},
  {k:'cloths',   en:'Clean cloths and baby clothes packed', sw:'Vitambaa safi na nguo za mtoto vimeandaliwa'},
  {k:'card',     en:'Clinic card in the bag', sw:'Kadi ya kliniki iko kwenye begi'},
  {k:'net',      en:'Treated mosquito net ready for baby', sw:'Chandarua chenye dawa kiko tayari kwa mtoto'},
];

// Exercise after birth (shown in baby mode)
const EX_POST = [{n:'Pelvic floor squeezes',d:'3 sets of 10, from the first days after birth',f:'sit'},{n:'Short walks',d:'Start with 5–10 minutes and build up slowly',f:'walk'},{n:'Belly breathing',d:'5 minutes, gently drawing your belly in as you breathe out',f:'sit'},{n:'Gentle pelvic tilts',d:'10 slow rounds on hands and knees, once bleeding is lighter',f:'cat'}];

// ---------- simulated assistant (scripted answers; no live AI) ----------
const INTENTS = [
  {k:['harm','kill myself','suicide','kujidhuru','kujiua'], urgent:'red',
   en:'Thank you for telling me. Thoughts of harming yourself or your baby are a sign you need support today, and help works. Please go to the health facility now or call your health worker, and ask someone you trust to stay with you.',
   sw:'Asante kwa kuniambia. Mawazo ya kujidhuru au kumdhuru mtoto ni ishara kwamba unahitaji msaada leo, na msaada unasaidia. Tafadhali nenda kituo cha afya sasa au mpigie mhudumu wako wa afya, na muombe mtu unayemwamini akae nawe.'},
  {k:['blood pressure','pressure','bp','shinikizo','presha'], urgent:'yellow',
   en:'Blood pressure of 140/90 or more needs a health worker within 24 hours. 160/110 or more, or 140/90 with a severe headache, blurred vision, pain high in the belly or swelling, means go to the facility now. Log your weekly reading on the Health tab so a slow rise is noticed.',
   sw:'Shinikizo la damu la 140/90 au zaidi linahitaji mhudumu wa afya ndani ya saa 24. 160/110 au zaidi, au 140/90 pamoja na kichwa kuuma sana, kuona ukungu, maumivu juu ya tumbo au kuvimba, nenda kituoni sasa. Andika kipimo chako cha kila wiki kwenye Afya ili kupanda polepole kugundulike.'},
  {k:['bleed','blood','damu'], urgent:'red',
   en:'Bleeding from the vagina in pregnancy, or heavy bleeding after birth, needs urgent care. Go to the health facility now and ask someone to go with you.',
   sw:'Kutokwa damu ukeni wakati wa ujauzito, au damu nyingi baada ya kujifungua, kunahitaji huduma ya haraka. Nenda kituo cha afya sasa na muombe mtu akusindikize.'},
  {k:['fit','convuls','degedege','seizure'], urgent:'red',
   en:'Fits in a mother or a baby are an emergency. Go to the health facility now. Keep the person on their side and do not put anything in their mouth.',
   sw:'Degedege kwa mama au mtoto ni dharura. Nenda kituo cha afya sasa. Mlaze upande mmoja na usiweke kitu mdomoni.'},
  {k:['breath','pumu','kupumua','chest'], urgent:'red',
   en:'Fast or difficult breathing, or a chest that pulls in, needs urgent care. Go to the health facility now.',
   sw:'Kupumua haraka au kwa shida, au kifua kuvutika ndani, kunahitaji huduma ya haraka. Nenda kituo cha afya sasa.'},
  {k:['headache','vision','blurr','kichwa','ukungu'], urgent:'red',
   en:'A severe headache, especially with blurred vision or swelling, can be a sign of high blood pressure in pregnancy or after birth. Go to the facility now to have your blood pressure checked.',
   sw:'Kichwa kuuma sana, hasa pamoja na kuona ukungu au kuvimba, kunaweza kuwa dalili ya shinikizo la damu wakati wa ujauzito au baada ya kujifungua. Nenda kituoni sasa kupimwa shinikizo la damu.'},
  {k:['fever','hot','homa','joto'], urgent:'yellow',
   en:'A baby under 2 months with a fever needs care now: go to the health facility. An older baby with a fever should see a health worker today, and sooner if they cannot feed, are very sleepy or have fits. Keep breastfeeding often. A mother with a fever should also see a health worker today.',
   sw:'Mtoto chini ya miezi 2 mwenye homa anahitaji huduma sasa: nenda kituo cha afya. Mtoto mkubwa zaidi mwenye homa aonwe na mhudumu wa afya leo, na mapema zaidi kama hawezi kunyonya, amelegea au ana degedege. Endelea kunyonyesha mara kwa mara. Mama mwenye homa pia aonwe na mhudumu wa afya leo.'},
  {k:['kick','move','mateke','kucheza','anacheza'], urgent:'yellow',
   en:"Noticing your baby's movements every day helps you learn their pattern. If movements are fewer than usual or have stopped, contact a health worker today. Do not wait until tomorrow.",
   sw:'Kufuatilia mateke ya mtoto kila siku kunakusaidia kujua mtindo wake. Mateke yakipungua au kukoma, wasiliana na mhudumu wa afya leo. Usisubiri kesho.'},
  {k:['yellow','jaundice','njano','manjano'], urgent:'yellow',
   en:'Yellow skin or eyes in a baby should be checked by a health worker today. Go now if the baby is less than a day old, if the palms or soles are yellow, or if the baby is not feeding well.',
   sw:'Ngozi au macho ya njano kwa mtoto yachunguzwe na mhudumu wa afya leo. Nenda sasa kama mtoto ana chini ya siku moja, viganja au nyayo ni njano, au hanyonyi vizuri.'},
  {k:['sad','low','worried','depress','anxious','huzuni','wasiwasi','stress'], urgent:'yellow',
   en:'Many mothers feel low or worried, and it is not your fault. Rest when you can and talk to someone you trust. If you have felt very sad for more than two weeks, tell your health worker. They can help.',
   sw:'Akina mama wengi huhisi huzuni au wasiwasi, na si kosa lako. Pumzika unapoweza na ongea na mtu unayemwamini. Ukihisi huzuni kubwa kwa zaidi ya wiki mbili, mwambie mhudumu wa afya. Wanaweza kukusaidia.'},
  {k:['cry','crying','analia','kulia'], urgent:null,
   en:'Babies cry to say they are hungry, tired, wet or want to be held. Try a feed, a clean nappy, skin-to-skin and gentle rocking. If the cry sounds very different from usual, or comes with fever or poor feeding, see a health worker today.',
   sw:'Watoto hulia kuonyesha njaa, uchovu, unyevu au kutaka kubebwa. Jaribu kunyonyesha, nepi safi, ngozi kwa ngozi na kumbembeleza. Kilio kikiwa tofauti sana na kawaida, au pamoja na homa au kutonyonya vizuri, muone mhudumu wa afya leo.'},
  {k:['breast','feed','milk','nyonyesha','maziwa','kunyonya'], urgent:null,
   en:'Breast milk alone gives your baby all the food and water they need until 6 months. Feed whenever baby wants, at least 8 times a day. Good attachment means a wide-open mouth and slow, deep sucks. If feeding hurts, ask a health worker to check the attachment.',
   sw:'Maziwa ya mama pekee yanampa mtoto chakula na maji yote anayohitaji hadi miezi 6. Nyonyesha kila mtoto anapotaka, angalau mara 8 kwa siku. Kunyonya vizuri ni mdomo wazi na mivuto ya polepole. Ikiuma, muombe mhudumu wa afya aangalie.'},
  {k:['sleep','usingizi','kulala'], urgent:null,
   en:'Lay your baby on their back to sleep, on a firm surface, in your room and under a treated mosquito net. Keep blankets away from the face.',
   sw:'Mlaze mtoto chali, mahali pagumu, chumbani mwako na ndani ya chandarua chenye dawa. Weka blanketi mbali na uso wake.'},
  {k:['vaccin','chanjo','immun','injection'], urgent:null,
   en:"Vaccines protect your baby from serious illness. Bring the child health card to every visit. You can see the next due date under My Baby and in Visits.",
   sw:'Chanjo zinamkinga mtoto dhidi ya magonjwa hatari. Beba kadi ya kliniki ya mtoto kila unapoenda. Tarehe ya chanjo ijayo iko kwenye Mtoto wangu na Kliniki.'},
  {k:['cord','kitovu'], urgent:null,
   en:'Keep the cord clean and dry and put nothing on it. Fold the nappy below it. Redness, pus or a bad smell needs a health worker today.',
   sw:'Weka kitovu kisafi na kikavu na usiweke kitu chochote. Kunja nepi chini yake. Wekundu, usaha au harufu mbaya: muone mhudumu wa afya leo.'},
  {k:['eat','food','iron','chakula','kula','lishe','diet'], urgent:null,
   en:'Try to include beans or groundnuts, dark green leaves and small fish like dagaa each day, with a fruit to help your body use iron. Take your iron and folic acid tablet as prescribed.',
   sw:'Jaribu kula maharage au karanga, mboga za majani na samaki wadogo kama dagaa kila siku, pamoja na tunda kusaidia mwili kutumia madini ya chuma. Meza kidonge cha madini ya chuma na foliki kama ulivyoandikiwa.'},
  {k:['family planning','spacing','contracept','uzazi wa mpango'], urgent:null,
   en:'Waiting at least 2 years before your next pregnancy is healthier for you and your baby. Many family planning methods are safe while breastfeeding. Ask at your next postnatal or child clinic visit.',
   sw:'Kusubiri angalau miaka 2 kabla ya ujauzito mwingine ni bora kwako na kwa mtoto. Njia nyingi za uzazi wa mpango ni salama wakati wa kunyonyesha. Uliza kliniki ijayo.'},
];
const INTENT_DEFAULT = {urgent:null,
  en:'I can help with questions about pregnancy, getting ready for birth, feeding and caring for your baby. Try one of the suggestions below, or add your question to your list for the next visit.',
  sw:'Ninaweza kusaidia kwa maswali kuhusu ujauzito, maandalizi ya kujifungua, ulishaji na matunzo ya mtoto. Jaribu mojawapo ya mapendekezo hapa chini, au ongeza swali lako kwenye orodha ya kliniki ijayo.'};

// ---------- content-kit asset IDs: the app shows the delivered picture <ASSET>-P<step> when present
const LESSON_ASSET = {'danger-preg':'PR-DANGER','birth-plan':'PR-PLAN','kicks':'PR-KICKS','labour':'PR-LABOUR','sleep-preg':'PR-SLEEP','bp-preg':'PR-BP',
  'eat-well':'NU-EAT','ifa':'NU-IFA','mood':'NU-MOOD','spacing':'NU-SPACE','breastfeed':'BF-FIRST','attach':'BF-LATCH','solids':'BF-SOLIDS',
  'bf-positions':'BF-POS','expressing':'BF-EXP','warm':'NB-WARM','cord':'NB-CORD','danger-baby':'NB-DANGER','hygiene':'NB-HYG','safe-sleep':'NB-SLEEP','kmc':'NB-KMC'};

// ---------- 2 quick questions after each lesson (o = options, a = index of the right answer)
const QUIZ = {
  'danger-preg':[{q:{en:'You see bleeding from the vagina. What do you do?',sw:'Unaona damu ikitoka ukeni. Ufanye nini?'},o:[{en:'Go to a facility now',sw:'Nenda kituoni sasa'},{en:'Rest and wait until tomorrow',sw:'Pumzika na usubiri hadi kesho'},{en:'Drink herbs',sw:'Kunywa dawa za mitishamba'}],a:0,why:{en:'Bleeding in pregnancy is a danger sign. Go now.',sw:'Kutokwa damu wakati wa ujauzito ni dalili ya hatari. Nenda sasa.'}},
                {q:{en:'Water is leaking but there is no pain. What do you do?',sw:'Maji yanatoka lakini hakuna maumivu. Ufanye nini?'},o:[{en:'Wait for the pain to start',sw:'Subiri maumivu yaanze'},{en:'Go to a facility now',sw:'Nenda kituoni sasa'},{en:'Lie down at home',sw:'Lala nyumbani'}],a:1,why:{en:'Leaking water is a danger sign, even without pain.',sw:'Maji kutoka ni dalili ya hatari, hata bila maumivu.'}}],
  'birth-plan':[{q:{en:'When should you plan transport for the birth?',sw:'Upange usafiri wa kujifungua lini?'},o:[{en:'When labour starts',sw:'Uchungu ukianza'},{en:'Weeks before, and save money',sw:'Wiki kadhaa kabla, na weka akiba'}],a:1,why:{en:'Plan early so you can leave quickly, day or night.',sw:'Panga mapema ili uondoke haraka, mchana au usiku.'}},
                {q:{en:'Which of these goes in your bag?',sw:'Kipi kati ya hivi kiwe kwenye begi lako?'},o:[{en:'Clinic card and clean cloths',sw:'Kadi ya kliniki na vitambaa safi'},{en:'A feeding bottle',sw:'Chupa ya kunyonyeshea'}],a:0,why:{en:'Your card helps the midwife. Baby needs only breast milk.',sw:'Kadi yako inamsaidia mkunga. Mtoto anahitaji maziwa ya mama pekee.'}}],
  'kicks':[{q:{en:'How many kicks must you count each day?',sw:'Uhesabu mateke mangapi kila siku?'},o:[{en:'Exactly 10',sw:'10 kamili'},{en:'There is no number: know your baby\'s usual pattern',sw:'Hakuna idadi: ijue tabia ya kawaida ya mtoto wako'}],a:1,why:{en:'Learn what is usual for your baby and notice changes.',sw:'Jifunze kilicho kawaida kwa mtoto wako na tambua mabadiliko.'}},
           {q:{en:'Your baby is moving less than usual. When do you call?',sw:'Mtoto anacheza kidogo kuliko kawaida. Upige simu lini?'},o:[{en:'Today',sw:'Leo'},{en:'Next week at the clinic',sw:'Wiki ijayo kliniki'}],a:0,why:{en:'Fewer movements need a health worker the same day.',sw:'Mitikisiko michache inahitaji mhudumu wa afya siku hiyo hiyo.'}}],
  'labour':[{q:{en:'Heavy bleeding during labour is…',sw:'Kutokwa damu nyingi wakati wa uchungu ni…'},o:[{en:'Not normal: go now',sw:'Si kawaida: nenda sasa'},{en:'Part of labour',sw:'Sehemu ya uchungu'}],a:0,why:{en:'A show is a little blood with mucus. Heavy bleeding is a danger sign.',sw:'Ute wenye damu kidogo ni kawaida. Damu nyingi ni dalili ya hatari.'}},
            {q:{en:'Labour tightenings…',sw:'Mikazo ya uchungu…'},o:[{en:'Get stronger and closer together',sw:'Inaongezeka nguvu na kukaribiana'},{en:'Stay the same all day',sw:'Inabaki vilevile siku nzima'}],a:0,why:{en:'Regular tightenings that get stronger and closer mean labour has started.',sw:'Mikazo ya mara kwa mara inayoongezeka maana yake uchungu umeanza.'}}],
  'sleep-preg':[{q:{en:'From 28 weeks, how do you go to sleep?',sw:'Kuanzia wiki 28, ulale vipi?'},o:[{en:'On my side',sw:'Kwa ubavu'},{en:'Flat on my back',sw:'Chali'}],a:0,why:{en:'Going to sleep on your side is safer for the baby.',sw:'Kulala kwa ubavu ni salama zaidi kwa mtoto.'}},
                {q:{en:'You wake up on your back. What do you do?',sw:'Unaamka umelala chali. Ufanye nini?'},o:[{en:'Just turn onto your side',sw:'Geuka tu ulale kwa ubavu'},{en:'Go to the clinic',sw:'Nenda kliniki'}],a:0,why:{en:'No need to worry: just turn.',sw:'Usiwe na wasiwasi: geuka tu.'}}],
  'bp-preg':[{q:{en:'Can high blood pressure come with no signs?',sw:'Shinikizo la juu linaweza kuja bila dalili?'},o:[{en:'Yes, so have it measured',sw:'Ndiyo, kwa hiyo pimwa'},{en:'No, you always feel it',sw:'Hapana, huhisi daima'}],a:0,why:{en:'Many women feel well. Only measuring finds it.',sw:'Wanawake wengi hujisikia vizuri. Kupima tu ndiko kunakogundua.'}},
             {q:{en:'Your BP is 145/92 and you have a severe headache. What do you do?',sw:'Shinikizo lako ni 145/92 na una kichwa kikali. Ufanye nini?'},o:[{en:'Go now',sw:'Nenda sasa'},{en:'Wait a week',sw:'Subiri wiki moja'}],a:0,why:{en:'High BP with a warning symptom is a danger sign.',sw:'Shinikizo la juu pamoja na dalili ya onyo ni hatari.'}}],
  'eat-well':[{q:{en:'Which food has a lot of iron?',sw:'Chakula gani kina madini ya chuma mengi?'},o:[{en:'Beans and dark green leaves',sw:'Maharage na mboga za kijani kibichi'},{en:'White rice only',sw:'Wali mweupe pekee'}],a:0,why:{en:'Beans, mchicha and dagaa are rich and affordable.',sw:'Maharage, mchicha na dagaa ni bora na nafuu.'}},
              {q:{en:'What helps your body use iron from food?',sw:'Nini kinasaidia mwili kutumia madini ya chuma?'},o:[{en:'A fruit with the meal',sw:'Tunda pamoja na mlo'},{en:'Tea with the meal',sw:'Chai pamoja na mlo'}],a:0,why:{en:'Fruit helps; tea makes iron harder to absorb.',sw:'Tunda linasaidia; chai inazuia madini ya chuma.'}}],
  'ifa':[{q:{en:'You forgot your tablet yesterday. What do you do?',sw:'Ulisahau kidonge jana. Ufanye nini?'},o:[{en:'Take one today as usual',sw:'Meza kimoja leo kama kawaida'},{en:'Take two today',sw:'Meza viwili leo'}],a:0,why:{en:'Never take two to catch up.',sw:'Usimeze viwili kufidia.'}},
         {q:{en:'Take the tablet with…',sw:'Meza kidonge kwa…'},o:[{en:'Water or juice',sw:'Maji au juisi'},{en:'Tea or coffee',sw:'Chai au kahawa'}],a:0,why:{en:'Tea and coffee block iron.',sw:'Chai na kahawa huzuia madini ya chuma.'}}],
  'mood':[{q:{en:'You have felt very sad for more than two weeks. What do you do?',sw:'Umehisi huzuni kubwa kwa zaidi ya wiki mbili. Ufanye nini?'},o:[{en:'Tell your health worker',sw:'Mwambie mhudumu wa afya'},{en:'Keep it to yourself',sw:'Kaa nalo mwenyewe'}],a:0,why:{en:'It is common and help works. You are not alone.',sw:'Ni jambo la kawaida na msaada unafanya kazi. Hauko peke yako.'}},
          {q:{en:'Thoughts of harming yourself or your baby mean…',sw:'Mawazo ya kujidhuru au kumdhuru mtoto maana yake…'},o:[{en:'Get help today',sw:'Pata msaada leo'},{en:'Wait and see',sw:'Subiri uone'}],a:0,why:{en:'Call your clinic or someone you trust today.',sw:'Piga simu kliniki au mtu unayemwamini leo.'}}],
  'spacing':[{q:{en:'How long is healthier to wait before the next pregnancy?',sw:'Ni bora kusubiri muda gani kabla ya ujauzito mwingine?'},o:[{en:'At least 2 years',sw:'Angalau miaka 2'},{en:'3 months',sw:'Miezi 3'}],a:0,why:{en:'Spacing protects you and your next baby.',sw:'Kupanga uzazi kunakulinda wewe na mtoto ajaye.'}},
             {q:{en:'Is breastfeeding alone reliable protection after 6 months?',sw:'Kunyonyesha pekee ni kinga ya kuaminika baada ya miezi 6?'},o:[{en:'No',sw:'Hapana'},{en:'Yes',sw:'Ndiyo'}],a:0,why:{en:'Ask about a method at your clinic visit.',sw:'Uliza kuhusu njia kliniki.'}}],
  'breastfeed':[{q:{en:'When should breastfeeding start?',sw:'Kunyonyesha kuanze lini?'},o:[{en:'Within one hour of birth',sw:'Ndani ya saa moja baada ya kuzaliwa'},{en:'After the first day',sw:'Baada ya siku ya kwanza'}],a:0,why:{en:'The first yellow milk protects your baby.',sw:'Maziwa ya kwanza ya njano yanamlinda mtoto.'}},
                {q:{en:'Before 6 months, does baby need water?',sw:'Kabla ya miezi 6, mtoto anahitaji maji?'},o:[{en:'No, breast milk only',sw:'Hapana, maziwa ya mama pekee'},{en:'Yes, when it is hot',sw:'Ndiyo, kukiwa na joto'}],a:0,why:{en:'Breast milk has all the water baby needs.',sw:'Maziwa ya mama yana maji yote anayohitaji mtoto.'}}],
  'attach':[{q:{en:'In a good latch, baby\'s mouth is…',sw:'Mtoto akinyonya vizuri, mdomo wake…'},o:[{en:'Wide open, chin touching the breast',sw:'Uko wazi sana, kidevu kinagusa titi'},{en:'On the nipple only',sw:'Uko kwenye chuchu tu'}],a:0,why:{en:'A deep latch prevents pain and gives more milk.',sw:'Kunyonya kwa kina huzuia maumivu na kutoa maziwa zaidi.'}},
            {q:{en:'Your nipples are cracked and painful. What helps?',sw:'Chuchu zimepasuka na zinauma. Nini kinasaidia?'},o:[{en:'Ask a health worker to check the latch',sw:'Muombe mhudumu wa afya aangalie unyonyaji'},{en:'Stop breastfeeding',sw:'Acha kunyonyesha'}],a:0,why:{en:'Pain usually means the latch needs fixing.',sw:'Maumivu mara nyingi yanamaanisha unyonyaji unahitaji kurekebishwa.'}}],
  'solids':[{q:{en:'At 6 months, porridge should be…',sw:'Kwa miezi 6, uji uwe…'},o:[{en:'Thick enough to stay on a spoon',sw:'Mzito wa kubaki kwenye kijiko'},{en:'Thin and watery',sw:'Mwepesi wa maji'}],a:0,why:{en:'Thick porridge gives baby more energy.',sw:'Uji mzito unampa mtoto nguvu zaidi.'}},
            {q:{en:'After 6 months, does breastfeeding stop?',sw:'Baada ya miezi 6, kunyonyesha kuache?'},o:[{en:'No, keep breastfeeding',sw:'Hapana, endelea kunyonyesha'},{en:'Yes',sw:'Ndiyo'}],a:0,why:{en:'Keep breastfeeding to 2 years and beyond.',sw:'Endelea kunyonyesha hadi miaka 2 na zaidi.'}}],
  'bf-positions':[{q:{en:'In a good position, baby\'s ear, shoulder and hip are…',sw:'Katika mkao mzuri, sikio, bega na nyonga ya mtoto viko…'},o:[{en:'In a straight line',sw:'Katika mstari mmoja'},{en:'Twisted',sw:'Vimepinda'}],a:0,why:{en:'A straight line makes swallowing easy.',sw:'Mstari mmoja unarahisisha kumeza.'}},
                  {q:{en:'Feeding lying down, where are the pillows?',sw:'Ukinyonyesha umelala, mito iwe wapi?'},o:[{en:'Away from baby\'s face',sw:'Mbali na uso wa mtoto'},{en:'Around baby\'s head',sw:'Kuzunguka kichwa cha mtoto'}],a:0,why:{en:'Soft things near the face are not safe.',sw:'Vitu laini karibu na uso si salama.'}}],
  'expressing':[{q:{en:'Feed expressed milk with…',sw:'Mlishe maziwa yaliyokamuliwa kwa…'},o:[{en:'A small open cup',sw:'Kikombe kidogo kilicho wazi'},{en:'A bottle',sw:'Chupa'}],a:0,why:{en:'Cups are easier to keep clean than bottles.',sw:'Vikombe ni rahisi kusafisha kuliko chupa.'}},
                {q:{en:'Where do you press?',sw:'Ubonyeze wapi?'},o:[{en:'At the edge of the dark area',sw:'Pembeni mwa sehemu nyeusi'},{en:'On the nipple',sw:'Kwenye chuchu'}],a:0,why:{en:'Squeezing the nipple hurts and gives little milk.',sw:'Kubana chuchu kunauma na kunatoa maziwa kidogo.'}}],
  'warm':[{q:{en:'When should the first bath be?',sw:'Kuoga mara ya kwanza kuwe lini?'},o:[{en:'After at least 24 hours',sw:'Baada ya angalau saa 24'},{en:'Straight after birth',sw:'Mara baada ya kuzaliwa'}],a:0,why:{en:'Newborns lose heat fast.',sw:'Watoto wachanga hupoteza joto haraka.'}},
          {q:{en:'Baby\'s hands and feet feel cold. What do you do?',sw:'Mikono na miguu ya mtoto ni baridi. Ufanye nini?'},o:[{en:'Warm baby skin-to-skin and see a health worker today',sw:'Mpe joto ngozi kwa ngozi na muone mhudumu wa afya leo'},{en:'Put baby near the fire',sw:'Mweke mtoto karibu na moto'}],a:0,why:{en:'Skin-to-skin warms baby safely.',sw:'Ngozi kwa ngozi humpa mtoto joto kwa usalama.'}}],
  'cord':[{q:{en:'What do you put on the cord?',sw:'Upake nini kwenye kitovu?'},o:[{en:'Nothing: keep it clean and dry',sw:'Hakuna: kiweke safi na kikavu'},{en:'Ash or oil',sw:'Majivu au mafuta'}],a:0,why:{en:'Things put on the cord can cause infection.',sw:'Vitu vinavyopakwa kwenye kitovu vinaweza kuleta maambukizi.'}},
          {q:{en:'The cord is red and smells bad. What do you do?',sw:'Kitovu ni chekundu na kina harufu mbaya. Ufanye nini?'},o:[{en:'See a health worker today',sw:'Muone mhudumu wa afya leo'},{en:'Wait a week',sw:'Subiri wiki moja'}],a:0,why:{en:'These are signs of infection.',sw:'Hizi ni dalili za maambukizi.'}}],
  'danger-baby':[{q:{en:'A 3-week-old baby feels hot. What do you do?',sw:'Mtoto wa wiki 3 ana homa. Ufanye nini?'},o:[{en:'Go to a facility now',sw:'Nenda kituoni sasa'},{en:'Wait until tomorrow',sw:'Subiri hadi kesho'}],a:0,why:{en:'Fever before 2 months is a danger sign.',sw:'Homa kabla ya miezi 2 ni dalili ya hatari.'}},
                 {q:{en:'Baby\'s chest pulls in when breathing. This is…',sw:'Kifua cha mtoto kinavutika ndani anapopumua. Hii ni…'},o:[{en:'A danger sign: go now',sw:'Dalili ya hatari: nenda sasa'},{en:'Normal',sw:'Kawaida'}],a:0,why:{en:'Chest indrawing means baby is working hard to breathe.',sw:'Kifua kuvutika maana yake mtoto anapumua kwa shida.'}}],
  'hygiene':[{q:{en:'When do you wash hands with soap?',sw:'Unawe mikono kwa sabuni lini?'},o:[{en:'After the toilet and before feeding or cooking',sw:'Baada ya choo na kabla ya kulisha au kupika'},{en:'Only when they look dirty',sw:'Zikionekana chafu tu'}],a:0,why:{en:'Clean hands prevent diarrhoea.',sw:'Mikono safi huzuia kuharisha.'}},
             {q:{en:'Drinking water for the family should be…',sw:'Maji ya kunywa ya familia yawe…'},o:[{en:'Boiled or treated',sw:'Yamechemshwa au kutibiwa'},{en:'Straight from the river',sw:'Moja kwa moja kutoka mtoni'}],a:0,why:{en:'Safe water protects the whole family.',sw:'Maji salama yanailinda familia nzima.'}}],
  'safe-sleep':[{q:{en:'How should baby sleep?',sw:'Mtoto alale vipi?'},o:[{en:'On the back',sw:'Chali'},{en:'On the tummy',sw:'Kifudifudi'}],a:0,why:{en:'On the back, every sleep, is safest.',sw:'Chali, kila anapolala, ni salama zaidi.'}},
                {q:{en:'What should be near baby\'s face when sleeping?',sw:'Nini kiwe karibu na uso wa mtoto akilala?'},o:[{en:'Nothing soft',sw:'Hakuna kitu laini'},{en:'A pillow',sw:'Mto'}],a:0,why:{en:'Pillows and blankets can block breathing.',sw:'Mito na blanketi vinaweza kuzuia kupumua.'}}],
  'kmc':[{q:{en:'In kangaroo care, the baby is…',sw:'Katika malezi ya kangaruu, mtoto yuko…'},o:[{en:'Skin-to-skin, upright on the chest',sw:'Ngozi kwa ngozi, wima kifuani'},{en:'Wrapped in a blanket on the bed',sw:'Amefungwa blanketi kitandani'}],a:0,why:{en:'Your body keeps a small baby warm.',sw:'Mwili wako humpa mtoto mdogo joto.'}},
         {q:{en:'How often should a small baby feed?',sw:'Mtoto mdogo anyonye mara ngapi?'},o:[{en:'At least every 2 to 3 hours',sw:'Angalau kila saa 2 hadi 3'},{en:'Twice a day',sw:'Mara mbili kwa siku'}],a:0,why:{en:'Small babies need frequent feeds to grow.',sw:'Watoto wadogo wanahitaji kunyonya mara nyingi ili wakue.'}}],
};

// ---------- lesson page parts (MA-56): key facts at the top, related lessons, sources, clinical review.
// Facts only restate the lesson's own steps (no new advice). Kiswahili needs native review like the rest.
const LESSON_FACTS = {
  'danger-preg':[{en:'Bleeding, fits, severe headache, blurred vision or leaking water: go to the facility now.',sw:'Damu, degedege, kichwa kuuma sana, kuona ukungu au maji kutoka: nenda kituoni sasa.'},
                 {en:'Fever, or baby moving less: see a health worker today.',sw:'Homa, au mtoto kucheza kidogo: muone mhudumu wa afya leo.'}],
  'birth-plan':[{en:'Choose your facility, transport and birth companion before labour starts.',sw:'Chagua kituo, usafiri na msindikizaji kabla uchungu haujaanza.'},
                {en:'Keep your bag ready with clean cloths, baby clothes and your clinic card.',sw:'Weka begi tayari lenye vitambaa safi, nguo za mtoto na kadi ya kliniki.'}],
  'kicks':[{en:"From about 28 weeks, learn your baby's usual pattern of movements.",sw:'Kuanzia wiki 28 hivi, jifunze tabia ya kawaida ya mitikisiko ya mtoto wako.'},
           {en:'Fewer movements than usual: contact a health worker today, not tomorrow.',sw:'Mitikisiko michache kuliko kawaida: wasiliana na mhudumu wa afya leo, si kesho.'}],
  'labour':[{en:'Regular tightenings that get stronger and closer mean labour is starting.',sw:'Mikazo ya mara kwa mara inayoongezeka nguvu na kukaribiana maana yake uchungu unaanza.'},
            {en:'Water breaking: go to the facility, even without pain. Heavy bleeding: go now.',sw:'Maji kupasuka: nenda kituoni, hata bila maumivu. Damu nyingi: nenda sasa.'}],
  'eat-well':[{en:'Every day, add beans or groundnuts, dark green leaves and small fish.',sw:'Kila siku, ongeza maharage au karanga, mboga za kijani kibichi na samaki wadogo.'},
              {en:'A fruit with meals helps your body use iron.',sw:'Tunda pamoja na mlo husaidia mwili kutumia madini ya chuma.'}],
  'ifa':[{en:'Take one tablet a day with water or juice, not tea or coffee.',sw:'Meza kidonge kimoja kwa siku kwa maji au juisi, si chai wala kahawa.'},
         {en:'Forgot a day? Continue the next day. Never take two.',sw:'Umesahau siku moja? Endelea siku inayofuata. Usimeze viwili.'}],
  'mood':[{en:'Feeling very sad for more than two weeks: tell your health worker.',sw:'Huzuni kubwa kwa zaidi ya wiki mbili: mwambie mhudumu wa afya.'},
          {en:'Thoughts of harming yourself or your baby: get help today.',sw:'Mawazo ya kujidhuru au kumdhuru mtoto: pata msaada leo.'}],
  'breastfeed':[{en:'Start breastfeeding within one hour of birth, skin-to-skin.',sw:'Anza kunyonyesha ndani ya saa moja baada ya kuzaliwa, ngozi kwa ngozi.'},
                {en:'Breast milk only until 6 months, at least 8 feeds a day.',sw:'Maziwa ya mama pekee hadi miezi 6, angalau mara 8 kwa siku.'}],
  'attach':[{en:'Mouth wide open, chin on the breast, slow deep sucks.',sw:'Mdomo wazi sana, kidevu kwenye titi, kunyonya taratibu kwa kina.'},
            {en:'Pain or cracked nipples: ask a health worker to check the attachment.',sw:'Maumivu au chuchu kupasuka: muombe mhudumu wa afya aangalie unyonyaji.'}],
  'solids':[{en:'At 6 months, keep breastfeeding and add thick porridge and soft foods.',sw:'Kwa miezi 6, endelea kunyonyesha na ongeza uji mzito na vyakula laini.'},
            {en:'Use clean hands, a cup and a spoon. Avoid feeding bottles.',sw:'Tumia mikono safi, kikombe na kijiko. Epuka chupa za kunyonyeshea.'}],
  'warm':[{en:'Skin-to-skin, a hat and one more layer keep your baby warm.',sw:'Ngozi kwa ngozi, kofia na nguo moja zaidi humpa mtoto joto.'},
          {en:'Cold hands, feet and body: warm baby and see a health worker today.',sw:'Mikono, miguu na mwili baridi: mpe mtoto joto na muone mhudumu wa afya leo.'}],
  'cord':[{en:'Keep the cord clean and dry, and put nothing on it.',sw:'Kiweke kitovu kisafi na kikavu, na usipake chochote.'},
          {en:'Redness, pus or a bad smell: see a health worker today.',sw:'Wekundu, usaha au harufu mbaya: muone mhudumu wa afya leo.'}],
  'danger-baby':[{en:'Not feeding, fits, very sleepy, fast breathing or chest pulling in: go now.',sw:'Hanyonyi, degedege, usingizi mzito, kupumua haraka au kifua kuvutika: nenda sasa.'},
                 {en:'Fever or feeling cold before 2 months: go to the facility now.',sw:'Homa au baridi kabla ya miezi 2: nenda kituoni sasa.'}],
  'hygiene':[{en:'Wash hands with soap after the toilet and before feeding or cooking.',sw:'Nawa mikono kwa sabuni baada ya choo na kabla ya kulisha au kupika.'},
             {en:'Boil or treat drinking water, and sleep under a treated net.',sw:'Chemsha au tibu maji ya kunywa, na lala ndani ya chandarua chenye dawa.'}],
  'spacing':[{en:'Waiting at least 2 years before the next pregnancy is healthier.',sw:'Kusubiri angalau miaka 2 kabla ya ujauzito mwingine ni bora kwa afya.'},
             {en:'Ask about family planning at your postnatal or child clinic visit.',sw:'Uliza kuhusu uzazi wa mpango kliniki ya baada ya kujifungua au ya mtoto.'}],
  'sleep-preg':[{en:'From 28 weeks, go to sleep on your side.',sw:'Kuanzia wiki 28, lala kwa ubavu.'},
                {en:'Woke up on your back? Just turn onto your side.',sw:'Umeamka chali? Geuka tu ulale kwa ubavu.'}],
  'bp-preg':[{en:'High blood pressure can have no signs. Have it measured weekly from 20 weeks.',sw:'Shinikizo la juu linaweza kuwa bila dalili. Pimwa kila wiki kuanzia wiki 20.'},
             {en:'High pressure with headache, blurred vision or a swollen face: go now.',sw:'Shinikizo la juu pamoja na kichwa kuuma, kuona ukungu au uso kuvimba: nenda sasa.'}],
  'bf-positions':[{en:"Baby's ear, shoulder and hip in one line, whole body facing you.",sw:'Sikio, bega na nyonga ya mtoto katika mstari mmoja, mwili wote ukikutazama.'},
                  {en:"Feeding lying down? Keep pillows away from baby's face.",sw:'Unanyonyesha umelala? Weka mito mbali na uso wa mtoto.'}],
  'expressing':[{en:'Press at the edge of the dark area. Never squeeze the nipple.',sw:'Bonyeza pembeni mwa sehemu nyeusi. Usibane chuchu.'},
                {en:'Cover the milk, keep it cool, and use it within 6 hours.',sw:'Funika maziwa, yaweke mahali penye ubaridi, na yatumie ndani ya saa 6.'}],
  'safe-sleep':[{en:'Lay baby on the back for every sleep, on a firm, flat place.',sw:'Mlaze mtoto chali kila anapolala, mahali pagumu na tambarare.'},
                {en:'Keep pillows and heavy blankets away, and no smoking near baby.',sw:'Weka mito na blanketi nzito mbali, na mtu asivute sigara karibu na mtoto.'}],
  'kmc':[{en:'A small baby stays warm best skin-to-skin, upright on your chest.',sw:'Mtoto mdogo hupata joto bora ngozi kwa ngozi, wima kifuani mwako.'},
         {en:'Breastfeed often, at least every 2 to 3 hours.',sw:'Mnyonyeshe mara nyingi, angalau kila saa 2 hadi 3.'}],
};
const LESSON_RELATED = {
  'danger-preg':['bp-preg','kicks','labour'], 'birth-plan':['labour','danger-preg','breastfeed'], 'kicks':['danger-preg','sleep-preg'],
  'labour':['birth-plan','danger-preg'], 'eat-well':['ifa','solids'], 'ifa':['eat-well','danger-preg'], 'mood':['spacing','eat-well'],
  'breastfeed':['attach','bf-positions','expressing'], 'attach':['bf-positions','breastfeed','expressing'], 'solids':['eat-well','hygiene'],
  'warm':['kmc','safe-sleep','danger-baby'], 'cord':['hygiene','danger-baby'], 'danger-baby':['warm','cord','breastfeed'],
  'hygiene':['cord','solids'], 'spacing':['breastfeed','mood'], 'sleep-preg':['kicks','danger-preg'], 'bp-preg':['danger-preg','sleep-preg'],
  'bf-positions':['attach','expressing'], 'expressing':['breastfeed','kmc'], 'safe-sleep':['warm','kmc'], 'kmc':['warm','breastfeed','expressing'],
};
// Guideline catalogue. Proposed per lesson; the clinical reviewer confirms them and adds the Tanzania MoH guideline.
const SOURCES = {
  'who-anc-2016':  {t:'WHO recommendations on antenatal care for a positive pregnancy experience', y:2016},
  'who-pcpnc-2015':{t:'WHO Pregnancy, childbirth, postpartum and newborn care: a guide for essential practice (3rd ed.)', y:2015},
  'who-pnc-2022':  {t:'WHO recommendations on maternal and newborn care for a positive postnatal experience', y:2022},
  'who-imci-2014': {t:'WHO Integrated Management of Childhood Illness chart booklet', y:2014},
  'who-iycf-2021': {t:'WHO/UNICEF Infant and young child feeding counselling: an integrated course (2nd ed.)', y:2021},
  'who-cf-2023':   {t:'WHO guideline for complementary feeding of infants and young children 6–23 months of age', y:2023},
  'who-spacing-2005':{t:'Report of a WHO technical consultation on birth spacing', y:2005},
  'who-preterm-2022':{t:'WHO recommendations for care of the preterm or low-birth-weight infant', y:2022},
  'who-intrapartum-2018':{t:'WHO recommendations: intrapartum care for a positive childbirth experience', y:2018},
};
const LESSON_SOURCES = {
  'danger-preg':['who-anc-2016','who-pcpnc-2015'], 'birth-plan':['who-pcpnc-2015','who-anc-2016'], 'kicks':['who-anc-2016'],
  'labour':['who-intrapartum-2018','who-pcpnc-2015'], 'eat-well':['who-anc-2016'], 'ifa':['who-anc-2016'], 'mood':['who-pnc-2022','who-pcpnc-2015'],
  'breastfeed':['who-iycf-2021','who-pnc-2022'], 'attach':['who-iycf-2021'], 'solids':['who-cf-2023'], 'warm':['who-pnc-2022','who-pcpnc-2015'],
  'cord':['who-pnc-2022'], 'danger-baby':['who-imci-2014','who-pnc-2022'], 'hygiene':['who-imci-2014'], 'spacing':['who-spacing-2005','who-pnc-2022'],
  'sleep-preg':['who-anc-2016'], 'bp-preg':['who-anc-2016','who-pcpnc-2015'], 'bf-positions':['who-iycf-2021'], 'expressing':['who-iycf-2021'],
  'safe-sleep':[], 'kmc':['who-preterm-2022'],
};
// Clinical sign-off per lesson: {by:'reviewer role', on:'YYYY-MM-DD', due:'YYYY-MM-DD'}. Empty until the review
// happens; screens then say "Clinical review pending" rather than inventing a reviewer (guardrail 4).
const LESSON_REVIEW = {};

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

// ---------- lesson illustrations (flat SVG scenes, 240×160) ----------
const IC_ = {SK:'#8A5536', SK2:'#B07A55', WR:'#D5508F', BL:'#3A4BA8', YE:'#F2C14E', GR:'#3E9B6A', RD:'#D9483B', CR:'#FFF3E2', GY:'#AEB6C8', INK:'#1E2235', WH:'#FFFFFF', LB:'#9CC8F0', OR:'#F28C28'};
const ILL = (() => {
  const {SK,SK2,WR,BL,YE,GR,RD,CR,GY,INK,WH,LB,OR} = IC_;
  const mom = (x, y, dress=BL, w=36) => `<path d="M${x-w} 160C${x-w} ${y+52} ${x-w/2} ${y+30} ${x} ${y+30}C${x+w/2} ${y+30} ${x+w} ${y+52} ${x+w} 160Z" fill="${dress}"/><circle cx="${x}" cy="${y}" r="17" fill="${SK}"/><path d="M${x-18} ${y-1}C${x-19} ${y-27} ${x+19} ${y-27} ${x+18} ${y-1}C${x+9} ${y-11} ${x-9} ${y-11} ${x-18} ${y-1}Z" fill="${WR}"/><circle cx="${x+6}" cy="${y-1}" r="1.8" fill="${INK}"/><path d="M${x+2} ${y+7}q4 3 8 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const heart = (x, y, c=WR, s=1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4C0 -2 8 -3 8 3C8 -3 16 -2 16 4C16 10 8 14 8 16C8 14 0 10 0 4Z" fill="${c}"/>`;
  const babyFace = (x, y, r=10) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK2}"/><path d="M${x-r*.4} ${y-1}h1.5M${x+r*.3} ${y-1}h1.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
  const S = {
    mother_baby: `${mom(120,50)}<g transform="rotate(-18 116 108)"><ellipse cx="114" cy="110" rx="26" ry="14" fill="${YE}"/></g>${babyFace(134,96)}<path d="M88 126Q118 138 150 114" stroke="${SK}" stroke-width="9" fill="none" stroke-linecap="round"/>${heart(168,34)}`,
    breastfeed: `${mom(120,48)}<ellipse cx="132" cy="112" rx="32" ry="12" fill="${YE}"/>${babyFace(100,104)}<path d="M86 128Q122 140 160 116" stroke="${SK}" stroke-width="9" fill="none" stroke-linecap="round"/>${heart(62,38,WR,.9)}${heart(170,30,WR,.7)}`,
    latch: `<circle cx="160" cy="80" r="52" fill="${SK}"/><circle cx="124" cy="86" r="15" fill="#5E3722"/><circle cx="76" cy="88" r="38" fill="${SK2}"/><path d="M104 74Q122 86 104 100Z" fill="#6E2A2A"/><path d="M62 74q6-5 12 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M70 120q8 6 18 2" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="198" cy="34" r="15" fill="${GR}"/><path d="M191 34l5 5 9-10" stroke="${WH}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    mother_belly: `${mom(110,44,BL,32)}<circle cx="132" cy="112" r="28" fill="${BL}"/><circle cx="124" cy="110" r="7" fill="${SK}"/><path d="M168 96a14 14 0 0 1 0 22M176 90a24 24 0 0 1 0 34" stroke="${YE}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    lie_left: `<rect x="18" y="120" width="204" height="12" rx="6" fill="${GY}"/><ellipse cx="46" cy="110" rx="22" ry="9" fill="${WH}"/><circle cx="52" cy="96" r="15" fill="${SK}"/><path d="M36 92C36 74 66 74 66 92Z" fill="${WR}"/><ellipse cx="132" cy="110" rx="74" ry="13" fill="${BL}"/><circle cx="122" cy="94" r="22" fill="${BL}"/><path d="M110 58a16 16 0 0 1 24 0M102 48a28 28 0 0 1 40 0" stroke="${YE}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    headache: `${mom(120,62,GY)}<circle cx="100" cy="64" r="7" fill="${SK}"/><circle cx="140" cy="64" r="7" fill="${SK}"/><path d="M84 30l8 6-8 6M156 30l-8 6 8 6M114 18l6 8 6-8" stroke="${RD}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    cloud: `${mom(120,74,GY)}<g fill="#C9CEDB"><circle cx="102" cy="34" r="14"/><circle cx="122" cy="26" r="18"/><circle cx="142" cy="34" r="14"/><rect x="96" y="32" width="52" height="16" rx="8"/></g><path d="M108 56v6M122 56v8M136 56v6" stroke="${LB}" stroke-width="3" stroke-linecap="round"/>`,
    talk: `${mom(74,70,BL,28)}${mom(166,70,GR,28)}<rect x="88" y="16" width="64" height="34" rx="12" fill="${WH}"/><path d="M110 50l-6 10 14-10Z" fill="${WH}"/><circle cx="106" cy="33" r="3.5" fill="${GY}"/><circle cx="120" cy="33" r="3.5" fill="${GY}"/><circle cx="134" cy="33" r="3.5" fill="${GY}"/>`,
    plate: `<circle cx="120" cy="82" r="62" fill="#E4E7F0"/><circle cx="120" cy="82" r="52" fill="${WH}"/><path d="M120 82V30a52 52 0 0 1 45 26z" fill="#8B4A2B"/><path d="M120 82l45-26a52 52 0 0 1 0 52z" fill="${GR}"/><path d="M120 82l45 26a52 52 0 0 1-90 0z" fill="${YE}"/><path d="M120 82L75 108a52 52 0 0 1 45-78z" fill="#9AA5B1"/><path d="M196 40v84M190 40v18q6 6 12 0V40" stroke="${GY}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    greens: `<path d="M120 140V70" stroke="${GR}" stroke-width="5" stroke-linecap="round"/><g fill="${GR}"><ellipse cx="96" cy="70" rx="26" ry="12" transform="rotate(-35 96 70)"/><ellipse cx="144" cy="70" rx="26" ry="12" transform="rotate(35 144 70)"/><ellipse cx="120" cy="44" rx="14" ry="28"/></g><g fill="#2F7D52"><ellipse cx="94" cy="104" rx="24" ry="11" transform="rotate(-20 94 104)"/><ellipse cx="146" cy="104" rx="24" ry="11" transform="rotate(20 146 104)"/></g><rect x="84" y="128" width="72" height="14" rx="7" fill="${WR}"/>`,
    fish: `<g transform="translate(0 -14)"><ellipse cx="104" cy="66" rx="40" ry="16" fill="#7C8AA8"/><path d="M142 66l26-16v32z" fill="#7C8AA8"/><circle cx="80" cy="62" r="3" fill="${INK}"/></g><g transform="translate(16 40)"><ellipse cx="104" cy="66" rx="40" ry="16" fill="${GY}"/><path d="M142 66l26-16v32z" fill="${GY}"/><circle cx="80" cy="62" r="3" fill="${INK}"/></g>`,
    fruit: `<circle cx="86" cy="96" r="34" fill="${OR}"/><path d="M86 62q10-14 22-8-8 12-22 8Z" fill="${GR}"/><ellipse cx="156" cy="88" rx="30" ry="42" fill="${YE}" transform="rotate(25 156 88)"/><path d="M168 48q8-6 14 2" stroke="${GR}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    bowl: `<path d="M56 86h128a64 52 0 0 1-128 0Z" fill="${WR}"/><ellipse cx="120" cy="86" rx="64" ry="12" fill="${CR}"/><ellipse cx="104" cy="84" rx="12" ry="5" fill="#C9A26B"/><path d="M150 84l40-44" stroke="${GY}" stroke-width="6" stroke-linecap="round"/><path d="M98 58q-6-10 0-20M120 56q-6-10 0-20M142 58q-6-10 0-20" stroke="${GY}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    pill: `<rect x="44" y="52" width="88" height="70" rx="10" fill="#DDE3F0"/>${[0,1,2].map(r=>[0,1,2].map(c=>`<circle cx="${62+c*26}" cy="${70+r*18}" r="7" fill="${r*3+c<4?'#C7CDDA':WR}"/>`).join('')).join('')}<g transform="rotate(-35 174 84)"><rect x="146" y="72" width="56" height="24" rx="12" fill="${WR}"/><rect x="174" y="72" width="28" height="24" rx="12" fill="${WH}"/><rect x="174" y="72" width="10" height="24" fill="${WH}"/></g>`,
    glass: `<path d="M84 36h56l-8 104H92Z" fill="#DCEBFA" stroke="${GY}" stroke-width="3"/><path d="M88 72h48l-5 68H93Z" fill="${LB}"/><circle cx="168" cy="110" r="26" fill="${OR}"/><circle cx="168" cy="110" r="19" fill="#FFC27A"/><path d="M168 91v38M149 110h38M155 97l26 26M181 97l-26 26" stroke="${OR}" stroke-width="2"/>`,
    net: `<rect x="36" y="104" width="168" height="22" rx="6" fill="#E8D9C5"/><rect x="40" y="126" width="8" height="18" fill="#C9B79E"/><rect x="192" y="126" width="8" height="18" fill="#C9B79E"/><ellipse cx="70" cy="100" rx="20" ry="8" fill="${WH}"/><circle cx="72" cy="94" r="11" fill="${SK}"/>${babyFace(98,98,7)}<path d="M28 126C28 40 212 40 212 126" fill="rgba(255,255,255,.35)" stroke="${GY}" stroke-width="3" stroke-dasharray="5 5"/><path d="M120 22v18" stroke="${GY}" stroke-width="3"/>`,
    baby_back: `<rect x="40" y="70" width="160" height="56" rx="10" fill="none" stroke="#C9B79E" stroke-width="5"/>${[0,1,2,3,4,5,6].map(i=>`<path d="M${60+i*20} 70v56" stroke="#C9B79E" stroke-width="3"/>`).join('')}<rect x="44" y="100" width="152" height="22" rx="6" fill="#F4E6D3"/><ellipse cx="134" cy="98" rx="30" ry="12" fill="${YE}"/>${babyFace(96,94,13)}<circle cx="190" cy="30" r="14" fill="${YE}"/><circle cx="196" cy="26" r="12" fill="#EEF0F7"/>`,
    baby_hat: `<ellipse cx="120" cy="128" rx="58" ry="26" fill="${YE}"/>${babyFace(120,84,30)}<path d="M88 78C88 40 152 40 152 78Z" fill="${WR}"/><rect x="86" y="72" width="68" height="10" rx="5" fill="#B33D74"/><circle cx="120" cy="38" r="8" fill="${WH}"/>`,
    clinic: `<path d="M0 150h240" stroke="${GY}" stroke-width="3"/><rect x="60" y="56" width="120" height="94" fill="${WH}" stroke="${GY}" stroke-width="3"/><path d="M52 60L120 26l68 34Z" fill="${BL}"/><rect x="106" y="70" width="28" height="28" rx="4" fill="${RD}"/><path d="M120 76v16M112 84h16" stroke="${WH}" stroke-width="5" stroke-linecap="round"/><rect x="108" y="112" width="24" height="38" fill="${LB}"/><rect x="72" y="110" width="22" height="18" fill="${LB}"/><rect x="146" y="110" width="22" height="18" fill="${LB}"/>`,
    bus: `<path d="M0 142h240" stroke="${GY}" stroke-width="3"/><rect x="36" y="56" width="168" height="70" rx="14" fill="${YE}"/><rect x="36" y="100" width="168" height="8" fill="${GR}"/>${[0,1,2,3].map(i=>`<rect x="${50+i*36}" y="66" width="26" height="24" rx="4" fill="${LB}"/>`).join('')}<rect x="186" y="66" width="12" height="40" rx="3" fill="${LB}"/><circle cx="72" cy="128" r="14" fill="${INK}"/><circle cx="172" cy="128" r="14" fill="${INK}"/><circle cx="72" cy="128" r="5" fill="${GY}"/><circle cx="172" cy="128" r="5" fill="${GY}"/>`,
    phone: `<rect x="92" y="26" width="56" height="112" rx="12" fill="${INK}"/><rect x="98" y="38" width="44" height="84" rx="4" fill="${LB}"/><circle cx="120" cy="130" r="4" fill="${GY}"/><path d="M110 70c0 14 6 20 20 20l4-6-8-4-3 3c-4-2-6-4-8-8l3-3-4-8Z" fill="${GR}"/><path d="M162 56a24 24 0 0 1 0 40M172 46a38 38 0 0 1 0 60" stroke="${GR}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    hands: `<path d="M150 20h-40v18" stroke="${GY}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M110 46v14M104 66v10M116 70v8" stroke="${LB}" stroke-width="4" stroke-linecap="round"/><path d="M70 120c0-22 20-34 44-34s30 8 30 18-12 16-26 16Z" fill="${SK}"/><path d="M170 120c0-22-20-34-44-34" stroke="${SK2}" stroke-width="22" fill="none" stroke-linecap="round"/><circle cx="86" cy="94" r="7" fill="${WH}" stroke="${LB}" stroke-width="2"/><circle cx="150" cy="96" r="9" fill="${WH}" stroke="${LB}" stroke-width="2"/><circle cx="168" cy="80" r="5" fill="${WH}" stroke="${LB}" stroke-width="2"/>`,
    thermo: `${babyFace(96,86,36)}<path d="M84 52q12-8 24 0" stroke="${SK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M134 70v4M128 62v4" stroke="${LB}" stroke-width="4" stroke-linecap="round"/><g transform="rotate(30 178 80)"><rect x="170" y="26" width="16" height="84" rx="8" fill="${WH}" stroke="${GY}" stroke-width="3"/><rect x="175" y="60" width="6" height="46" fill="${RD}"/><circle cx="178" cy="114" r="13" fill="${RD}"/></g>`,
    cord: `<circle cx="120" cy="96" r="50" fill="${SK2}"/><path d="M70 120h100v20a50 26 0 0 1-100 0Z" fill="${WH}"/><circle cx="120" cy="90" r="9" fill="#E7C9A0" stroke="#C9A26B" stroke-width="2"/><path d="M180 34l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="${YE}"/>`,
    bag: `<path d="M92 62a28 28 0 0 1 56 0" stroke="#B33D74" stroke-width="8" fill="none"/><rect x="58" y="60" width="124" height="84" rx="16" fill="${WR}"/><path d="M76 60q12-20 30 0Z" fill="${YE}"/><path d="M108 60q10-16 26 0Z" fill="${LB}"/><rect x="132" y="88" width="40" height="28" rx="4" fill="${WH}"/><path d="M138 98h28M138 106h18" stroke="${GY}" stroke-width="3"/>`,
    calendar: `<rect x="56" y="34" width="128" height="110" rx="12" fill="${WH}" stroke="${GY}" stroke-width="3"/><path d="M56 46a12 12 0 0 1 12-12h104a12 12 0 0 1 12 12v18H56Z" fill="${RD}"/>${[0,1,2].map(r=>[0,1,2,3].map(c=>`<circle cx="${80+c*26}" cy="${84+r*20}" r="6" fill="${r===1&&c===2?GR:'#DDE3F0'}"/>`).join('')).join('')}<path d="M128 104l3 3 6-7" stroke="${WH}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M84 26v16M156 26v16" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    clock: `<circle cx="130" cy="82" r="52" fill="${WH}" stroke="${INK}" stroke-width="5"/>${[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>`<path d="M130 36v8" stroke="${GY}" stroke-width="3" transform="rotate(${i*30} 130 82)"/>`).join('')}<path d="M130 82V52M130 82l20 12" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M20 82q10-20 20 0t20 0" stroke="${WR}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    alert: `<path d="M150 150V70h70v80" fill="${WH}" stroke="${GY}" stroke-width="3"/><rect x="176" y="84" width="20" height="20" rx="3" fill="${RD}"/><path d="M186 88v12M180 94h12" stroke="${WH}" stroke-width="4" stroke-linecap="round"/><path d="M78 26l52 92H26Z" fill="${RD}" stroke-linejoin="round"/><path d="M78 58v32" stroke="${WH}" stroke-width="9" stroke-linecap="round"/><circle cx="78" cy="104" r="5" fill="${WH}"/><path d="M120 132h22l-6-6M142 132l-6 6" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  return S;
})();
function illus(key, warn){
  const body = ILL[key] || ILL.mother_baby;
  const badge = warn ? `<circle cx="212" cy="26" r="17" fill="${warn==='red'?IC_.RD:'#E29A1F'}"/><path d="M212 16v12" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="212" cy="35" r="2.6" fill="#fff"/>` : '';
  return `<svg class="illus" viewBox="0 0 240 160" aria-hidden="true"><ellipse cx="120" cy="88" rx="96" ry="66" fill="rgba(255,255,255,.55)"/>${body}${badge}</svg>`;
}
const LESSON_ART = {
  'danger-preg':['alert','headache','clinic','phone'], 'birth-plan':['clinic','bus','talk','bag'], 'kicks':['mother_belly','lie_left','calendar','phone'],
  'labour':['clock','mother_belly','clinic','alert'], 'eat-well':['plate','greens','fish','fruit'], 'ifa':['pill','glass','talk','calendar'],
  'mood':['cloud','talk','clinic','phone'], 'breastfeed':['mother_baby','breastfeed','breastfeed','clock'], 'attach':['latch','latch','breastfeed','talk'],
  'solids':['bowl','bowl','fruit','hands'], 'warm':['mother_baby','baby_hat','calendar','thermo'], 'cord':['hands','cord','cord','clinic'],
  'danger-baby':['breastfeed','baby_back','baby_back','thermo'], 'hygiene':['hands','glass','bowl','net'], 'spacing':['calendar','breastfeed','talk','pill'],
  'sleep-preg':['lie_left','lie_left','net','mother_belly'], 'bp-preg':['clinic','alert','headache','calendar'], 'bf-positions':['breastfeed','latch','mother_baby','breastfeed'],
  'expressing':['hands','glass','clock','glass'], 'safe-sleep':['baby_back','baby_hat','net','alert'], 'kmc':['mother_baby','mother_baby','talk','clock'],
};
const CAT_ART = {preg:'mother_belly', nutri:'plate', feed:'breastfeed', newborn:'baby_hat'};
const stepWarn = (txt, i, l) => /\b(now|sasa)\b/i.test(txt) || (l.id.startsWith('danger') && i < 3) ? 'red' : /\b(today|leo)\b/i.test(txt) ? 'amber' : null;

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

})();
