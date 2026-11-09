import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chart } from '@/lib/chartTheme';
import { fmtDate, vaccineLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';

const axis = { tick: chart.tick, tickLine: false, axisLine: false } as const;
const legend = { wrapperStyle: { fontFamily: 'Inter', fontSize: 12 } };

/** Check-ins per day: no warning signs / amber / red stacked, each named in the legend. */
export function ChecksChart({ rows }: { rows: { day: string; checks: number; red: number; amber: number }[] }) {
  const t = useT();
  const none = t('No warning signs'), amber = t('Amber'), red = t('Red');
  const data = rows.map((r) => ({ day: fmtDate(r.day, { day: 'numeric', month: 'short' }), [none]: Math.max(0, r.checks - r.red - r.amber), [amber]: r.amber, [red]: r.red }));
  const total = rows.reduce((n, r) => n + r.checks, 0);
  return (
    <div className="h-64 w-full" role="img" aria-label={t('Check-ins per day: {n} in total', { n: total })}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="day" {...axis} minTickGap={20} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...chart.tooltip} />
          <Legend {...legend} />
          <Bar dataKey={none} stackId="a" fill={chart.secondary} isAnimationActive={false} />
          <Bar dataKey={amber} stackId="a" fill={chart.warning} isAnimationActive={false} />
          <Bar dataKey={red} stackId="a" fill={chart.danger} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountLine({ rows, name, label }: { rows: { day: string; n: number }[]; name: string; label: string }) {
  const data = rows.map((r) => ({ day: fmtDate(r.day, { day: 'numeric', month: 'short' }), [name]: r.n }));
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="day" {...axis} minTickGap={20} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...chart.tooltip} />
          <Line type="monotone" dataKey={name} stroke={chart.primary} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Coverage by dose: given of due (and given within 14 days of due). */
export function VaccineChart({ rows }: { rows: { key: string; due: number; given: number; on_time: number }[] }) {
  const t = useT();
  const onTime = t('Given on time'), late = t('Given late');
  const data = rows.map((r) => ({ dose: vaccineLabel(r.key), [onTime]: r.due ? Math.round((r.on_time / r.due) * 100) : 0, [late]: r.due ? Math.round(((r.given - r.on_time) / r.due) * 100) : 0 }));
  return (
    <div className="h-72 w-full" role="img" aria-label={t('Vaccine coverage by dose, percent of doses due')}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 24 }}>
          <CartesianGrid stroke={chart.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} unit="%" {...axis} />
          <YAxis type="category" dataKey="dose" width={96} {...axis} />
          <Tooltip {...chart.tooltip} formatter={(v: number) => `${v}%`} />
          <Legend {...legend} />
          <Bar dataKey={onTime} stackId="a" fill={chart.primary} isAnimationActive={false} />
          <Bar dataKey={late} stackId="a" fill={chart.secondary} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AncChart({ dist }: { dist: Record<string, number> }) {
  const t = useT();
  const mothers = t('Mothers');
  const data = Array.from({ length: 9 }, (_, i) => ({ contacts: i === 8 ? '8' : String(i), [mothers]: dist[String(i)] ?? 0 }));
  return (
    <div className="h-56 w-full" role="img" aria-label={t('Mothers by number of ANC contacts attended, 0 to 8')}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="contacts" {...axis} label={{ value: t('ANC contacts attended (of 8)'), position: 'insideBottom', offset: -2, fill: chart.ink2, fontSize: 12 }} height={36} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...chart.tooltip} />
          <Bar dataKey={mothers} fill={chart.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
