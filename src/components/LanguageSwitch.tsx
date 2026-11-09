import clsx from 'clsx';
import { Languages } from 'lucide-react';
import { LANGS, useLang, type Lang } from '@/lib/i18n';

const select = 'min-h-11 rounded-md border border-line bg-surface px-2 text-small font-semibold';

/**
 * English / Kiswahili for the whole dashboard (remembered on this device).
 * `compact`: on phones the top bar shows EN / SW so the workspace name keeps its room.
 */
export function LanguageSwitch({ compact, className }: { compact?: boolean; className?: string }) {
  const { lang, setLang, t } = useLang();
  const change = (e: { target: { value: string } }) => setLang(e.target.value as Lang);
  return (
    <div className={clsx('flex shrink-0 items-center gap-2 text-small font-semibold text-ink', className)}>
      <Languages className={clsx('h-5 w-5 shrink-0 text-primary', compact && 'hidden sm:block')} aria-hidden />
      {compact && (
        <select value={lang} onChange={change} aria-label={t('Language')} className={clsx(select, 'sm:hidden')}>
          {LANGS.map((l) => <option key={l.id} value={l.id} lang={l.id}>{l.id.toUpperCase()}</option>)}
        </select>
      )}
      <select value={lang} onChange={change} aria-label={t('Language')} className={clsx(select, compact && 'hidden sm:block')}>
        {LANGS.map((l) => <option key={l.id} value={l.id} lang={l.id}>{l.label}</option>)}
      </select>
    </div>
  );
}
