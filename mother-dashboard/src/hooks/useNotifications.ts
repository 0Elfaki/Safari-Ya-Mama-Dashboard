import { useMemo } from 'react';
import { usePrefs } from '@/store/prefs';
import type { AppNotification } from '@/types';
import { daysBetween, fmtWeekday, parseDate } from '@/utils/dates';
import { useCare } from './useCare';
import { useTodayChecklist } from './useChecklist';

/** In-app notifications, derived from her records and reminder settings. Nothing is invented. */
export function useNotifications() {
  const care = useCare();
  const list = useTodayChecklist();
  const reminders = usePrefs((s) => s.reminders);
  const read = usePrefs((s) => s.readNotifications);

  const items = useMemo(() => {
    const out: AppNotification[] = [];
    const today = new Date();
    if (reminders.appointments) {
      for (const a of care.upcoming) {
        const n = daysBetween(parseDate(a.date), today);
        if (n > (reminders.dayBefore ? 7 : 0)) continue;
        out.push({
          id: `appt:${a.id}:${a.date}`,
          title: n === 0 ? `Today: ${a.title}` : n === 1 ? `Tomorrow: ${a.title}` : a.title,
          body: `${fmtWeekday(a.date)} at ${a.time}, ${a.facility}`,
          to: `/appointments/${a.id}`,
          tone: n <= 1 ? 'warning' : 'info',
        });
      }
    }
    if (care.vaccine && care.vaccine.inDays <= 7) {
      out.push({
        id: `vaccine:${care.vaccine.group.dayOfLife}`,
        title: `${care.vaccine.group.en} vaccines ${care.vaccine.inDays <= 0 ? 'are due' : 'due soon'}`,
        body: care.vaccine.group.items.join(', '),
        to: '/baby#vaccinations',
        tone: 'info',
      });
    }
    if (reminders.checklist && list.tasks.length && list.doneCount < list.tasks.length) {
      const left = list.tasks.length - list.doneCount;
      out.push({ id: `checklist:${new Date().toDateString()}:${left}`, title: "Today's care", body: `${left} item${left === 1 ? '' : 's'} left on your checklist`, to: '/#todays-care', tone: 'info' });
    }
    return out;
  }, [care, list.tasks.length, list.doneCount, reminders]);

  const unread = items.filter((n) => !read.includes(n.id));
  return { items, unread };
}
