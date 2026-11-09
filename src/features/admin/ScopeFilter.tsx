import { useMemo } from 'react';
import { FormField, Select, TextInput } from '@/components/ui/FormField';
import { geography, facilities as loadFacilities } from '@/lib/api';
import { daysAgo, isoDay } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

export interface Scope { from: string; to: string; country: string; district: string; facility: string; preset: string }
export const defaultScope = (): Scope => ({ from: daysAgo(29), to: isoDay(), country: '', district: '', facility: '', preset: '30' });

/** Country → district → facility → date range. Used by Overview, Facilities and Staff activity. */
export function ScopeFilter({ value, onChange, facility = true, place = true }: { value: Scope; onChange: (s: Scope) => void; facility?: boolean; place?: boolean }) {
  const geo = useAsync(async () => ({ ...(await geography()), facilities: await loadFacilities() }), []);
  const districts = useMemo(() => (geo.data?.districts ?? []).filter((d) => !value.country || d.country_code === value.country), [geo.data, value.country]);
  const facs = useMemo(() => (geo.data?.facilities ?? []).filter((f) => (!value.country || f.country_code === value.country) && (!value.district || f.district_id === value.district)), [geo.data, value.country, value.district]);
  const set = (p: Partial<Scope>) => onChange({ ...value, ...p });
  const t = useT();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {place && (
        <>
          <FormField label={t('Country')}><Select value={value.country} onChange={(e) => set({ country: e.target.value, district: '', facility: '' })}>
            <option value="">{t('All countries')}</option>{(geo.data?.countries ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select></FormField>
          <FormField label={t('District')}><Select value={value.district} onChange={(e) => set({ district: e.target.value, facility: '' })}>
            <option value="">{t('All districts')}</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select></FormField>
          {facility && <FormField label={t('Facility')}><Select value={value.facility} onChange={(e) => set({ facility: e.target.value })}>
            <option value="">{t('All facilities')}</option>{facs.map((f) => <option key={f.id} value={f.id}>{f.name}{f.active ? '' : ` (${t('inactive')})`}</option>)}
          </Select></FormField>}
        </>
      )}
      <FormField label={t('Period')}><Select value={value.preset} onChange={(e) => {
        const p = e.target.value;
        if (p === 'custom') set({ preset: p });
        else set({ preset: p, from: daysAgo(Number(p) - 1), to: isoDay() });
      }}>
        <option value="7">{t('Last 7 days')}</option><option value="30">{t('Last 30 days')}</option><option value="90">{t('Last 90 days')}</option><option value="365">{t('Last 12 months')}</option><option value="custom">{t('Choose dates')}</option>
      </Select></FormField>
      {value.preset === 'custom' && (
        <>
          <FormField label={t('From')}><TextInput type="date" value={value.from} max={value.to} onChange={(e) => set({ from: e.target.value })} /></FormField>
          <FormField label={t('To')}><TextInput type="date" value={value.to} min={value.from} max={isoDay()} onChange={(e) => set({ to: e.target.value })} /></FormField>
        </>
      )}
    </div>
  );
}
