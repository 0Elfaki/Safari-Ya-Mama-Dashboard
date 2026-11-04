const DAY = 86_400_000;

/** Local ISO date (YYYY-MM-DD) for a Date. */
export const isoDate = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Local calendar day (YYYY-MM-DD) of a stored ISO date-time. Never slice UTC strings. */
export const localDay = (isoDateTime: string) => isoDate(new Date(isoDateTime));

/** Parses YYYY-MM-DD as a local date (not UTC). */
export const parseDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY);

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  parseDate(iso).toLocaleDateString('en-GB', opts);
export const fmtWeekday = (iso: string) => fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtLongToday = (d = new Date()) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtTime = (isoDateTime: string) => new Date(isoDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const relativeDays = (iso: string, today = new Date()) => {
  const n = daysBetween(parseDate(iso), today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
};

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
