// Interface language: English (the source) and Kiswahili (src/i18n/sw.json).
// Keys are the exact English strings; a missing translation shows the English.
// `npm run check:i18n` checks every t('…') / tn('…') / tr('…') / msg('…') key against sw.json.
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import sw from '@/i18n/sw.json';

export type Lang = 'en' | 'sw';
export type Vars = Record<string, string | number>;
export const LANG_KEY = 'sym.lang';
export const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'sw', label: 'Kiswahili' }];

const SW = sw as Record<string, string>;

function readLang(): Lang {
  try { return localStorage.getItem(LANG_KEY) === 'sw' ? 'sw' : 'en'; } catch { return 'en'; }
}
let current: Lang = readLang();

function fill(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}
function translate(lang: Lang, english: string, vars?: Vars) {
  return fill(lang === 'sw' ? SW[english] ?? english : english, vars);
}

/** For code outside components (errors, helpers): uses the language chosen now. */
export const tr = (english: string, vars?: Vars) => translate(current, english, vars);
/** Marks an English string kept in data (nav labels, tab lists) for translation where it is shown. */
export const msg = <S extends string>(english: S): S => english;
export const currentLang = () => current;

type T = (english: string, vars?: Vars) => string;
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T }>({ lang: 'en', setLang: () => undefined, t: (s, v) => fill(s, v) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);
  const setLang = useCallback((l: Lang) => {
    current = l;
    try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode: the choice lasts this visit */ }
    setLangState(l);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: ((s, v) => translate(lang, s, v)) as T }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** `const t = useT(); t('Save')`, `t('{n} mothers', { n })`. */
export const useT = () => useContext(Ctx).t;

/** For sentences with markup inside: `tn('Send to {name} now', { name: <b>{n}</b> })`. */
export function useTn() {
  const { lang } = useContext(Ctx);
  return useCallback((english: string, parts: Record<string, ReactNode>) => {
    const s = lang === 'sw' ? SW[english] ?? english : english;
    return s.split(/(\{\w+\})/).map((bit, i) => {
      const k = /^\{(\w+)\}$/.exec(bit)?.[1];
      return <Fragment key={i}>{k && k in parts ? parts[k] : bit}</Fragment>;
    });
  }, [lang]);
}
export const useLang = () => useContext(Ctx);
