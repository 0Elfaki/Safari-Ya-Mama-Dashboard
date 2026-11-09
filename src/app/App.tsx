import { Building2, Lock, ShieldCheck } from 'lucide-react';
import { lazy, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MfaPage, SetPasswordPage, SignInPage } from '@/features/auth/AuthPages';
import { Shell } from '@/components/layout/Shell';
import { ToastProvider, useToast } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { FormField, Select } from '@/components/ui/FormField';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { facilities } from '@/lib/api';
import { SessionProvider, useSession } from '@/lib/session';
import { LanguageProvider, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { homeFor, itemFor } from './nav';

const TodayPage = lazy(() => import('@/features/staff/TodayPage'));
const AlertsPage = lazy(() => import('@/features/staff/AlertsPage'));
const PatientsPage = lazy(() => import('@/features/staff/PatientsPage'));
const PatientPage = lazy(() => import('@/features/staff/PatientPage'));
const DoctorNotePage = lazy(() => import('@/features/staff/DoctorNotePage'));
const CheckRecordPage = lazy(() => import('@/features/staff/CheckRecordPage'));
const FacilityOverviewPage = lazy(() => import('@/features/staff/FacilityOverviewPage'));
const TeamPage = lazy(() => import('@/features/staff/TeamPage'));
const OverviewPage = lazy(() => import('@/features/admin/OverviewPage'));
const FacilitiesPage = lazy(() => import('@/features/admin/FacilitiesPage'));
const PeoplePage = lazy(() => import('@/features/admin/PeoplePage'));
const ActivityPage = lazy(() => import('@/features/admin/ActivityPage'));
const SystemPage = lazy(() => import('@/features/admin/SystemPage'));
const AboutNumbersPage = lazy(() => import('@/features/admin/AboutNumbersPage'));
const LessonsPage = lazy(() => import('@/features/content/LessonsPage'));
const AppContentPage = lazy(() => import('@/features/content/AppContentPage'));
const RulesPage = lazy(() => import('@/features/content/RulesPage'));
const AppointmentsPage = lazy(() => import('@/features/staff/AppointmentsPage'));
const CirclePage = lazy(() => import('@/features/staff/CirclePage'));
const SetupMotherPage = lazy(() => import('@/features/staff/SetupMotherPage'));
const MamaBotPage = lazy(() => import('@/features/website/MamaBotPage'));
const PagesPage = lazy(() => import('@/features/website/PagesPage'));
const BlogPage = lazy(() => import('@/features/website/BlogPage'));
const PostEditorPage = lazy(() => import('@/features/website/PostEditor'));
const MediaLibraryPage = lazy(() => import('@/features/website/MediaLibraryPage'));
const PartnersPage = lazy(() => import('@/features/website/PartnersPage'));
const InboxPage = lazy(() => import('@/features/website/InboxPage'));
const SettingsPage = lazy(() => import('@/features/website/SettingsPage'));

/** A super admin or Admin in Administration opened a facility page: pick the facility to work at. */
function ChooseFacility() {
  const s = useSession();
  const toast = useToast();
  const list = useAsync(() => facilities(), []);
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  return (
    <BaseCard className="mx-auto max-w-dialog">
      <EmptyState icon={Building2} title={t('Choose the facility to work at')} text={t("This page shows one facility's mothers, alerts and visits. You can open any active facility; mothers' consent and the view log apply as for every health worker.")} />
      {list.loading ? <LoadingState text={t('Loading facilities…')} /> : (
        <form className="grid gap-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { await s.openFacility(id); } catch (x) { toast((x as Error).message, 'bad'); }
          setBusy(false);
        }}>
          <FormField label={t('Facility')} required>
            <Select value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">{t('Choose a facility')}</option>
              {(list.data ?? []).filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </FormField>
          <Button type="submit" icon={Building2} disabled={!id} loading={busy}>{t('Open this facility')}</Button>
        </form>
      )}
    </BaseCard>
  );
}

