import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET, FRIENDS_LIMITS, canSendRequest, generateFriendCode, handleProblem, isExpired, normalizeCode,
  normalizeHandle, pairKey, parseFriendInput,
} from './rules';
import { orbSigns } from './orb';

const now = new Date('2026-11-01T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const base = {
  fromId: 'a', toId: 'b', now, areFriends: false, blockedEitherWay: false, existing: null, incomingPending: false,
  fromFriendsCount: 0, toFriendsCount: 0, fromPendingSent: 0,
};

describe('códigos', () => {
  it('generateFriendCode: 8 caracteres do alfabeto', () => {
    let seed = 0.123;
    const rand = () => (seed = (seed * 9301 + 0.49297) % 1);
    for (let k = 0; k < 50; k++) {
      const code = generateFriendCode(rand);
      expect(code).toHaveLength(8);
      for (const c of code) expect(CODE_ALPHABET).toContain(c);
    }
    expect(generateFriendCode(() => 0.9999999)).toBe('99999999');
  });

  it('normalizeCode', () => {
    expect(normalizeCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });

  it('pairKey ordena', () => {
    expect(pairKey('b', 'a')).toEqual({ userAId: 'a', userBId: 'b' });
  });
});

describe('@', () => {
  it('normaliza e valida', () => {
    expect(normalizeHandle(' @Ana.Luz ')).toBe('ana.luz');
    expect(handleProblem('ana.luz')).toBeNull();
    expect(handleProblem('an')).toBe('length');
    expect(handleProblem('ana luz')).toBe('chars');
    expect(handleProblem('.ana')).toBe('chars');
    expect(handleProblem('ana..luz')).toBe('chars');
    expect(handleProblem('admin')).toBe('reserved');
  });

  it('o que foi escrito: código ou @', () => {
    expect(parseFriendInput('abcd-efgh')).toEqual({ code: 'ABCDEFGH', handle: null });
    expect(parseFriendInput('@abcdefgh')).toEqual({ code: null, handle: 'abcdefgh' });
    expect(parseFriendInput('ana_luz')).toEqual({ code: null, handle: 'ana_luz' });
    expect(parseFriendInput('luaz2345')).toEqual({ code: 'LUAZ2345', handle: 'luaz2345' });
  });
});

describe('canSendRequest', () => {
  const reason = (patch: Partial<Parameters<typeof canSendRequest>[0]>) => {
    const r = canSendRequest({ ...base, ...patch });
    return r.ok ? 'ok' : r.reason;
  };

  it('casos de recusa', () => {
    expect(reason({ toId: 'a' })).toBe('self');
    expect(reason({ areFriends: true })).toBe('already-friends');
    expect(reason({ blockedEitherWay: true })).toBe('blocked');
    expect(reason({ existing: { status: 'PENDING', createdAt: daysAgo(2), respondedAt: null } })).toBe('pending-exists');
    expect(reason({ incomingPending: true })).toBe('incoming-exists');
    expect(reason({ fromFriendsCount: FRIENDS_LIMITS.maxFriends })).toBe('limit-friends');
    expect(reason({ toFriendsCount: 100 })).toBe('limit-friends');
    expect(reason({ fromPendingSent: 30 })).toBe('limit-pending');
  });

  it('recusado há 3 dias: cooldown; há 8 dias: ok', () => {
    expect(reason({ existing: { status: 'DECLINED', createdAt: daysAgo(10), respondedAt: daysAgo(3) } })).toBe('cooldown');
    expect(reason({ existing: { status: 'DECLINED', createdAt: daysAgo(10), respondedAt: daysAgo(8) } })).toBe('ok');
    expect(reason({ existing: { status: 'CANCELLED', createdAt: daysAgo(4), respondedAt: daysAgo(1) } })).toBe('cooldown');
  });

  it('pendente expirado ou aceite (amizade removida) pode reenviar', () => {
    expect(reason({ existing: { status: 'PENDING', createdAt: daysAgo(31), respondedAt: null } })).toBe('ok');
    expect(reason({ existing: { status: 'ACCEPTED', createdAt: daysAgo(40), respondedAt: daysAgo(39) } })).toBe('ok');
  });

  it('sem nada a impedir: ok', () => {
    expect(canSendRequest(base)).toEqual({ ok: true });
  });
});

describe('isExpired', () => {
  it('31 dias: sim; 29 dias: não', () => {
    expect(isExpired(daysAgo(31), now)).toBe(true);
    expect(isExpired(daysAgo(29), now)).toBe(false);
  });
});

describe('esfera de luz', () => {
  it('Sol no centro, Lua no meio, Ascendente na borda', () => {
    expect(orbSigns({ sun: 'LEO', moon: 'CANCER', asc: 'SCORPIO' })).toEqual({ core: 'LEO', mid: 'CANCER', edge: 'SCORPIO' });
  });

  it('sem Ascendente, a Lua vai até à borda; sem signos, neutra', () => {
    expect(orbSigns({ sun: 'LEO', moon: 'CANCER', asc: null })).toEqual({ core: 'LEO', mid: 'CANCER', edge: 'CANCER' });
    expect(orbSigns(null)).toBeNull();
  });
});
