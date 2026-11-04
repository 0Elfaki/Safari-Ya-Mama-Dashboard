import { PhoneCall, Siren } from 'lucide-react';
import { content, tr, todaySigns, urgentSigns } from '@/data/content';
import { usePrefs } from '@/store/prefs';
import type { DangerSign } from '@/types';

/**
 * Danger signs grouped by what to do, exactly as the shared rules grade them:
 * red = go to a facility now; yellow = see a health worker today.
 */
export function DangerSignList({ signs, who }: { signs: DangerSign[]; who: string }) {
  const lang = usePrefs((s) => s.contentLang);
  const now = urgentSigns(signs);
  const today = todaySigns(signs);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="min-w-0 rounded-lg border border-danger/30 bg-danger-soft p-5">
        <p className="flex items-center gap-2 font-display text-body font-bold text-danger">
          <Siren className="h-5 w-5 shrink-0" aria-hidden /> Go to a health facility now
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {now.map((s) => (
            <li key={s.key} className="flex items-start gap-2 text-small text-ink">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-danger" aria-hidden />
              {tr(s, lang)}
            </li>
          ))}
        </ul>
      </div>
      {today.length > 0 && (
        <div className="min-w-0 rounded-lg border border-warning/30 bg-warning-soft p-5">
          <p className="flex items-center gap-2 font-display text-body font-bold text-warning">
            <PhoneCall className="h-5 w-5 shrink-0" aria-hidden /> See a health worker today
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {today.map((s) => (
              <li key={s.key} className="flex items-start gap-2 text-small text-ink">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warning" aria-hidden />
                {tr(s, lang)}
                {s.level === 'age' && <span className="t-caption"> (go now if under 2 months)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="t-caption md:col-span-2">
        Signs for {who}. From the Safari ya Mama warning rules (version {content.rulesVersion}), based on WHO guidance. They do not diagnose.
      </p>
    </div>
  );
}