/** The UI half of a permission (the database enforces the real one). */
function Guard({ children }: { children: ReactNode }) {
  const s = useSession();
  const loc = useLocation();
  const item = itemFor(loc.pathname);
  const t = useT();
  if (!item || !s.role || !item.roles.includes(s.role))
    return <EmptyState icon={Lock} title={t('This page is not available to your role')} text={t('Ask an administrator if you need access.')} action={<ButtonLink to={homeFor(s.role, s.kind)} variant="outline">{t('Go to your start page')}</ButtonLink>} />;
  if (item.mode === 'staff' && s.kind !== 'staff') return <ChooseFacility />;
  if (item.mode === 'admin' && s.kind !== 'admin')
    return <EmptyState icon={ShieldCheck} title={t('This is an Administration page')} text={s.facility?.name ? t('You are working at {name}.', { name: s.facility.name }) : t('You are working at a facility.')}
      action={<Button icon={ShieldCheck} onClick={() => s.openAdministration()}>{t('Back to Administration')}</Button>} />;
  return <>{children}</>;
}
const g = (el: ReactNode) => <Guard>{el}</Guard>;

function Routed() {
  const s = useSession();
  const t = useT();
  if (s.stage === 'loading') return <LoadingState text={t('Checking your session…')} className="min-h-dvh" />;
  if (s.stage === 'signed_out') return <SignInPage />;
  if (s.stage === 'set_password') return <SetPasswordPage />;
  if (s.stage === 'mfa_enroll') return <MfaPage enroll />;
  if (s.stage === 'mfa_verify') return <MfaPage enroll={false} />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to={homeFor(s.role, s.kind)} replace />} />
        <Route path="today" element={g(<TodayPage />)} />
        <Route path="alerts" element={g(<AlertsPage />)} />
        <Route path="patients" element={g(<PatientsPage />)} />
        <Route path="patients/:id" element={g(<PatientPage />)} />
        <Route path="appointments" element={g(<AppointmentsPage />)} />
        <Route path="circle" element={g(<CirclePage />)} />
        <Route path="setup-mother" element={g(<SetupMotherPage />)} />
        <Route path="website/mamabot" element={g(<MamaBotPage />)} />
        <Route path="note" element={g(<DoctorNotePage />)} />
        <Route path="record" element={g(<CheckRecordPage />)} />
        <Route path="facility" element={g(<FacilityOverviewPage />)} />
        <Route path="team" element={g(<TeamPage />)} />
        <Route path="overview" element={g(<OverviewPage />)} />
        <Route path="facilities" element={g(<FacilitiesPage />)} />
        <Route path="people" element={g(<PeoplePage />)} />
        <Route path="activity" element={g(<ActivityPage />)} />
        <Route path="system" element={g(<SystemPage />)} />
        <Route path="about-numbers" element={g(<AboutNumbersPage />)} />
        <Route path="app/lessons" element={g(<LessonsPage />)} />
        <Route path="app/content" element={g(<AppContentPage />)} />
        <Route path="app/rules" element={g(<RulesPage />)} />
        <Route path="website/pages" element={g(<PagesPage />)} />
        <Route path="website/blog" element={g(<BlogPage />)} />
        <Route path="website/blog/:id" element={g(<PostEditorPage />)} />
        <Route path="website/media" element={g(<MediaLibraryPage />)} />
        <Route path="website/partners" element={g(<PartnersPage />)} />
        <Route path="website/inbox" element={g(<InboxPage />)} />
        <Route path="website/settings" element={g(<SettingsPage />)} />
        {/* earlier addresses */}
        <Route path="audit" element={<Navigate to="/activity?tab=audit" replace />} />
        <Route path="content/lessons" element={<Navigate to="/app/lessons" replace />} />
        <Route path="content/app" element={<Navigate to="/app/content" replace />} />
        <Route path="content/media" element={<Navigate to="/app/content?tab=pictures" replace />} />
        <Route path="content/website" element={<Navigate to="/website/pages" replace />} />
        <Route path="*" element={<EmptyState icon={Lock} title={t('Page not found')} action={<ButtonLink to={homeFor(s.role, s.kind)} variant="outline">{t('Go to your start page')}</ButtonLink>} />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <LanguageProvider>
          <ToastProvider>
            <Routed />
          </ToastProvider>
        </LanguageProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
