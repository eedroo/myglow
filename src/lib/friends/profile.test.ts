import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeNatalChart } from '@/lib/astro/natal';
import { toBirthUtc } from '@/lib/birth';

/**
 * Privacidade do perfil de amigo (F15). O mock devolve registos COMPLETOS (ignora o `select`), com marcadores
 * de diário e conta: o DTO tem de os deixar todos de fora.
 */
vi.mock('server-only', () => ({}));

const TZ = 'Europe/Lisbon';
const chart = (timeKnown: boolean) =>
  computeNatalChart({
    birthUtc: toBirthUtc('1990-07-15', timeKnown ? '14:30' : null, TZ), latitude: 38.72, longitude: -9.14, timeKnown,
    birthDate: '1990-07-15', birthTz: TZ,
  });

const state = {
  friends: true,
  blocked: false,
  showBigThree: true,
  timeKnown: true,
};

const fullUser = () => ({
  id: 'b', name: 'Beatriz Lua', email: 'beatriz@example.com', passwordHash: 'HASH', xpTotal: 1200, timezone: TZ,
  showBigThree: state.showBigThree, bestMagicStreak: 9, locale: 'PT_PT', friendCode: 'ABCDEFGH', handle: 'bia.lua',
  wellbeingConsentAt: new Date(), guideConsentAt: new Date(),
  dailyEntries: [{ intention: 'INTENCAO', reflection: 'REFLEXAO', gratitude: 'GRATIDAO', summary: 'RESUMO', mood: 5 }],
  weeks: [{ weightGrams: 60000, intention: 'INTENCAO_SEMANA' }],
});

vi.mock('@/lib/db', () => ({
  db: {
    friendship: {
      findUnique: vi.fn(async () => (state.friends ? { userAId: 'a', userBId: 'b', createdAt: new Date('2026-10-01T10:00:00Z') } : null)),
    },
    userBlock: { count: vi.fn(async () => (state.blocked ? 1 : 0)) },
    user: { findUnique: vi.fn(async () => fullUser()) },
    birthProfile: {
      findMany: vi.fn(async () => [{ userId: 'b', natalChart: chart(state.timeKnown), placeName: 'LOCAL_NASCIMENTO' }]),
    },
    xpEvent: { findMany: vi.fn(async () => []) },
    courseProgress: {
      findMany: vi.fn(async () => [
        { courseSlug: 'vida-magica', completedAt: new Date('2026-10-05T10:00:00Z'), bestScore: 5 },
        { courseSlug: 'rituais', completedAt: null },
      ]),
    },
    lessonProgress: { findMany: vi.fn(async () => [{ courseSlug: 'rituais', lessonSlug: 'l1', completedAt: new Date('2026-10-20T10:00:00Z') }]) },
  },
}));

const { getFriendProfile } = await import('./queries');

const ALLOWED = [
  'id', 'name', 'initials', 'level', 'levelKey', 'progress', 'magicStreak', 'orb', 'handle', 'bestMagicStreak', 'badges',
  'coursesCompleted', 'currentCourse', 'bigThree', 'friendsSince',
].sort();
const FORBIDDEN = ['intention', 'reflection', 'gratitude', 'summary', 'mood', 'weight', 'email'];

beforeEach(() => {
  Object.assign(state, { friends: true, blocked: false, showBigThree: true, timeKnown: true });
});

describe('getFriendProfile', () => {
  it('não amigos: null', async () => {
    state.friends = false;
    expect(await getFriendProfile('a', 'b')).toBeNull();
  });

  it('amigos com bloqueio: null', async () => {
    state.blocked = true;
    expect(await getFriendProfile('a', 'b')).toBeNull();
  });

  it('o próprio: null', async () => {
    expect(await getFriendProfile('b', 'b')).toBeNull();
  });

  it('amigos: só as chaves do contrato, nada do diário nem da conta', async () => {
    const p = await getFriendProfile('a', 'b');
    expect(p).not.toBeNull();
    expect(Object.keys(p!).sort()).toEqual(ALLOWED);
    const json = JSON.stringify(p).toLowerCase();
    for (const k of FORBIDDEN) expect(json, k).not.toContain(k);
    for (const marker of ['intencao', 'reflexao', 'gratidao', 'resumo', 'local_nascimento', 'abcdefgh', 'hash']) {
      expect(json, marker).not.toContain(marker);
    }
    expect(p).toMatchObject({ name: 'Beatriz Lua', handle: 'bia.lua', level: 3, bestMagicStreak: 9, coursesCompleted: 1 });
    expect(p!.badges).toEqual([{ courseSlug: 'vida-magica', earnedAt: '2026-10-05T10:00:00.000Z' }]);
  });

  it('showBigThree = false: sem Sol/Lua/Asc e esfera neutra', async () => {
    state.showBigThree = false;
    const p = await getFriendProfile('a', 'b');
    expect(p!.bigThree).toBeNull();
    expect(p!.orb).toBeNull();
  });

  it('com partilha: Sol, Lua e Ascendente; sem hora de nascimento, sem Ascendente', async () => {
    const withTime = await getFriendProfile('a', 'b');
    expect(withTime!.bigThree).toMatchObject({ sun: 'CANCER' });
    expect(withTime!.bigThree!.asc).not.toBeNull();
    state.timeKnown = false;
    const noTime = await getFriendProfile('a', 'b');
    expect(noTime!.bigThree!.asc).toBeNull();
    expect(noTime!.orb!.edge).toBe(noTime!.bigThree!.moon);
  });
});
