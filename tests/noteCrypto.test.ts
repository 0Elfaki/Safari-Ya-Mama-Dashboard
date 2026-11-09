// The vector in fixtures/note-vector.json was made by the mother app's own code
// (lib/core/note_share.dart → sealNote) with tests/fixtures/make-note-vector.dart. Synthetic note, no real person.
import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import vector from './fixtures/note-vector.json';
import { decryptNote, NoteDecryptError } from '../src/lib/noteCrypto';
import { parseNoteQr } from '../src/lib/qr';
import { noteError } from '../src/features/staff/DoctorNotePage';
import { ApiError } from '../src/lib/api';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;

describe('Doctor\'s Note decryption', () => {
  it('opens a note sealed by the app', async () => {
    const note = await decryptNote(vector.ciphertext, vector.key, subtle);
    expect(note).toEqual(vector.note);
    expect(note.sections.map((s) => s.letter)).toEqual(['S', 'B', 'A', 'R']);
  });

  it('the app\'s QR text carries the same key', () => {
    expect(parseNoteQr(vector.qr)?.key).toBe(vector.key);
  });

  it('refuses a different key', async () => {
    const wrong = (vector.key[0] === 'A' ? 'B' : 'A') + vector.key.slice(1);
    await expect(decryptNote(vector.ciphertext, wrong, subtle)).rejects.toBeInstanceOf(NoteDecryptError);
  });

  it('refuses a changed ciphertext (GCM tag check)', async () => {
    const raw = Buffer.from(vector.ciphertext, 'base64');
    raw[raw.length - 20] ^= 0x01;
    await expect(decryptNote(raw.toString('base64'), vector.key, subtle)).rejects.toThrow(/does not open this note/);
  });

  it('refuses damaged input', async () => {
    await expect(decryptNote('not base64!!', vector.key, subtle)).rejects.toThrow(/damaged/);
    await expect(decryptNote(vector.ciphertext, 'short', subtle)).rejects.toThrow(/damaged/);
    await expect(decryptNote(Buffer.from('tiny').toString('base64'), vector.key, subtle)).rejects.toThrow(/damaged/);
  });
});

describe('plain-words errors', () => {
  it('explains a QR that is not a note', () => {
    expect(noteError('parse', 'hello')).toMatch(/not a Safari ya Mama Doctor's Note QR/);
    expect(noteError('parse', `SYM1:${'a'.repeat(64)}`)).toMatch(/record QR/);
  });
  it('explains expired or stopped shares', () => {
    expect(noteError(new ApiError('this note has expired or was stopped by the mother', 'P0002'), '')).toMatch(/expired, or the mother stopped sharing/);
  });
  it('explains a non-health-worker account', () => {
    expect(noteError(new ApiError('only health workers can open a shared note', '42501'), '')).toMatch(/Only health workers/);
  });
  it('passes the decrypt message through', () => {
    expect(noteError(new NoteDecryptError('This QR code does not open this note.'), '')).toMatch(/does not open/);
  });
});
