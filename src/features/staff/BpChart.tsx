import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chart } from '@/lib/chartTheme';
import { fmtDate } from '@/lib/format';
import { useT } from '@/lib/i18n';

export default function BpChart({ points }: { points: { at: string; s: number; d: number }[] }) {
  const t = useT();
  const data = points.map((p) => ({ day: fmtDate(p.at, { day: 'numeric', month: 'short' }), Systolic: p.s, Diastolic: p.d }));
  return (
    <div className="h-64 w-full" role="img" aria-label={t('Blood pressure, {n} readings, latest {s}/{d}', { n: points.length, s: points[points.length - 1].s, d: points[points.length - 1].d })}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="day" tick={chart.tick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[50, 180]} tick={chart.tick} tickLine={false} axisLine={false} />
          <Tooltip {...chart.tooltip} />
          <Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
          <ReferenceLine y={140} stroke={chart.danger} strokeDasharray="6 4" label={{ value: '140', position: 'insideTopRight', fill: chart.danger, fontSize: 12 }} />
          <ReferenceLine y={90} stroke={chart.danger} strokeDasharray="6 4" label={{ value: '90', position: 'insideTopRight', fill: chart.danger, fontSize: 12 }} />
          <Line type="monotone" dataKey="Systolic" name={t('Systolic')} stroke={chart.primary} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="Diastolic" name={t('Diastolic')} stroke={chart.accent} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
