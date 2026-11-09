import { describe, expect, it } from 'vitest';
import { parseNoteQr, parseRecordQr, qrKind } from '../src/lib/qr';

const ID = '3f2a9c1e-7b4d-4e8a-9f0c-1d2e3f4a5b6c';
const KEY = 'KRb2F_Sd0x0fQ0p3iO-abcdefghijklmnopqrstuvwx'; // 43 base64url characters (32-byte key)
const HASH = 'a'.repeat(32) + '0123456789abcdef0123456789ABCDEF';

describe('Doctor\'s Note QR (SYM2)', () => {
  it('reads the share id and key', () => {
    expect(parseNoteQr(`SYM2:${ID}.${KEY}`)).toEqual({ id: ID, key: KEY });
  });
  it('trims spaces and lower-cases the id, keeps the key exactly', () => {
    expect(parseNoteQr(`  SYM2:${ID.toUpperCase()}.${KEY}\n`)).toEqual({ id: ID, key: KEY });
  });
  it.each([
    ['empty', ''],
    ['wrong prefix', `SYM1:${ID}.${KEY}`],
    ['key too short', `SYM2:${ID}.${KEY.slice(1)}`],
    ['key with padding', `SYM2:${ID}.${KEY.slice(1)}=`],
    ['not a uuid', `SYM2:${'x'.repeat(36)}.${KEY}`],
    ['missing dot', `SYM2:${ID}${KEY}`],
    ['a website link', 'https://safariyamama.com/'],
  ])('refuses %s', (_, text) => expect(parseNoteQr(text)).toBeNull());
});

describe('record QR (SYM1)', () => {
  it('reads SYM1:<64 hex> and lower-cases it', () => {
    expect(parseRecordQr(`SYM1:${HASH}`)).toBe(HASH.toLowerCase());
  });
  it('accepts the bare fingerprint', () => expect(parseRecordQr(HASH)).toBe(HASH.toLowerCase()));
  it.each([['63 hex', `SYM1:${HASH.slice(1)}`], ['65 hex', `SYM1:${HASH}a`], ['not hex', `SYM1:${'g'.repeat(64)}`], ['a note QR', `SYM2:${ID}.${KEY}`]])(
    'refuses %s', (_, text) => expect(parseRecordQr(text)).toBeNull());
});

describe('which QR was scanned', () => {
  it('tells note, record and unknown apart', () => {
    expect(qrKind(`SYM2:${ID}.${KEY}`)).toBe('note');
    expect(qrKind(`SYM1:${HASH}`)).toBe('record');
    expect(qrKind('hello')).toBe('unknown');
  });
});
