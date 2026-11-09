import { useCallback, useEffect, useRef, useState } from 'react';
import { tr } from './i18n';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Saves a draft every 10 seconds while it has unsaved changes, on Ctrl/Cmd+S, and warns before
 * leaving the page with unsaved changes. `save` must throw on failure.
 */
export function useAutosave(dirty: boolean, save: () => Promise<void>, { every = 10_000, enabled = true } = {}) {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const latest = useRef(save);
  latest.current = save;

  const saveNow = useCallback(async () => {
    if (running.current) return;
    running.current = true; setState('saving'); setError(null);
    try { await latest.current(); setState('saved'); } catch (e) { setState('error'); setError((e as Error).message); }
    running.current = false;
  }, []);

  useEffect(() => {
    if (!enabled || !dirty || state === 'error') return;
    const t = window.setTimeout(saveNow, every);
    return () => window.clearTimeout(t);
  }, [dirty, enabled, every, saveNow, state]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(); } };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onLeave); };
  }, [dirty, enabled, saveNow]);

  return { state: dirty && state === 'saved' ? 'idle' : state, error, saveNow, retry: () => { setState('idle'); saveNow(); } };
}

export const saveLabel = (s: SaveState, dirty: boolean) =>
  s === 'saving' ? tr('Saving…') : s === 'error' ? tr('Not saved') : dirty ? tr('Unsaved changes') : s === 'saved' ? tr('Saved') : tr('All changes saved');
