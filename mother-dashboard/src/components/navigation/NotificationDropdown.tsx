import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CalendarClock, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrefs } from '@/store/prefs';
import { IconButton } from '../common/Button';

/** Bell with an unread count and a dropdown of in-app notifications. */
export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { items, unread } = useNotifications();
  const markRead = usePrefs((s) => s.markRead);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const readSet = usePrefs((s) => s.readNotifications);

  return (
    <div ref={wrap} className="relative">
      <IconButton ref={btn} icon={Bell} label="Notifications" badge={unread.length} aria-expanded={open} aria-controls="notifications-panel" onClick={() => setOpen((o) => !o)} />
      <AnimatePresence>
        {open && (
          <motion.div
            id="notifications-panel"
            role="region"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-4 top-18 z-40 rounded-lg border border-line bg-surface shadow-raised sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-display text-body font-bold">Notifications</p>
              {unread.length > 0 && (
                <button type="button" className="min-h-11 rounded-md px-2 text-small font-semibold text-primary hover:bg-primary-soft" onClick={() => markRead(items.map((n) => n.id))}>
                  Mark all as read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <BellOff className="h-6 w-6 text-ink-2" aria-hidden />
                <p className="t-small">No notifications right now.</p>
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto p-2">
                {items.map((n) => {
                  const isUnread = !readSet.includes(n.id);
                  return (
                    <li key={n.id}>
                      <Link
                        to={n.to}
                        onClick={() => {
                          markRead([n.id]);
                          setOpen(false);
                        }}
                        className="flex items-start gap-3 rounded-md px-3 py-3 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className={clsx('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary')} aria-hidden>
                          <CalendarClock className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={clsx('truncate text-small', isUnread ? 'font-bold text-ink' : 'font-semibold text-ink-2')}>{n.title}</span>
                            {isUnread && <span className="sr-only">(unread)</span>}
                            {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                          </span>
                          <span className="t-caption block">{n.body}</span>
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-line px-4 py-3">
              <Link to="/appointments#reminders" onClick={() => setOpen(false)} className="text-small font-semibold text-primary hover:underline">
                Reminder settings
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
