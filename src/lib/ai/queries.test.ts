import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayInTz } from '@/lib/dates';
import ritualsValid from '../../../tests/fixtures/ai/month-rituals.valid.json';
import { minPromptVersion } from './prompts/system';

vi.mock('server-only', () => ({}));

const TZ = 'Europe/Lisbon';
const today = todayInTz(TZ);
const rows = vi.hoisted(() => ({ rituals: null as null | { payload: unknown; promptVersion: number } }));

vi.mock('@/lib/astro/ensureNatalChart', () => ({ ensureNatalChart: vi.fn(async () => ({ bodies: { SUN: { sign: 'LIBRA' } } })) }));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(async () => ({ locale: 'PT_BR', timezone: TZ })) },
    userAiContent: {
      findUnique: vi.fn(async ({ where }: { where: { userId_kind_periodStart_locale: { kind: string } } }) =>
        where.userId_kind_periodStart_locale.kind === 'MONTH_RITUALS' ? rows.rituals : null,
      ),
    },
  },
}));

const { getDayReading } = await import('./queries');

// Rituais gravados antes da v5 (sem "porquê"), com um deles marcado para hoje.
const oldRituals = {
  rituals: ritualsValid.rituals.map(({ why: _w, materialsWhy: _m, ...r }, i) => ({ ...r, id: `r${i}`, date: i === 0 ? today : r.date })),
};

describe('getDayReading — ritual de hoje', () => {
  beforeEach(() => {
    rows.rituals = null;
  });

  it('rituais de uma versão antiga: mostra o de hoje e pede a versão nova', async () => {
    rows.rituals = { payload: oldRituals, promptVersion: minPromptVersion('MONTH_RITUALS') - 1 };
    const r = await getDayReading('u1', today);
    expect(r.ritualToday?.title).toBe(oldRituals.rituals[0]!.title);
    expect(r.pending).toContainEqual({ kind: 'MONTH_RITUALS', periodStart: `${today.slice(0, 7)}-01` });
  });

  it('rituais actuais: não pede nada', async () => {
    rows.rituals = { payload: oldRituals, promptVersion: minPromptVersion('MONTH_RITUALS') };
    const r = await getDayReading('u1', today);
    expect(r.pending.some((p) => p.kind === 'MONTH_RITUALS')).toBe(false);
  });

  it('sem rituais: não os pede a partir de Hoje (isso fica para o Mês)', async () => {
    const r = await getDayReading('u1', today);
    expect(r.ritualToday).toBeNull();
    expect(r.pending.some((p) => p.kind === 'MONTH_RITUALS')).toBe(false);
  });
});
