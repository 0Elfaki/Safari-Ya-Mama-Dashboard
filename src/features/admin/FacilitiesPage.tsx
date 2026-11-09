import { Building2, Download, MapPin, Pencil, Plus, Power } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Table, Td, Th, useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { FormField, Select, TextInput, Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { facilities as loadFacilities, facilityTable, geography, saveDistrict, saveFacility, setFacilityActive } from '@/lib/api';
import { downloadCsv, toCsv } from '@/lib/csv';
import { ago, fmtNum, fmtPct } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Facility } from '@/lib/types';
import { msg, tr, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { defaultScope, ScopeFilter, type Scope } from './ScopeFilter';

const FacilityMap = lazy(() => import('@/components/FacilityMap'));
const LEVEL: Record<string, string> = { dispensary: msg('Dispensary'), health_centre: msg('Health centre'), hospital: msg('Hospital') };
const hide = (v: number | null) => (v == null ? <span className="t-caption" title={tr('Fewer than 5 mothers: hidden')}>&lt; 5</span> : fmtNum(v));

function FacilityForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Facility | null; onSaved: () => void }) {
  const toast = useToast();
  const t = useT();
  const geo = useAsync(() => geography(), []);
  const [f, setF] = useState({ name: '', level: 'health_centre', country: 'TZ', district_id: '', newDistrict: '', phone: '', emergency_24h: false, lat: '', lng: '' });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF(editing ? { name: editing.name, level: editing.level, country: editing.country_code, district_id: editing.district_id, newDistrict: '', phone: editing.phone ?? '', emergency_24h: editing.emergency_24h, lat: editing.lat?.toString() ?? '', lng: editing.lng?.toString() ?? '' }
      : { name: '', level: 'health_centre', country: 'TZ', district_id: '', newDistrict: '', phone: '', emergency_24h: false, lat: '', lng: '' });
  }, [open, editing]);
  const districts = (geo.data?.districts ?? []).filter((d) => d.country_code === f.country);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const district = f.district_id === 'new' ? await saveDistrict(f.country, f.newDistrict) : f.district_id;
      await saveFacility({ id: editing?.id ?? null, name: f.name, level: f.level, district_id: district, phone: f.phone.trim() || null, emergency_24h: f.emergency_24h,
        lat: f.lat.trim() ? Number(f.lat) : null, lng: f.lng.trim() ? Number(f.lng) : null });
      toast(editing ? t('Facility saved') : t('Facility created')); onSaved(); onClose();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('Edit {name}', { name: editing.name }) : t('Add a facility')} description={t('Only the super admin can create, edit or deactivate facilities.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button loading={busy} onClick={submit} disabled={f.name.trim().length < 3 || !f.district_id || (f.district_id === 'new' && f.newDistrict.trim().length < 2)}>{editing ? t('Save') : t('Create facility')}</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <FormField label={t('Name')} required><TextInput value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} /></FormField>
        <FormField label={t('Level')} required><Select value={f.level} onChange={(e) => set({ level: e.target.value })}>{Object.entries(LEVEL).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</Select></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Country')} required><Select value={f.country} onChange={(e) => set({ country: e.target.value, district_id: '' })}>{(geo.data?.countries ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></FormField>
          <FormField label={t('District')} required><Select value={f.district_id} onChange={(e) => set({ district_id: e.target.value })}>
            <option value="">{t('Choose a district')}</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}<option value="new">{t('+ Add a new district')}</option>
          </Select></FormField>
        </div>
        {f.district_id === 'new' && <FormField label={t('New district name')} required><TextInput value={f.newDistrict} onChange={(e) => set({ newDistrict: e.target.value })} /></FormField>}
        <FormField label={t('Phone')} hint={t("Shown to mothers in the app as the facility's number.")}><TextInput type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+255 …" /></FormField>
        <Toggle label={t('Open 24 hours for emergencies')} checked={f.emergency_24h} onChange={(v) => set({ emergency_24h: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Latitude')} hint={t('For example -6.7924')}><TextInput inputMode="decimal" value={f.lat} onChange={(e) => set({ lat: e.target.value })} /></FormField>
          <FormField label={t('Longitude')} hint={t('For example 39.2083')}><TextInput inputMode="decimal" value={f.lng} onChange={(e) => set({ lng: e.target.value })} /></FormField>
        </div>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
      </form>
    </Modal>
  );
}

export default function FacilitiesPage() {
  const { isSuper } = useSession();
  const toast = useToast();
  const t = useT();
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [form, setForm] = useState<{ open: boolean; editing: Facility | null }>({ open: false, editing: null });
  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, f] = await Promise.all([facilityTable({ from: scope.from, to: scope.to, country: scope.country, district: scope.district }), loadFacilities()]);
    return { t: rows, f };
  }, [scope.from, scope.to, scope.country, scope.district]);
  const points = useMemo(() => (data?.t ?? []).filter((r) => r.lat != null && r.lng != null).map((r) => ({ id: r.facility_id, name: r.name, lat: Number(r.lat), lng: Number(r.lng), active: r.active,
    detail: t('{level} · {status} · {staff} staff · {mothers} mothers', { level: LEVEL[r.level] ? t(LEVEL[r.level]) : r.level, status: r.active ? t('active') : t('inactive'), staff: r.staff, mothers: r.mothers == null ? '< 5' : r.mothers }) })), [data, t]);

  const toggle = async (f: Facility) => {
    if (f.active && !confirm(t("Deactivate {name}? Staff can no longer sign in there and it leaves the app's facility list. Records are kept.", { name: f.name }))) return;
    try { await setFacilityActive(f.id, !f.active); toast(f.active ? t('Facility deactivated') : t('Facility reactivated')); reload(true); } catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <>
      <PageHeader title={t('Facilities')} subtitle={t("Compare facilities side by side. Mother figures under 5 are hidden. Last sync is the newest check-in received from that facility's mothers.")}
        actions={<>
          <Button variant="outline" icon={Download} disabled={!data} onClick={() => downloadCsv(`safari-ya-mama-facilities-${scope.from}-to-${scope.to}.csv`, toCsv(data!.t.map(({ facility_id, lat, lng, ...r }) => { void facility_id; void lat; void lng; return r; })))}>{t('Export CSV')}</Button>
          {isSuper && <Button icon={Plus} onClick={() => setForm({ open: true, editing: null })}>{t('Add facility')}</Button>}
        </>} />
      <BaseCard className="mb-6"><ScopeFilter value={scope} onChange={setScope} facility={false} /></BaseCard>
      {loading ? <LoadingState text={t('Loading facilities…')} /> : error || !data ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : (
        <div className="flex flex-col gap-6">
          <BaseCard>
            <CardHeader icon={MapPin} title={t('Map')} subtitle={`${t('{n} of {total} facilities have a location.', { n: points.length, total: data.t.length })}${isSuper ? ` ${t('Add latitude and longitude to place the others.')}` : ''}`} />
            {points.length ? <Suspense fallback={<LoadingState text={t('Loading map…')} />}><FacilityMap points={points} /></Suspense> : <EmptyState compact icon={MapPin} title={t('No facility has a location yet')} />}
          </BaseCard>
          <BaseCard>
            <CardHeader icon={Building2} title={t('Comparison')} subtitle={t('Figures for the chosen period.')} />
            {data.t.length === 0 ? <EmptyState compact icon={Building2} title={t('No facilities in this selection')} /> : (
              <Table caption={t('Facility comparison')}>
                <thead><tr><Th>{t('Facility')}</Th><Th>{t('Status')}</Th><Th num>{t('Mothers')}</Th><Th num>{t('Active 7 d')}</Th><Th num>{t('Checks')}</Th><Th num>{t('Red')}</Th><Th num>{t('Amber')}</Th><Th num>{t('Open')}</Th><Th num>{t('Median ack red')}</Th><Th num>{t('ANC 4+')}</Th><Th num>{t('Overdue visits')}</Th><Th>{t('Last sync')}</Th><Th num>{t('Staff')}</Th><Th num>{t('Sign-ins')}</Th><Th num>{t('Alerts handled')}</Th>{isSuper && <Th><span className="sr-only">{t('Actions')}</span></Th>}</tr></thead>
                <tbody>
                  {data.t.map((r) => {
                    const fac = data.f.find((x) => x.id === r.facility_id);
                    return (
                      <tr key={r.facility_id}>
                        <Td><b className="block whitespace-nowrap">{r.name}</b><span className="t-caption whitespace-nowrap">{LEVEL[r.level] ? t(LEVEL[r.level]) : undefined} · {r.district}</span></Td>
                        <Td>{r.active ? <StatusBadge tone="success">{t('Active')}</StatusBadge> : <StatusBadge>{t('Inactive')}</StatusBadge>}</Td>
                        <Td num>{hide(r.mothers)}</Td><Td num>{hide(r.active_7d)}</Td><Td num>{hide(r.checks)}</Td><Td num>{hide(r.red_alerts)}</Td><Td num>{hide(r.amber_alerts)}</Td><Td num>{hide(r.open_alerts)}</Td>
                        <Td num>{r.mothers == null ? hide(null) : r.median_ack_red_min == null ? '—' : t('{n} min', { n: Math.round(r.median_ack_red_min) })}</Td>
                        <Td num>{r.mothers == null ? hide(null) : fmtPct(r.anc4_pct)}</Td><Td num>{hide(r.overdue_visits)}</Td>
                        <Td className="whitespace-nowrap">{r.last_sync ? ago(r.last_sync) : t('never')}</Td>
                        <Td num>{r.staff}</Td><Td num>{r.logins}</Td><Td num>{r.alerts_handled}</Td>
                        {isSuper && fac && <Td><div className="flex gap-1">
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ open: true, editing: fac })} aria-label={t('Edit {name}', { name: fac.name })}>{t('Edit')}</Button>
                          <Button size="sm" variant="ghost" icon={Power} onClick={() => toggle(fac)} aria-label={fac.active ? t('Deactivate {name}', { name: fac.name }) : t('Reactivate {name}', { name: fac.name })}>{fac.active ? t('Deactivate') : t('Reactivate')}</Button>
                        </div></Td>}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </BaseCard>
        </div>
      )}
      <FacilityForm open={form.open} editing={form.editing} onClose={() => setForm({ open: false, editing: null })} onSaved={() => reload(true)} />
    </>
  );
}
