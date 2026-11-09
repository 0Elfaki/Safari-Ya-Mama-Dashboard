import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Refuse to run with anything but the public anon key (a service_role key must never reach a browser). */
function roleOf(jwt: string | undefined) {
  try {
    return JSON.parse(atob((jwt ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role as string;
  } catch {
    return jwt?.startsWith('sb_publishable_') ? 'anon' : undefined;
  }
}
const role = roleOf(key);
export const configError = !url || !key ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example).'
  : role === 'service_role' ? 'The key in .env.local is a service_role key. Use the anon (public) key: the service key must never ship to a browser.'
  : null;

export const SUPABASE_URL = url ?? '';
export const supabase = createClient(url || 'http://localhost', configError ? 'invalid' : key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sym-dashboard' },
});

export const publicUrl = (bucket: string, path: string) => `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
