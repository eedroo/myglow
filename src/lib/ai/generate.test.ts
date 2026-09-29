import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeNatalChart } from '@/lib/astro/natal';
import { toBirthUtc } from '@/lib/birth';
import dayPersonalValid from '../../../tests/fixtures/ai/day-personal.valid.json';
import dayPersonalInvented from '../../../tests/fixtures/ai/day-personal.invented-transit.json';
import dayPersonalTooLong from '../../../tests/fixtures/ai/day-personal.too-long.json';
import ritualsValid from '../../../tests/fixtures/ai/month-rituals.valid.json';
import horoscopeValid from '../../../tests/fixtures/ai/day-horoscope.valid.json';

vi.mock('server-only', () => ({}));

const TZ = 'Europe/Lisbon';
const chart = computeNatalChart({
  birthUtc: toBirthUtc('1990-07-15', '14:30', TZ), latitude: 38.72, longitude: -9.14, timeKnown: true,
  birthDate: '1990-07-15', birthTz: TZ,
});

const mocks = vi.hoisted(() => ({
  completeJson: vi.fn(),
  existing: null as null | { payload: unknown },
  userAiUpsert: vi.fn(),
  signUpsert: vi.fn(),
}));

vi.mock('./openai', () => ({
  completeJson: mocks.completeJson,
  modelFor: (kind: string) => (kind.startsWith('MONTH_') ? 'rich-model' : 'daily-model'),
}));
vi.mock('@/lib/astro/ensureNatalChart', () => ({ ensureNatalChart: vi.fn(async () => chart) }));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(async () => ({ locale: 'PT_PT', timezone: TZ, hemisphere: 'NORTH', aiUseIntentions: false })) },
    userAiContent: { findUnique: vi.fn(async () => mocks.existing), upsert: mocks.userAiUpsert },
    signContent: { findUnique: vi.fn(async () => mocks.existing), upsert: mocks.signUpsert },
  },
}));

const { generateSignContent, generateUserContent } = await import('./generate');

const reply = (data: unknown) => ({ data, raw: JSON.stringify(data) });

describe('generateUserContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existing = null;
  });

  it('primeira resposta inválida + segunda válida → grava 1× (com a razão no retry)', async () => {
    mocks.completeJson.mockResolvedValueOnce(reply(dayPersonalInvented)).mockResolvedValueOnce(reply(dayPersonalValid));
    expect(await generateUserContent('u1', 'DAY_PERSONAL', '2026-05-06')).toBe('saved');
    expect(mocks.completeJson).toHaveBeenCalledTimes(2);
    const retryMessages = mocks.completeJson.mock.calls[1]![0].messages;
    expect(retryMessages.at(-1).content).toMatch(/PLUTO_SQUARE_NATAL_SUN/);
    expect(mocks.userAiUpsert).toHaveBeenCalledTimes(1);
    const arg = mocks.userAiUpsert.mock.calls[0]![0];
    expect(arg.create).toMatchObject({ kind: 'DAY_PERSONAL', locale: 'PT_PT', model: 'daily-model', promptVersion: 1 });
  });

  it('duas respostas inválidas (Zod ou semântica) → não grava', async () => {
    mocks.completeJson.mockResolvedValueOnce(reply(dayPersonalTooLong)).mockResolvedValueOnce(reply(dayPersonalInvented));
    expect(await generateUserContent('u1', 'DAY_PERSONAL', '2026-05-06')).toBe('invalid');
    expect(mocks.userAiUpsert).not.toHaveBeenCalled();
  });

  it('conteúdo já existente → não chama a OpenAI', async () => {
    mocks.existing = { payload: dayPersonalValid };
    expect(await generateUserContent('u1', 'DAY_PERSONAL', '2026-05-06')).toBe('exists');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });

  it('conteúdo existente mas inválido (ex.: esquema antigo) → gera de novo', async () => {
    mocks.existing = { payload: { headline: 'antigo' } };
    mocks.completeJson.mockResolvedValueOnce(reply(dayPersonalValid));
    expect(await generateUserContent('u1', 'DAY_PERSONAL', '2026-05-06')).toBe('saved');
  });

  it('rituais: modelo RICH e ids gerados em código', async () => {
    mocks.completeJson.mockResolvedValueOnce(reply(ritualsValid));
    expect(await generateUserContent('u1', 'MONTH_RITUALS', '2026-05-01')).toBe('saved');
    const arg = mocks.userAiUpsert.mock.calls[0]![0];
    expect(arg.create.model).toBe('rich-model');
    expect(arg.create.payload.rituals.map((r: { id: string }) => r.id)).toEqual([
      '2026-05-01-libertar-com-a-lua-cheia',
      '2026-05-16-semear-na-lua-nova',
      '2026-05-23-balanco-do-quarto-crescente',
    ]);
  });
});

describe('generateSignContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existing = null;
  });

  it('grava o horóscopo com o modelo diário', async () => {
    mocks.completeJson.mockResolvedValueOnce(reply(horoscopeValid));
    expect(await generateSignContent('DAY_HOROSCOPE', '2026-05-06', 'CANCER', 'PT_PT')).toBe('saved');
    expect(mocks.signUpsert.mock.calls[0]![0].create).toMatchObject({ sign: 'CANCER', model: 'daily-model' });
  });

  it('já existente → não chama a OpenAI', async () => {
    mocks.existing = { payload: horoscopeValid };
    expect(await generateSignContent('DAY_HOROSCOPE', '2026-05-06', 'CANCER', 'PT_PT')).toBe('exists');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });
});
