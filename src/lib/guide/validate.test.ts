import { describe, expect, it } from 'vitest';
import { buildGuideInput } from './input';
import { rawWeek, validReport } from './fixtures';
import { normalize, validateGuideReport } from './validate';

const input = buildGuideInput(rawWeek([{ date: '2026-10-19', intention: 'Calma' }, { date: '2026-10-20', intention: 'Foco' }]), {
  hasWellbeingConsent: true,
});

describe('validateGuideReport', () => {
  it('resposta válida passa', () => {
    expect(validateGuideReport(validReport, input)).toEqual({ ok: true });
  });

  it('evidência fora do período falha', () => {
    const r = { ...validReport, continue: [{ ...validReport.continue[0]!, evidence: ['2026-10-30'] }] };
    expect(validateGuideReport(r, input).ok).toBe(false);
  });

  it('evidência de um dia que não está no input falha', () => {
    const r = { ...validReport, patterns: [{ text: 'Padrão', evidence: ['2026-10-22'] }] };
    expect(validateGuideReport(r, input).ok).toBe(false);
  });

  it('área sem meta falha', () => {
    const r = { ...validReport, areas: [{ area: 'STUDIES' as const, status: 'aligned' as const, observed: 'Estudou.' }] };
    expect(validateGuideReport(r, input)).toMatchObject({ ok: false });
  });

  it('"dieta" falha', () => {
    const r = { ...validReport, improve: [{ title: 'Comer', detail: 'Pense numa dieta mais leve.', evidence: [] }] };
    expect(validateGuideReport(r, input)).toMatchObject({ ok: false, reason: expect.stringContaining('dieta') });
  });

  it('"presença" e "presence" falham', () => {
    expect(validateGuideReport({ ...validReport, opening: `${validReport.opening} Mais presença.` }, input).ok).toBe(false);
    expect(validateGuideReport({ ...validReport, opening: `${validReport.opening} More presence.` }, input).ok).toBe(false);
  });

  it('travessão falha', () => {
    expect(validateGuideReport({ ...validReport, opening: `${validReport.opening} — e mais.` }, input).ok).toBe(false);
  });

  it('normalize tira espaços a mais', () => {
    expect(normalize({ ...validReport, opening: '  Uma   frase  ' }).opening).toBe('Uma frase');
  });
});
