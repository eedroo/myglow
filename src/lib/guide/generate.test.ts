import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawGuideData } from './input';
import { rawWeek, validReport } from './fixtures';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  completeJson: vi.fn(),
  upsert: vi.fn(),
  report: { current: null as null | { status: string; inputHash: string | null; regenerations: number } },
  user: { current: { timezone: 'America/Sao_Paulo', guideConsentAt: new Date(), guideConsentVersion: '2026-11' } as Record<string, unknown> | null },
  guide: { current: true },
  raw: { current: null as unknown },
  captureMessage: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ captureMessage: mocks.captureMessage }));
vi.mock('@/lib/env', async (orig) => ({ ...(await orig<typeof import('@/lib/env')>()), guideModel: () => 'modelo-guia' }));
vi.mock('@/lib/ai/openai', () => ({ completeJson: mocks.completeJson }));
vi.mock('@/lib/entitlements/server', () => ({ getEntitlements: vi.fn(async () => ({ features: { guide: mocks.guide.current } })) }));
vi.mock('./server', () => ({ loadGuideData: vi.fn(async () => ({ raw: mocks.raw.current, hasWellbeingConsent: true })) }));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(async () => mocks.user.current) },
    guideReport: {
      findUnique: vi.fn(async () => mocks.report.current),
      upsert: mocks.upsert,
    },
  },
}));

const { generateGuideReport } = await import('./generate');

const days = (n: number) =>
  Array.from({ length: n }, (_, k) => ({ date: `2026-10-${String(18 + k).padStart(2, '0')}`, intention: `Intenção ${k}` }));
const reply = (data: unknown) => ({ data, raw: JSON.stringify(data), usage: { input: 1000, output: 400 } });
const invalid = { ...validReport, improve: [{ title: 'Comer', detail: 'Uma dieta leve ajuda.', evidence: [] }] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.report.current = null;
  mocks.user.current = { timezone: 'America/Sao_Paulo', guideConsentAt: new Date(), guideConsentVersion: '2026-11' };
  mocks.guide.current = true;
  mocks.raw.current = rawWeek(days(3)) as RawGuideData;
});

const savedStatus = () => mocks.upsert.mock.calls.at(-1)?.[0].create.status;

describe('generateGuideReport', () => {
  it('sem consentimento: skipped e IA não chamada', async () => {
    mocks.user.current = { timezone: 'UTC', guideConsentAt: null, guideConsentVersion: null };
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('skipped');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });

  it('consentimento de outra versão do texto: skipped', async () => {
    mocks.user.current = { timezone: 'UTC', guideConsentAt: new Date(), guideConsentVersion: '2020-01' };
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('skipped');
  });

  it('sem acesso ao Guia: skipped', async () => {
    mocks.guide.current = false;
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('skipped');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });

  it('período por acabar: skipped', async () => {
    expect(await generateGuideReport('u1', 'WEEK', '2099-01-04')).toBe('skipped');
  });

  it('insuficiente: INSUFFICIENT sem chamada', async () => {
    mocks.raw.current = rawWeek(days(2));
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('INSUFFICIENT');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });

  it('sofrimento no input: SUPPORT sem chamada', async () => {
    mocks.raw.current = rawWeek([...days(3), { date: '2026-10-22', reflection: 'Às vezes quero morrer.' }]);
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('SUPPORT');
    expect(mocks.completeJson).not.toHaveBeenCalled();
    expect(mocks.upsert.mock.calls[0]![0].create.payload).not.toEqual(expect.objectContaining({ opening: expect.anything() }));
  });

  it('primeira inválida, segunda válida: READY gravado 1×', async () => {
    mocks.completeJson.mockResolvedValueOnce(reply(invalid)).mockResolvedValueOnce(reply(validReport));
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('READY');
    expect(mocks.completeJson).toHaveBeenCalledTimes(2);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert.mock.calls[0]![0].create).toMatchObject({
      status: 'READY', model: 'modelo-guia', inputTokens: 2000, outputTokens: 800, payload: expect.objectContaining({ opening: validReport.opening }),
    });
  });

  it('duas inválidas: FAILED sem conteúdo', async () => {
    mocks.completeJson.mockResolvedValue(reply(invalid));
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('FAILED');
    expect(savedStatus()).toBe('FAILED');
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.captureMessage.mock.calls[0])).not.toContain('dieta');
  });

  it('safety.distress na resposta: SUPPORT e a resposta é descartada', async () => {
    mocks.completeJson.mockResolvedValueOnce(reply({ ...validReport, safety: { distress: true } }));
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('SUPPORT');
    expect(mocks.upsert.mock.calls[0]![0].create.status).toBe('SUPPORT');
    expect(JSON.stringify(mocks.upsert.mock.calls[0]![0].create)).not.toContain(validReport.opening);
  });

  it('já existe READY: skipped', async () => {
    mocks.report.current = { status: 'READY', inputHash: 'x', regenerations: 0 };
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18')).toBe('skipped');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });

  it('regenerar com o mesmo inputHash: skipped', async () => {
    mocks.completeJson.mockResolvedValue(reply(validReport));
    await generateGuideReport('u1', 'WEEK', '2026-10-18');
    const hash = mocks.upsert.mock.calls[0]![0].create.inputHash as string;
    mocks.report.current = { status: 'READY', inputHash: hash, regenerations: 0 };
    vi.clearAllMocks();
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18', { regenerate: true })).toBe('skipped');
    expect(mocks.completeJson).not.toHaveBeenCalled();
  });

  it('regenerar 2×: a segunda recusa', async () => {
    mocks.completeJson.mockResolvedValue(reply(validReport));
    mocks.report.current = { status: 'READY', inputHash: 'antigo', regenerations: 0 };
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18', { regenerate: true })).toBe('READY');
    expect(mocks.upsert.mock.calls[0]![0].update).toMatchObject({ regenerations: { increment: 1 }, rating: null });
    mocks.report.current = { status: 'READY', inputHash: 'outro', regenerations: 1 };
    expect(await generateGuideReport('u1', 'WEEK', '2026-10-18', { regenerate: true })).toBe('skipped');
    expect(mocks.completeJson).toHaveBeenCalledTimes(1);
  });
});
