// QR payloads shown by the mother app.
//   SYM2:<share id>.<key>   Doctor's Note share (lib/core/note_share.dart)
//   SYM1:<64 hex>           verifiable record fingerprint (lib/core/record_proof.dart)

const NOTE = /^SYM2:([0-9a-fA-F-]{36})\.([A-Za-z0-9_-]{43})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NoteQr = { id: string; key: string };

/** Doctor's Note QR → share id and key, or null when it is not one. */
export function parseNoteQr(text: string): NoteQr | null {
  const m = NOTE.exec(String(text ?? '').trim());
  if (!m || !UUID.test(m[1])) return null;
  return { id: m[1].toLowerCase(), key: m[2] };
}

/** Record QR → lower-case 64-hex fingerprint, or null. Accepts the bare hash too. */
export function parseRecordQr(text: string): string | null {
  const m = /^\s*(?:SYM1:)?\s*([0-9a-fA-F]{64})\s*$/.exec(String(text ?? ''));
  return m ? m[1].toLowerCase() : null;
}

/** Which kind of Safari ya Mama QR this is (for a helpful error when the wrong one is scanned). */
export function qrKind(text: string): 'note' | 'record' | 'unknown' {
  const t = String(text ?? '').trim();
  if (parseNoteQr(t)) return 'note';
  if (parseRecordQr(t)) return 'record';
  return 'unknown';
}
