import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserContentKind } from '@prisma/client';
import { computeNatalChart } from '@/lib/astro/natal';
import { toBirthUtc } from '@/lib/birth';
import { toDbDate } from '@/lib/dates';

/**
 * Regra 4 (privacidade): só factos astrológicos, mapa natal, locale e — com `aiUseIntentions` —
 * as intenções do período. O mock devolve SEMPRE registos completos (ignora os `select`), para que
 * qualquer fuga por espalhar um registo inteiro no prompt seja apanhada.
 */
vi.mock('server-only', () => ({}));

const TZ = 'Europe/Lisbon';
const chart = computeNatalChart({
  birthUtc: toBirthUtc('1990-07-15', '14:30', TZ), latitude: 38.72, longitude: -9.14, timeKnown: true,
  birthDate: '1990-07-15', birthTz: TZ,
});

const SECRETS = [
  'SEGREDO_NOME', 'segredo_email@example.com', 'SEGREDO_REFLEXAO', 'SEGREDO_GRATIDAO', 'SEGREDO_RESUMO',
  'SEGREDO_NOTA_DIA', 'SEGREDO_BANIMENTO_MANHA', 'SEGREDO_BANIMENTO_NOITE', 'SEGREDO_NOTA_ACORDAR',
  'SEGREDO_REFLEXAO_SEMANA', 'SEGREDO_TITULO_SEMANA', 'SEGREDO_REFLEXAO_MES', 'SEGREDO_LOCAL_NASCIMENTO',
  'SEGREDO_HASH',
];
const INTENTIONS = ['INTENCAO_DIA', 'INTENCAO_SEMANA', 'INTENCAO_MES', 'META_MAGIA'];
// Valores numéricos marcados (humor, peso) — improváveis de aparecer nos factos por acaso.
const NUMERIC = ['987654', '"mood"', '"wakeMood"', '"weightGrams"'];

const state = { aiUseIntentions: true };

const full = {
  user: () => ({
    id: 'u1', email: 'segredo_email@example.com', name: 'SEGREDO_NOME', passwordHash: 'SEGREDO_HASH',
    locale: 'PT_PT', timezone: TZ, hemisphere: 'NORTH', aiUseIntentions: state.aiUseIntentions,
  }),
  birthProfile: () => ({
    userId: 'u1', placeName: 'SEGREDO_LOCAL_NASCIMENTO', natalChart: chart, birthDate: toDbDate('1990-07-15'),
    birthTime: '14:30', birthTimeKnown: true, latitude: 38.72, longitude: -9.14, timezone: TZ, birthUtc: new Date(),
  }),
  dailyEntry: () => ({
    intention: 'INTENCAO_DIA', reflection: 'SEGREDO_REFLEXAO', gratitude: 'SEGREDO_GRATIDAO', summary: 'SEGREDO_RESUMO',
    mood: 987654, wakeMood: 987654, wakeNote: 'SEGREDO_NOTA_ACORDAR',
    morningBanishName: 'SEGREDO_BANIMENTO_MANHA', nightBanishName: 'SEGREDO_BANIMENTO_NOITE',
  }),
  week: () => ({
    intention: 'INTENCAO_SEMANA', reflection: 'SEGREDO_REFLEXAO_SEMANA', title: 'SEGREDO_TITULO_SEMANA', weightGrams: 987654,
    dayNotes: [{ date: toDbDate('2026-05-06'), text: 'SEGREDO_NOTA_DIA' }],
  }),
  month: () => ({ intention: 'INTENCAO_MES', reflection: 'SEGREDO_REFLEXAO_MES' }),
  projects: () => [{ area: 'MAGIC', text: 'META_MAGIA', period: 'WEEK' }],
};

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(async () => full.user()) },
    birthProfile: { findUnique: vi.fn(async () => full.birthProfile()), update: vi.fn() },
    dailyEntry: { findUnique: vi.fn(async () => full.dailyEntry()), findMany: vi.fn(async () => [full.dailyEntry()]) },
    week: { findUnique: vi.fn(async () => full.week()), findMany: vi.fn(async () => [full.week()]) },
    month: { findUnique: vi.fn(async () => full.month()) },
    projectIntention: { findMany: vi.fn(async () => full.projects()) },
  },
}));

const { prepareUserPrompt, prepareSignPrompt } = await import('./generate');

const CASES: [UserContentKind, string][] = [
  ['DAY_PERSONAL', '2026-05-06'],
  ['WEEK_PERSONAL', '2026-05-03'],
  ['MONTH_PERSONAL', '2026-05-01'],
  ['MONTH_RITUALS', '2026-05-01'],
];

async function promptText(kind: UserContentKind, start: string): Promise<string> {
  const p = await prepareUserPrompt('u1', kind, start);
  expect(p).not.toBeNull();
  return `${p!.prompt.system}\n${p!.prompt.user}`;
}

describe('privacidade dos prompts', () => {
  beforeEach(() => {
    state.aiUseIntentions = true;
  });

  it.each(CASES)('%s: nenhum dado privado nem identificador', async (kind, start) => {
    const text = await promptText(kind, start);
    for (const s of [...SECRETS, ...NUMERIC]) expect(text, s).not.toContain(s);
  });

  it.each(CASES)('%s: com aiUseIntentions as intenções do período entram', async (kind, start) => {
    const text = await promptText(kind, start);
    expect(text).toContain('META_MAGIA');
    if (kind === 'DAY_PERSONAL') expect(text).toContain('INTENCAO_DIA');
    if (kind === 'WEEK_PERSONAL') expect(text).toContain('INTENCAO_SEMANA');
    if (kind.startsWith('MONTH_')) expect(text).toContain('INTENCAO_MES');
  });

  it.each(CASES)('%s: sem aiUseIntentions não entra nenhuma intenção', async (kind, start) => {
    state.aiUseIntentions = false;
    const text = await promptText(kind, start);
    for (const s of [...INTENTIONS, ...SECRETS]) expect(text, s).not.toContain(s);
    expect(text).not.toContain('"intentions"');
  });

  it('conteúdo por signo não usa dados de utilizador', () => {
    for (const kind of ['DAY_HOROSCOPE', 'WEEK_ENERGY', 'MONTH_ENERGY'] as const) {
      const start = kind === 'MONTH_ENERGY' ? '2026-05-01' : kind === 'WEEK_ENERGY' ? '2026-05-03' : '2026-05-06';
      const p = prepareSignPrompt(kind, start, 'LEO', 'PT_PT');
      const text = `${p.prompt.system}\n${p.prompt.user}`;
      for (const s of [...SECRETS, ...INTENTIONS]) expect(text).not.toContain(s);
      expect(text).not.toMatch(/"time"/);
    }
  });
});
