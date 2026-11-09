// Synthetic data for the browser QA (never real mothers). Shapes match the live tables/functions.
import fs from 'node:fs';
const vector = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/note-vector.json', import.meta.url), 'utf8'));

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ts = (mins) => new Date(Date.now() - mins * 6e4).toISOString();
export const F1 = '00000000-0000-4000-c000-0000000000f1', F2 = '00000000-0000-4000-c000-0000000000f2', F3 = '00000000-0000-4000-c000-0000000000f3';
export const D1 = '00000000-0000-4000-c000-0000000000d1', D2 = '00000000-0000-4000-c000-0000000000d2';
const M = (n) => `00000000-0000-4000-c000-00000000010${n}`;
export const USERS = {
  health_worker: { id: '00000000-0000-4000-c000-000000000a01', name: 'Neema Test (HW)', email: 'hw@example.invalid' },
  facility_admin: { id: '00000000-0000-4000-c000-000000000a02', name: 'Baraka Test (FA)', email: 'fa@example.invalid' },
  programme_admin: { id: '00000000-0000-4000-c000-000000000a03', name: 'Amani Test (Admin)', email: 'admin@example.invalid' },
  super_admin: { id: '00000000-0000-4000-c000-000000000a04', name: 'Super Admin Test', email: 'super@example.invalid' },
  editor: { id: '00000000-0000-4000-c000-000000000a07', name: 'Eva Test (Editor)', email: 'editor@example.invalid' },
  author: { id: '00000000-0000-4000-c000-000000000a08', name: 'Ali Test (Author)', email: 'author@example.invalid' },
};

