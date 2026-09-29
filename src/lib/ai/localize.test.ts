import { describe, expect, it } from 'vitest';
import { localizeFacts } from './localize';

describe('localizeFacts', () => {
  const facts = {
    skyEvents: [
      { type: 'STATION', label: 'VENUS stations retrograde in SCORPIO', date: '2026-10-03' },
      { type: 'SUN_INGRESS', label: 'Sun enters LIBRA', date: '2026-09-23' },
      { type: 'SABBAT', label: 'MABON', date: '2026-09-23' },
      { type: 'SEASON', label: 'SEPTEMBER_EQUINOX', date: '2026-09-23' },
    ],
    moonEvents: [{ phase: 'FULL_MOON', date: '2026-09-26', sign: 'ARIES' }],
    keyAspects: [{ transit: 'MERCURY', natal: 'SUN', type: 'TRINE', orb: 1, label: 'MERCURY_TRINE_NATAL_SUN', date: '2026-09-29' }],
  };

  it('acrescenta nomes na língua de saída e mantém os identificadores', () => {
    const out = localizeFacts(facts, 'PT_BR') as typeof facts & Record<string, { name: string }[]>;
    expect(out.skyEvents.map((e) => (e as { name?: string }).name)).toEqual([
      'Vênus fica retrógrado em Escorpião',
      'O Sol entra em Libra',
      'Mabon',
      'Equinócio de setembro',
    ]);
    expect((out.moonEvents[0] as { name?: string }).name).toBe('Lua Cheia em Áries');
    expect((out.keyAspects[0] as { name?: string }).name).toBe('Mercúrio trígono Sol natal');
    expect(out.keyAspects[0]!.label).toBe('MERCURY_TRINE_NATAL_SUN');
  });

  it('PT-PT e EN usam os seus nomes', () => {
    const pt = localizeFacts(facts, 'PT_PT') as { moonEvents: { name: string }[] };
    expect(pt.moonEvents[0]!.name).toBe('Lua Cheia em Carneiro');
    const en = localizeFacts(facts, 'EN') as { keyAspects: { name: string }[] };
    expect(en.keyAspects[0]!.name).toBe('Mercury trine natal Sun');
  });
});
