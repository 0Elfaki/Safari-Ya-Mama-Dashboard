// Doctor's Note decryption, in the browser only (WebCrypto). Same scheme as the app
// (lib/core/note_share.dart) and the code in ../safari-ya-mama/supabase/README.md:
//   ciphertext = base64( 12-byte nonce | AES-256-GCM ciphertext | 16-byte tag )
//   key        = base64url(32 bytes), no padding, carried only in the QR
// The decrypted note and the key are never stored: callers keep them in component state only.
import { tr } from './i18n';

export interface DoctorNote {
  v?: number; lang?: string; name?: string; made_at?: string;
  sections: { letter: string; title: string; rows: string[] }[];
  footer?: string;
}

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const fromB64Url = (s: string) => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return fromB64(b + '='.repeat((4 - (b.length % 4)) % 4));
};

export class NoteDecryptError extends Error {}

export async function decryptNote(ciphertextB64: string, keyB64Url: string, subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<DoctorNote> {
  let keyBytes: Uint8Array, all: Uint8Array;
  try {
    keyBytes = fromB64Url(keyB64Url);
    all = fromB64(ciphertextB64);
  } catch {
    throw new NoteDecryptError(tr('The QR code or the stored note is damaged.'));
  }
  if (keyBytes.length !== 32 || all.length < 12 + 16) throw new NoteDecryptError(tr('The QR code or the stored note is damaged.'));
  try {
    const key = await subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, ['decrypt']);
    const clear = await subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) as BufferSource }, key, all.slice(12) as BufferSource);
    const note = JSON.parse(new TextDecoder().decode(clear)) as DoctorNote;
    if (!note || !Array.isArray(note.sections)) throw new Error('shape');
    return note;
  } catch {
    throw new NoteDecryptError(tr('This QR code does not open this note. Ask the mother to show a new QR code.'));
  }
}
