import { beforeEach, describe, expect, it, vi } from 'vitest';
import { zodResponseFormat } from 'openai/helpers/zod';
import { toDbDate } from '@/lib/dates';
import { weekRecapPeriod } from '@/lib/recap/period';
import { wireSchema } from '@/lib/ai/schemas';

/**
 * Privacidade do Guia (F14): o mock devolve SEMPRE registos completos (ignora os `select`), com marcadores
 * únicos nos campos que nunca podem seguir. Só a reflexão, as intenções, etc. podem aparecer no prompt.
 */
vi.mock('server-only', () => ({}));

const NEVER = ['SEGREDO_NOME', 'segredo_email@example.com', 'SEGREDO_HASH', 'SEGREDO_NOTA_ACORDAR', 'SEGREDO_LOCAL_NASCIMENTO', '987654'];
const state = { wellbeing: true, includeBody: false, bodyPro: true };
vi.mock('@/lib/entitlements/server', () => ({ getEntitlements: vi.fn(async () => ({ plan: 'PREMIUM', features: { 'body-pro': state.bodyPro, guide: true } })) }));

const entry = (date: string) => ({
  id: `e-${date}`, userId: 'u1', date: toDbDate(date), moonPhase: 'FULL_MOON', moonSign: 'ARIES',
  intention: 'INTENCAO_DIA', reflection: 'REFLEXAO_VISIVEL', gratitude: 'GRATIDAO', summary: 'RESUMO',
  morningBanishName: 'BANIMENTO', nightBanishName: 'BANIMENTO_NOITE', wakeNote: 'SEGREDO_NOTA_ACORDAR',
  mood: 4, wakeMood: 3, morningBanishDone: true, morningRitualDone: true, sleepGoalMet: true,
  stretchDone: true, workoutDone: false, waterDone: true, nightBanishDone: false, nightRitualDone: true,
});

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(async () => ({
        id: 'u1', name: 'SEGREDO_NOME', email: 'segredo_email@example.com', passwordHash: 'SEGREDO_HASH',
        locale: 'PT_BR', timezone: 'America/Sao_Paulo', wellbeingConsentAt: state.wellbeing ? new Date() : null, guideIncludeBody: state.includeBody,
        birthProfile: { placeName: 'SEGREDO_LOCAL_NASCIMENTO', birthDate: toDbDate('1990-07-15') },
      })),
    },
    birthProfile: { findUnique: vi.fn(async () => ({ placeName: 'SEGREDO_LOCAL_NASCIMENTO' })) },
    dailyEntry: { findMany: vi.fn(async () => ['2026-10-19', '2026-10-20', '2026-10-21'].map(entry)) },
    week: {
      findMany: vi.fn(async () => [{
        startDate: toDbDate('2026-10-18'), intention: 'INTENCAO_SEMANA', reflection: 'REFLEXAO_SEMANA', title: 'TITULO',
        weightGrams: 987654, dayNotes: [{ date: toDbDate('2026-10-20'), text: 'NOTA_DIA' }],
      }]),
    },
    projectIntention: {
      findMany: vi.fn(async () => [{ period: 'WEEK', periodStart: toDbDate('2026-10-18'), area: 'MAGIC', text: 'META_MAGIA' }]),
    },
    month: { findUnique: vi.fn(async () => null) },
    xpEvent: { aggregate: vi.fn(async () => ({ _sum: { points: 55 } })) },
    lessonProgress: { count: vi.fn(async () => 2) },
    guideReport: { findUnique: vi.fn(async () => null) },
    // F17: registos diários com marcadores que nunca podem seguir (só médias).
    bodyWeightEntry: {
      findMany: vi.fn(async () => [
        { date: toDbDate('2026-10-12'), grams: 76111 },
        { date: toDbDate('2026-10-19'), grams: 76333 },
        { date: toDbDate('2026-10-21'), grams: 76777 },
      ]),
    },
    bodyGoal: { findUnique: vi.fn(async () => ({ direction: 'GAIN', weeklyRateGrams: 250, targetGrams: 78000 })) },
    fitnessSession: {
      findMany: vi.fn(async () => [
        { date: toDbDate('2026-10-20'), sets: [{ reps: 10, weightGrams: 60000, prKinds: ['weight'], exercise: { names: { en: 'Bench press', 'pt-BR': 'Supino reto' } } }] },
      ]),
    },
  },
}));

const { loadGuideData } = await import('./server');
const { buildGuideInput } = await import('./input');
const { buildGuideMessages } = await import('./prompt');
const { guideReportSchema } = await import('./schema');

async function messages(): Promise<string> {
  const data = await loadGuideData('u1', weekRecapPeriod('2026-10-18'));
  const input = buildGuideInput(data!.raw, { hasWellbeingConsent: data!.hasWellbeingConsent, includeBody: data!.includeBody });
  const m = buildGuideMessages(input);
  return `${m.system}\n${m.user}`;
}

describe('privacidade do Guia', () => {
  beforeEach(() => {
    state.wellbeing = true;
    state.includeBody = false;
    state.bodyPro = true;
  });

  it('F17: sem guideIncludeBody, nada do corpo', async () => {
    const all = await messages();
    for (const s of ['Supino', 'thisWeekAvgGrams', '76333']) expect(all, s).not.toContain(s);
    expect(JSON.parse(all.slice(all.indexOf('\n{') + 1))).not.toHaveProperty('body');
  });

  it('F17: com guideIncludeBody, só agregados (nunca registos diários)', async () => {
    state.includeBody = true;
    const all = await messages();
    const input = JSON.parse(all.slice(all.indexOf('\n{') + 1));
    expect(input.body.weight).toMatchObject({ thisWeekAvgGrams: 76555, lastWeekAvgGrams: 76111, weighIns: 2, goal: { direction: 'GAIN', weeklyRateGrams: 250 } });
    expect(input.body.training).toMatchObject({ sessions: 1, sets: 1, prs: 1, topExercises: [{ name: 'Supino reto', sets: 1 }] });
    for (const s of ['76333', '76777', '78000', 'targetGrams']) expect(all, s).not.toContain(s);
  });

  it('F17: sem body-pro ou sem consentimento de bem-estar, nada do corpo', async () => {
    state.includeBody = true;
    state.bodyPro = false;
    expect(await messages()).not.toContain('thisWeekAvgGrams');
    state.bodyPro = true;
    state.wellbeing = false;
    expect(await messages()).not.toContain('thisWeekAvgGrams');
  });

  it('nome, email, peso, nota de acordar e local de nascimento nunca seguem', async () => {
    const all = await messages();
    for (const s of NEVER) expect(all, s).not.toContain(s);
  });

  it('o que é suposto seguir segue', async () => {
    const all = await messages();
    for (const s of ['REFLEXAO_VISIVEL', 'INTENCAO_DIA', 'INTENCAO_SEMANA', 'REFLEXAO_SEMANA', 'META_MAGIA', 'NOTA_DIA']) {
      expect(all).toContain(s);
    }
  });

  it('humor só como média e só com consentimento de bem-estar', async () => {
    const withConsent = await messages();
    expect(withConsent).toContain('"avgMood":4');
    expect(withConsent).not.toContain('"mood"');
    state.wellbeing = false;
    const without = await messages();
    expect(without).not.toContain('avgMood');
    expect(without).not.toContain('wellbeing');
  });

  it('o esquema de saída serve para saída estruturada estrita', () => {
    expect(() => zodResponseFormat(wireSchema(guideReportSchema), 'guide_report')).not.toThrow();
  });
});
