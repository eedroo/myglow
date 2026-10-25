import { describe, expect, it } from 'vitest';
import { buildGuideInput } from './input';
import { rawWeek } from './fixtures';
import { detectDistress, supportContacts } from './safety';

const inputWith = (reflection: string) =>
  buildGuideInput(rawWeek([{ date: '2026-10-19', reflection }]), { hasWellbeingConsent: false });

describe('detectDistress', () => {
  it('reflexão com expressão de risco', () => {
    expect(detectDistress(inputWith('Hoje pensei que não quero viver assim.'))).toBe(true);
    expect(detectDistress(inputWith('Some days I want to die.'))).toBe(true);
  });

  it('texto neutro', () => {
    expect(detectDistress(inputWith('Dia tranquilo, cortei o cabelo e bebi água.'))).toBe(false);
  });

  it('também na reflexão do período', () => {
    const raw = rawWeek([]);
    raw.period.reflection = 'Pensei em suicídio esta semana.';
    expect(detectDistress(buildGuideInput(raw, { hasWellbeingConsent: false }))).toBe(true);
  });
});

describe('supportContacts', () => {
  it('pt-BR inclui o CVV 188', () => {
    expect(supportContacts('pt-BR').map((c) => c.value)).toContain('188');
  });

  it('pt-PT inclui o SNS 24 e o 112', () => {
    expect(supportContacts('pt-PT').map((c) => c.value)).toEqual(expect.arrayContaining(['808 24 24 24', '112']));
  });
});
