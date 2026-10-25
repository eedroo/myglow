import { describe, expect, it } from 'vitest';
import { LIMITS, buildGuideInput, clip, inputHash, isSufficient, redact, textDays } from './input';
import { rawWeek } from './fixtures';

const withText = (n: number) =>
  Array.from({ length: n }, (_, k) => ({ date: `2026-10-${String(18 + k).padStart(2, '0')}`, intention: `Intenção ${k}` }));

describe('redact e clip', () => {
  it('retira email e telefone', () => {
    const out = redact('escreve-me para ana@x.pt ou 912 345 678');
    expect(out).not.toContain('ana@x.pt');
    expect(out).not.toContain('912');
    expect(out).toContain('escreve-me para');
  });

  it('retira URLs e mantém datas', () => {
    const out = redact('ver https://exemplo.com/a e www.site.pt no dia 2026-10-18');
    expect(out).not.toContain('exemplo.com');
    expect(out).not.toContain('www.site.pt');
    expect(out).toContain('2026-10-18');
  });

  it('corta pelo limite', () => {
    expect(Array.from(clip('a'.repeat(800), 500))).toHaveLength(500);
  });
});

describe('buildGuideInput', () => {
  it('campo com 800 caracteres: 500 na semana, 200 no mês', () => {
    const long = 'x'.repeat(800);
    const week = buildGuideInput(rawWeek([{ date: '2026-10-19', reflection: long }]), { hasWellbeingConsent: true });
    expect(Array.from(week.days[0]!.reflection!)).toHaveLength(LIMITS.dayField);
    const month = buildGuideInput(rawWeek([{ date: '2026-10-19', reflection: long }], { kind: 'MONTH', from: '2026-10-01', to: '2026-10-31' }), {
      hasWellbeingConsent: true,
    });
    expect(Array.from(month.days[0]!.reflection!)).toHaveLength(LIMITS.dayFieldMonth);
  });

  it('acima de totalChars: só intenção e reflexão por dia', () => {
    const big = 'palavra '.repeat(70);
    const entries = Array.from({ length: 7 }, (_, k) => ({
      date: `2026-10-${String(18 + k).padStart(2, '0')}`,
      intention: 'Foco',
      reflection: 'Dia calmo',
      gratitude: big,
      summary: big,
      morningBanishName: big,
      nightBanishName: big,
    }));
    const notes = Object.fromEntries(entries.map((e) => [e.date, big]));
    const input = buildGuideInput(rawWeek(entries, { dayNotes: notes }), { hasWellbeingConsent: true });
    expect(JSON.stringify(input).length).toBeLessThanOrEqual(LIMITS.totalChars);
    expect(input.days).toHaveLength(7);
    for (const d of input.days) {
      expect(d).toMatchObject({ intention: 'Foco', reflection: 'Dia calmo' });
      expect(d.gratitude).toBeUndefined();
      expect(d.dayNote).toBeUndefined();
    }
  });

  it('suficiente: 3 dias com texto, ou a reflexão do período', () => {
    const two = buildGuideInput(rawWeek(withText(2)), { hasWellbeingConsent: true });
    expect(textDays(two)).toBe(2);
    expect(isSufficient(two)).toBe(false);
    expect(isSufficient(buildGuideInput(rawWeek(withText(3)), { hasWellbeingConsent: true }))).toBe(true);
    const reflected = rawWeek(withText(2));
    reflected.period.reflection = 'Uma semana boa';
    expect(isSufficient(buildGuideInput(reflected, { hasWellbeingConsent: true }))).toBe(true);
  });

  it('sem consentimento de bem-estar: sem numbers.wellbeing', () => {
    const raw = rawWeek([{ date: '2026-10-19', intention: 'x', mood: 4 }]);
    expect(buildGuideInput(raw, { hasWellbeingConsent: false }).numbers.wellbeing).toBeUndefined();
    expect(buildGuideInput(raw, { hasWellbeingConsent: true }).numbers.wellbeing).toBeDefined();
  });

  it('inputHash estável para o mesmo input', () => {
    const a = buildGuideInput(rawWeek(withText(3)), { hasWellbeingConsent: true });
    const b = buildGuideInput(rawWeek(withText(3)), { hasWellbeingConsent: true });
    expect(inputHash(a)).toBe(inputHash(b));
    expect(inputHash(a)).not.toBe(inputHash(buildGuideInput(rawWeek(withText(4)), { hasWellbeingConsent: true })));
  });
});
