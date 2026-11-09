import { Calculator, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/layout/Shell';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { msg, useT } from '@/lib/i18n';

type Def = [name: string, what: string, from: string];
const GROUPS: { title: string; rows: Def[] }[] = [
  { title: msg('People and places (not filtered; the system now)'), rows: [
    [msg('Facilities active'), msg('Facilities marked active. “Without staff” = active facilities with no active staff assignment.'), 'facilities, staff_assignments'],
    [msg('Medical staff / admin and website accounts'), msg('Accounts by role, not deleted. “Without 2-step” = admin or website accounts with no verified authenticator.'), 'profiles, auth.mfa_factors'],
    [msg('Invites not accepted'), msg('Staff, admin and website accounts whose email was never confirmed.'), 'auth.users'],
    [msg('Mothers registered, caregivers linked'), msg('Accounts with the mother or caregiver role, not deleted. 1 to 4 → “Fewer than 5”.'), 'profiles'],
    [msg('Phones with notifications'), msg('Devices registered for push notifications. Failed sends = notifications marked failed in the last 7 days.'), 'push_subscriptions, notification_queue'],
    [msg('Staff sign-ins, records opened (7 days)'), msg('Successful staff and admin sign-ins; mother records opened by staff (each opening is logged).'), 'audit_log'],
  ] },
  { title: msg('Content'), rows: [
    [msg('App content version'), msg('Goes up by one every time anything the app downloads is published.'), 'content_meta'],
    [msg('Lessons published / in the app / on the website'), msg('Lessons with status published, by channel.'), 'lessons'],
    [msg('Lessons without clinical sign-off'), msg('Lessons (not retired) with at least one language not reviewed.'), 'lesson_translations'],
    [msg('App pictures uploaded'), msg('Picture files in app-media, against every picture ID the app expects.'), 'storage app-media'],
    [msg('Blog posts live / scheduled'), msg('Published and not archived; scheduled = publish date in the future.'), 'blog_posts'],
    [msg('Website sections live'), msg('Sections with a published version; “unpublished changes” = draft differs from live.'), 'site_sections'],
  ] },
  { title: msg('Mothers and their care (filtered by place and period; 1 to 4 mothers → hidden)'), rows: [
    [msg('Mothers'), msg('Mother accounts whose home facility is in the selection (all mothers when no place is chosen). New = joined in the period.'), 'profiles'],
    [msg('Active in 7 / 30 days'), msg('Mothers with at least one daily check in the last 7 / 30 days.'), 'checkins'],
    [msg('Pregnant / with a baby'), msg('Mothers with an active pregnancy / with a baby and no active pregnancy. Trimester from weeks since LMP: under 13, 13–27, 28+.'), 'pregnancies, babies'],
    [msg('Daily checks, red and amber'), msg('Checks recorded in the period; the level is the higher of the app’s and the server’s rating.'), 'checkins'],
    [msg('Median time to acknowledge red'), msg('Median minutes from a red alert being raised to its first acknowledgement, for red alerts raised in the period. Within 30 min = share of red alerts acknowledged within 30 minutes.'), 'alerts'],
    [msg('First ANC visit before 12 weeks'), msg('Pregnancies with an attended ANC visit: share whose first attended visit was less than 84 days after LMP.'), 'pregnancies, appointments'],
    [msg('ANC contacts (of 8)'), msg('Average attended ANC visits per pregnancy active in the period; 4+ and 8 = share reaching 4 and 8 contacts (WHO).'), 'appointments'],
    [msg('Women with high blood pressure'), msg('Women with at least one reading at or above 140 systolic or 90 diastolic in the period (weekly BP log or daily check).'), 'bp_readings, checkins'],
    [msg('Reduced baby movements'), msg('Women whose daily check in the period reported fewer or no movements.'), 'checkins'],
    [msg('36+ weeks with a birth plan'), msg('Active pregnancies at 36 weeks or more: share with a birth plan saved.'), 'pregnancies, birth_plans'],
    [msg('Overdue visits / vaccines'), msg('Visits or doses due in the period (up to yesterday) and not yet marked attended / given.'), 'appointments, vaccine_doses'],
    [msg('Vaccines given on time'), msg('Doses due in the period (up to 14 days ago): share given within 14 days of the due date.'), 'vaccine_doses'],
    [msg('Growth measured this month'), msg('Babies under 2 years: share with a weight or length measured in the last 31 days.'), 'growth_measures'],
    [msg('Baby checks with danger signs'), msg('Daily baby checks in the period with at least one danger sign ticked.'), 'checkins'],
    [msg('Lessons opened / finished, MamaBot questions'), msg('Lesson views and completed lessons; AI questions answered (who and when only, never the question).'), 'lesson_views, ai_usage'],
    [msg("Doctor's Notes shared / opened"), msg('Encrypted notes the mother shared in the period; opened = opened at least once by a clinician.'), 'note_shares'],
  ] },
];

export default function AboutNumbersPage() {
  const t = useT();
  return (
    <>
      <PageHeader title={t('About the numbers')} subtitle={t('How every figure on Programme KPIs is worked out: what is counted, over which period, and from where.')} />
      <BaseCard className="mb-6">
        <CardHeader icon={EyeOff} title={t('The privacy rule: “Fewer than 5”')} />
        <p className="t-small max-w-prose">{t('Any figure about mothers is hidden when the group has 1 to 4 mothers, because with so few people a number can point to one woman (for example “1 red result at a small dispensary”). It is shown as “Fewer than 5”. A group of 0 is shown as 0, since it reveals nothing about anyone. Choose all facilities or a longer period to see hidden figures. CSV exports follow the same rule and contain aggregates only.')}</p>
      </BaseCard>
      <div className="grid gap-6">
        {GROUPS.map((g) => (
          <BaseCard key={g.title}>
            <CardHeader icon={Calculator} title={t(g.title)} />
            <dl className="divide-y divide-line">
              {g.rows.map(([n, w, f]) => (
                <div key={n} className="grid gap-1 py-3 md:grid-cols-[16rem_1fr_12rem]">
                  <dt className="text-small font-semibold text-ink">{t(n)}</dt><dd className="t-small">{t(w)}</dd><dd className="t-caption">{f}</dd>
                </div>
              ))}
            </dl>
          </BaseCard>
        ))}
      </div>
    </>
  );
}
