import { useEffect, useState } from 'react';
import { useSession } from './session';
import { supabase } from './supabase';
import { tr } from './i18n';

/**
 * Who else has this item open (Supabase Realtime presence, nothing stored). The save itself is
 * protected separately: a save based on an older version is refused by the server.
 */
export function usePresence(key: string) {
  const { userId, name } = useSession();
  const [others, setOthers] = useState<string[]>([]);
  useEffect(() => {
    if (!userId || !key) return;
    const ch = supabase.channel(`edit:${key}`, { config: { presence: { key: userId } } });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState<{ name: string }>();
      setOthers(Object.entries(st).filter(([id]) => id !== userId).map(([, metas]) => metas[0]?.name ?? tr('Someone')));
    });
    ch.subscribe((s) => { if (s === 'SUBSCRIBED') ch.track({ name: name || tr('Someone') }); });
    return () => { supabase.removeChannel(ch); };
  }, [key, userId, name]);
  return others;
}
