import { useCallback, useEffect, useRef, useState } from 'react';
import { tr } from './i18n';

/** Load data for a page: loading, error and data states, plus reload. Stale responses are ignored. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ loading: boolean; error: string | null; data: T | null }>({ loading: true, error: null, data: null });
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const load = useCallback(async (quiet = false) => {
    const n = ++seq.current;
    if (!quiet) set((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (n === seq.current) set({ loading: false, error: null, data });
    } catch (e) {
      if (n === seq.current) set((s) => ({ loading: false, error: (e as Error).message || tr('Something went wrong.'), data: quiet ? s.data : null }));
    }
  }, [run]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