export function world() {
  const facilities = [
    { id: F1, name: 'Sample Health Centre 1', level: 'health_centre', district_id: D1, district: 'Sample District A', country_code: 'TZ', country: 'Tanzania', phone: '+255 700 000 001', emergency_24h: true, lat: -6.79, lng: 39.21, active: true, staff_count: 3 },
    { id: F2, name: 'Sample Dispensary 2', level: 'dispensary', district_id: D1, district: 'Sample District A', country_code: 'TZ', country: 'Tanzania', phone: null, emergency_24h: false, lat: -6.82, lng: 39.27, active: true, staff_count: 1 },
    { id: F3, name: 'Sample District Hospital', level: 'hospital', district_id: D2, district: 'Sample District B', country_code: 'TZ', country: 'Tanzania', phone: '+255 700 000 003', emergency_24h: true, lat: null, lng: null, active: false, staff_count: 0 },
  ];
  const names = ['Amina Test', 'Rehema Test', 'Halima Test', 'Zawadi Test', 'Furaha Test', 'Imani Test'];
  const mothers = names.map((n, i) => ({ id: M(i + 1), display_name: n, phone: `+25570000010${i + 1}`, home_facility: F1, lang: i % 2 ? 'en' : 'sw', created_at: ts(60 * 24 * (20 + i)), role: 'mother' }));
  const pregnancies = [0, 1, 3].map((i) => ({ id: `preg-${i}`, mother_id: M(i + 1), lmp: day(-7 * (20 + i * 5)), edd: day(280 - 7 * (20 + i * 5)), gravida: 2, parity: 1, status: 'active', mother_age: 24 + i, prev_caesarean: false, prev_preeclampsia: i === 1, anaemia: false }));
  const babies = [{ id: 'baby-1', mother_id: M(3), name: 'Faith', sex: 'f', dob: day(-40), birth_weight_g: 3100 }, { id: 'baby-2', mother_id: M(5), name: 'Baraka Jr', sex: 'm', dob: day(-12), birth_weight_g: 2900 }];
  const checkins = [
    { id: 'c1', mother_id: M(2), baby_id: null, stage: 'pregnant', feeling: 'unwell', signs: ['bleeding'], baby_signs: [], movement: null, baby_feeding: null, systolic: null, diastolic: null, level: 'red', server_level: 'red', client_created_at: ts(45), note: 'Some bleeding since morning' },
    { id: 'c2', mother_id: M(1), baby_id: null, stage: 'pregnant', feeling: 'ok', signs: ['headache'], baby_signs: [], movement: null, baby_feeding: null, systolic: 142, diastolic: 92, level: 'amber', server_level: 'amber', client_created_at: ts(180), note: null },
    { id: 'c3', mother_id: M(3), baby_id: 'baby-1', stage: 'baby', feeling: 'ok', signs: [], baby_signs: ['b_feed'], movement: null, baby_feeding: 'less', systolic: null, diastolic: null, level: 'red', server_level: 'red', client_created_at: ts(20), note: null },
    { id: 'c4', mother_id: M(1), baby_id: null, stage: 'pregnant', feeling: 'ok', signs: [], baby_signs: [], movement: null, baby_feeding: null, systolic: 128, diastolic: 82, level: 'green', server_level: 'green', client_created_at: ts(60 * 24 * 2), note: null },
    { id: 'c5', mother_id: M(5), baby_id: 'baby-2', stage: 'baby', feeling: 'ok', signs: [], baby_signs: [], movement: null, baby_feeding: null, systolic: null, diastolic: null, level: 'green', server_level: 'green', client_created_at: ts(60 * 24 * 5), note: null },
  ];
  const bp = [0, 1, 2, 3, 4].map((i) => ({ id: `bp${i}`, mother_id: M(1), systolic: 118 + i * 6, diastolic: 76 + i * 4, level: 'green', server_level: 'green', client_created_at: ts(60 * 24 * 7 * (5 - i)) }));
  const alerts = [
    { id: 'al1', mother_id: M(2), facility_id: F1, source_table: 'checkins', source_id: 'c1', level: 'red', reasons: ['bleeding'], status: 'open', assigned_to: null, created_at: ts(45), acknowledged_at: null, closed_at: null },
    { id: 'al2', mother_id: M(3), facility_id: F1, source_table: 'checkins', source_id: 'c3', level: 'red', reasons: ['b_feed'], status: 'acknowledged', assigned_to: USERS.health_worker.id, created_at: ts(20), acknowledged_at: ts(10), closed_at: null },
    { id: 'al3', mother_id: M(1), facility_id: F1, source_table: 'checkins', source_id: 'c2', level: 'amber', reasons: ['headache', 'bp 142/92'], status: 'open', assigned_to: null, created_at: ts(180), acknowledged_at: null, closed_at: null },
    { id: 'al4', mother_id: M(4), facility_id: F1, source_table: 'checkins', source_id: 'cx', level: 'amber', reasons: ['fever'], status: 'closed', assigned_to: USERS.health_worker.id, created_at: ts(60 * 30), acknowledged_at: ts(60 * 29), closed_at: ts(60 * 28) },
  ];
  const appointments = [
    { id: 'ap1', mother_id: M(1), baby_id: null, kind: 'anc', contact_no: 4, due_on: day(2), attended_on: null, note: null, facility_id: F1 },
    { id: 'ap2', mother_id: M(2), baby_id: null, kind: 'anc', contact_no: 6, due_on: day(-3), attended_on: null, note: null, facility_id: F1 },
    { id: 'ap3', mother_id: M(1), baby_id: null, kind: 'anc', contact_no: 3, due_on: day(-30), attended_on: day(-30), note: null, facility_id: F1 },
    { id: 'ap4', mother_id: M(5), baby_id: 'baby-2', kind: 'pnc', contact_no: 3, due_on: day(5), attended_on: null, note: null, facility_id: F1 },
  ];
  const vaccines = [
    { id: 'v1', mother_id: M(3), baby_id: 'baby-1', vaccine_key: 'opv1', due_on: day(2), given_on: null },
    { id: 'v2', mother_id: M(3), baby_id: 'baby-1', vaccine_key: 'penta1', due_on: day(-2), given_on: null },
    { id: 'v3', mother_id: M(3), baby_id: 'baby-1', vaccine_key: 'bcg', due_on: day(-40), given_on: day(-40) },
    { id: 'v4', mother_id: M(5), baby_id: 'baby-2', vaccine_key: 'bcg', due_on: day(-12), given_on: null },
  ];
  const people = [
    { id: USERS.facility_admin.id, display_name: USERS.facility_admin.name, email: USERS.facility_admin.email, role: 'facility_admin', facilities: [{ id: F1, name: facilities[0].name, active: true }], created_at: ts(9000), last_sign_in_at: ts(30), confirmed: true, banned: false, mfa: false },
    { id: USERS.health_worker.id, display_name: USERS.health_worker.name, email: USERS.health_worker.email, role: 'health_worker', facilities: [{ id: F1, name: facilities[0].name, active: true }, { id: F2, name: facilities[1].name, active: true }], created_at: ts(8000), last_sign_in_at: ts(5), confirmed: true, banned: false, mfa: false },
    { id: '00000000-0000-4000-c000-000000000a05', display_name: 'Zuhura Test (HW)', email: 'hw2@example.invalid', role: 'health_worker', facilities: [{ id: F1, name: facilities[0].name, active: true }], created_at: ts(500), last_sign_in_at: null, confirmed: false, banned: false, mfa: false },
    { id: '00000000-0000-4000-c000-000000000a06', display_name: 'Juma Test (HW)', email: 'hw3@example.invalid', role: 'health_worker', facilities: [{ id: F2, name: facilities[1].name, active: true }], created_at: ts(7000), last_sign_in_at: ts(60 * 24 * 9), confirmed: true, banned: true, mfa: false },
    { id: USERS.programme_admin.id, display_name: USERS.programme_admin.name, email: USERS.programme_admin.email, role: 'programme_admin', facilities: [], created_at: ts(9500), last_sign_in_at: ts(60), confirmed: true, banned: false, mfa: true },
    { id: USERS.super_admin.id, display_name: USERS.super_admin.name, email: USERS.super_admin.email, role: 'super_admin', facilities: [], created_at: ts(9900), last_sign_in_at: ts(2), confirmed: true, banned: false, mfa: true },
  ];
  const lessons = [
    { id: 'danger-preg', category: 'preg', format: 'guide', minutes: 3, stage: 'pregnant', art_keys: [], published: true, sort: 1, channels: ['web', 'app'], step_pictures: ['PR-DANGER-P1', ''], status: 'published', version: 1, updated_at: ts(5000),
      lesson_translations: [{ lesson_id: 'danger-preg', lang: 'en', title: 'Danger signs in pregnancy', steps: ['Bleeding from the vagina: go now.', 'Severe headache or blurred vision: go today.'], audio_path: null, reviewed_by: null, reviewed_on: null },
        { lesson_id: 'danger-preg', lang: 'sw', title: 'Dalili za hatari wakati wa ujauzito', steps: ['Kutokwa na damu ukeni: nenda sasa.', 'Maumivu makali ya kichwa: nenda leo.'], audio_path: null, reviewed_by: null, reviewed_on: null }] },
    { id: 'breastfeed', category: 'feed', format: 'video', minutes: 4, stage: 'baby', art_keys: [], published: false, sort: 2, channels: ['app'], step_pictures: [], status: 'draft', version: 0, updated_at: ts(100),
      lesson_translations: [{ lesson_id: 'breastfeed', lang: 'en', title: 'Breastfeeding in the first days', steps: ['Start within the first hour.', 'Feed on demand, day and night.'], audio_path: null, reviewed_by: 'Registered midwife, Sample District', reviewed_on: day(-3) },
        { lesson_id: 'breastfeed', lang: 'sw', title: 'Kunyonyesha siku za kwanza', steps: ['Anza ndani ya saa ya kwanza.'], audio_path: null, reviewed_by: null, reviewed_on: null }] },
  ];
  return { facilities, mothers, pregnancies, babies, checkins, bp, alerts, appointments, vaccines, people, lessons, vector,
    site: [
      { key: 'faq.anc-visits', lang: 'en', section: 'faq', title: 'How many ANC visits do I need?', body_md: 'WHO recommends **8 contacts**.\n\n- First before 12 weeks\n- Then regularly', image_path: null, sort: 1, published: true, version: 2, updated_at: ts(100), archived: false },
      { key: 'faq.anc-visits', lang: 'sw', section: 'faq', title: 'Ninahitaji kliniki mara ngapi?', body_md: 'WHO inapendekeza **mara 8**.', image_path: null, sort: 1, published: true, version: 2, updated_at: ts(100), archived: false },
      { key: 'hero.home', lang: 'en', section: 'hero', title: 'Recognize. Prepare. Seek care.', body_md: 'A companion for every mother.', image_path: null, sort: 0, published: false, version: 0, updated_at: ts(50), archived: false },
      { key: 'hero.home', lang: 'sw', section: 'hero', title: '', body_md: '', image_path: null, sort: 0, published: false, version: 0, updated_at: ts(50), archived: false },
    ],
    siteVersions: [{ id: 1, key: 'faq.anc-visits', lang: 'en', version: 2, section: 'faq', title: 'How many ANC visits do I need?', body_md: 'WHO recommends **8 contacts**.', image_path: null, sort: 1, published_at: ts(200) },
      { id: 2, key: 'faq.anc-visits', lang: 'sw', version: 2, section: 'faq', title: 'Ninahitaji kliniki mara ngapi?', body_md: 'WHO inapendekeza **mara 8**.', image_path: null, sort: 1, published_at: ts(200) }],
    app: [
      { key: 'emergency.tz', lang: 'en', kind: 'emergency_numbers', value: 'Ambulance: 114\nPolice: 112', country_code: 'TZ', starts_on: null, ends_on: null, mentions_symptoms: false, reviewed_by: null, reviewed_on: null, published: true, version: 1, updated_at: ts(400), archived: false },
      { key: 'emergency.tz', lang: 'sw', kind: 'emergency_numbers', value: 'Gari la wagonjwa: 114\nPolisi: 112', country_code: 'TZ', starts_on: null, ends_on: null, mentions_symptoms: false, reviewed_by: null, reviewed_on: null, published: true, version: 1, updated_at: ts(400), archived: false },
      { key: 'home.rainy-season', lang: 'en', kind: 'announcement', value: 'Rainy season: if you have a fever, see a health worker today.', country_code: null, starts_on: day(0), ends_on: day(30), mentions_symptoms: true, reviewed_by: null, reviewed_on: null, published: false, version: 0, updated_at: ts(30), archived: false },
      { key: 'home.rainy-season', lang: 'sw', kind: 'announcement', value: 'Msimu wa mvua: ukiwa na homa, muone mhudumu wa afya leo.', country_code: null, starts_on: day(0), ends_on: day(30), mentions_symptoms: true, reviewed_by: null, reviewed_on: null, published: false, version: 0, updated_at: ts(30), archived: false },
    ],
    kpis: { facilities: 2, staff: 4, suppressed: false, mothers: 126, new_mothers: 18, active_7d: 81, pregnant: 74, postnatal: 52, checks: { total: 1432, red: 21, amber: 96 },
      alerts: { red: 21, amber: 96, open: 6, closed: 111, median_ack_red_min: 14.5, red_ack_30m_pct: 0.86 }, anc: { mothers: 74, mean_completed: 4.2, anc4_pct: 0.58, anc8_pct: 0.12, distribution: { 0: 3, 1: 6, 2: 9, 3: 13, 4: 15, 5: 11, 6: 8, 7: 0, 8: 9 } },
      vaccines: [{ key: 'bcg', due: 40, given: 39, on_time: 37 }, { key: 'opv0', due: 40, given: 38, on_time: 35 }, { key: 'penta1', due: 31, given: 27, on_time: 22 }, { key: 'pcv1', due: 31, given: 26, on_time: 21 }, { key: 'rota1', due: 31, given: 25, on_time: 20 }],
      overdue_visits: 17, overdue_vaccines: 9, caregivers: 44, notes: { shared: 23, opened: 19, opens: 27 }, ai_questions: 312, lesson_views: 980 },
    posts: [
      { id: 'post1', slug: 'first-anc-visit', title: 'Why the first ANC visit matters', excerpt: 'Going early helps find problems before they become dangerous, and gives you time to plan where you will give birth.', category: 'Maternal Health', author_id: 'content', published_at: ts(60 * 24 * 3), published: true, featured: true, status: 'published', has_draft_changes: false, draft_updated_at: ts(60 * 24 * 3), created_by: USERS.editor.id, health_review: 'approved', reviewed_by: 'Registered midwife, Sample District', reviewed_on: day(-3), review_note: null, archived: false, updated_at: ts(60 * 24 * 3), cover_url: null, cover_small_url: null, cover_alt: null, reading_minutes: 3, body: [{ type: 'p', text: 'Go **early**.' }], seo_title: null, seo_description: null,
        draft: { title: 'Why the first ANC visit matters', slug: 'first-anc-visit', excerpt: 'Going early helps find problems before they become dangerous, and gives you time to plan where you will give birth.', category: 'Maternal Health', author_id: 'content', published_at: ts(60 * 24 * 3), reading_minutes: null, cover_url: null, cover_small_url: null, cover_alt: null, featured: true, body: [{ type: 'h2', text: 'Go early' }, { type: 'p', text: 'Go **early**, ideally before 12 weeks.' }, { type: 'ul', items: ['Bring your clinic card', 'Write your questions'] }, { type: 'quote', text: 'Every visit counts.', source: 'Midwife, Sample District' }], seo_title: null, seo_description: null } },
      { id: 'post2', slug: 'draft-abc123', title: 'Untitled', excerpt: '', category: 'Product Updates', author_id: 'product', published_at: ts(10), published: false, featured: false, status: 'in_review', has_draft_changes: false, draft_updated_at: ts(10), created_by: USERS.author.id, health_review: 'not_needed', reviewed_by: null, reviewed_on: null, review_note: null, archived: false, updated_at: ts(10), cover_url: null,
        draft: { title: 'New in the app: caregivers', slug: 'caregivers-in-the-app', excerpt: 'Mothers can now invite a partner or relative.', category: 'Product Updates', author_id: 'product', published_at: null, body: [{ type: 'p', text: 'A short update.' }] } },
    ],
    authors: [{ id: 'content', name: 'Safari ya Mama content team', role: 'Health education content', bio: null, archived: false }, { id: 'product', name: 'Safari ya Mama product team', role: 'Product and design', bio: null, archived: false }],
    sections: [
      { id: 'sec1', page: 'home', section_key: 'hero', label: 'Hero', sort: 10, visible: true, data: null, draft: { eyebrow: 'A maternal health companion', title: 'Maternal care doesn’t stop at *the clinic door.*', lead: 'Safari ya Mama helps mothers recognise danger signs, prepare for birth and seek care.', buttons: [{ label: 'Explore the app', href: '/how-it-works' }, { label: 'Partner with us', href: '/contact' }], chips: ['Works offline', 'English and Kiswahili'], image: { src: '', alt: 'Illustration: a mother at her door' } }, draft_sort: 10, draft_visible: true, defaults: {}, published: false, has_changes: true, version: 0, updated_at: ts(30), published_at: null, archived: false },
      { id: 'sec2', page: 'home', section_key: 'challenge', label: 'The challenge', sort: 20, visible: true, data: { heading: 'x' }, draft: { heading: 'Why mothers need support between visits', stages: [{ title: 'Pregnancy', text: 'Danger signs are easy to miss.' }] }, draft_sort: 20, draft_visible: true, defaults: {}, published: true, has_changes: false, version: 2, updated_at: ts(600), published_at: ts(600), archived: false },
    ],
    media: [{ id: 'm1', path: 'library/mother-clinic-a1b2c3.webp', url: 'https://example.invalid/m1.webp', url_small: null, width: 1376, height: 768, bytes: 120000, alt: 'Illustration: a mother at a clinic', kind: 'illustration', created_at: ts(100), archived: false }],
    partners: [{ id: 'pa1', name: 'Sample University', logo_url: null, logo_alt: null, url: 'https://example.invalid', relationship: 'Research partner', status: 'proposed', sort: 0, published: false, updated_at: ts(100), archived: false }],
    impact: [{ id: 'k1', label: 'Mothers in the pilot', value: 120, unit: 'mothers', source: 'Pilot plan, 2026', is_demo: true, sort: 0, published: false, updated_at: ts(100), archived: false }],
    messages: [{ id: 'msg1', name: 'Test Sender', organisation: 'Sample NGO', email: 'sender@example.invalid', topic: 'NGO', message: 'We would like to talk about a partnership in our district.', status: 'new', note: null, created_at: ts(90) }],
    platform: { checked_at: ts(0), accounts: { super_admin: 1, programme_admin: 1, health_worker: 3, facility_admin: 1, editor: 1 }, accounts_unconfirmed: 1, accounts_without_mfa: 1,
      facilities: { active: 2, inactive: 1, without_staff: 0, emergency_24h: 1, by_level: { health_centre: 1, dispensary: 1 } },
      content: { content_version: 7, lessons_published: 14, lessons_draft: 1, lessons_retired: 0, lessons_app: 14, lessons_web: 14, lessons_unreviewed: 15, app_items_live: 1, app_items_pending_review: 1, app_pictures: 1, site_pictures: 1 },
      website: { posts_live: 1, posts_scheduled: 0, posts_draft: 0, posts_in_review: 1, posts_awaiting_clinical: 0, posts_unpublished_changes: 0, sections_live: 1, sections_total: 2, sections_changed: 1, partners_live: 0, partners_proposed: 1, impact_live: 0, impact_demo_live: 0, messages_new: 1, messages_30d: 1 },
      usage: { mothers: 126, caregivers: 44, mothers_new_30d: 18, push_devices: 88, ai_24h: 11, ai_7d: 74, staff_sign_ins_7d: 40, records_opened_7d: 61, last_checkin: ts(3), notifications_failed_7d: 2 } },
    extra: { suppressed: false, pregnancy: { active: 74, trimester_1: 12, trimester_2: 30, trimester_3: 32, weeks_36_plus: 9, due_14d: 5, birth_plan_36w_pct: 0.67 }, anc1_before_12w_pct: 0.41, high_bp_women: 6, reduced_movements: 2, kick_sessions: 140,
      baby: { babies: 52, under_1_month: 8, growth_monthly_pct: 0.55 }, baby_checks: { total: 300, with_danger_signs: 7 }, vaccines_on_time_pct: 0.82,
      engagement: { active_30d: 101, checking_mothers: 96, checks_per_mother: 14.9, lessons_completed: 412, top_lessons: [{ lesson: 'danger-preg', views: 120 }], birth_plans: 40, visit_questions: 66, medication_plans: 31 } },
    daily: Array.from({ length: 30 }, (_, i) => ({ day: day(i - 29), checks: 35 + ((i * 7) % 20), red: i % 6 === 0 ? 2 : i % 4 === 0 ? 1 : 0, amber: 2 + (i % 4), active_mothers: 30 + (i % 9), ai_questions: 6 + ((i * 3) % 11), new_mothers: i % 5 === 0 ? 2 : 0 })),
  };
}
