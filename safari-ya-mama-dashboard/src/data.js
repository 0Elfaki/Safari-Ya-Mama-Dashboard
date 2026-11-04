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

