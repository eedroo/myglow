import { describe, expect, it } from 'vitest';
import { shouldSendRestPush } from './restAlert';

const ends = new Date('2026-11-01T10:01:30Z');
const base = { restEndsAt: ends, endedAt: null, clientHidden: true };

describe('shouldSendRestPush', () => {
  it('caso normal: envia', () => {
    expect(shouldSendRestPush(base, ends.toISOString())).toBe(true);
  });
  it('restEndsAt diferente (saltado ou +30 s): não', () => {
    expect(shouldSendRestPush({ ...base, restEndsAt: new Date(ends.getTime() + 30_000) }, ends)).toBe(false);
    expect(shouldSendRestPush({ ...base, restEndsAt: null }, ends)).toBe(false);
  });
  it('sessão terminada: não', () => {
    expect(shouldSendRestPush({ ...base, endedAt: new Date() }, ends)).toBe(false);
  });
  it('app aberta (clientHidden = false): não', () => {
    expect(shouldSendRestPush({ ...base, clientHidden: false }, ends)).toBe(false);
  });
  it('sessão apagada: não', () => {
    expect(shouldSendRestPush(null, ends)).toBe(false);
  });
});
