import { describe, expect, it } from 'vitest';
import { pendingAnnouncements } from './rules';
import { checkWhatsNew } from './content';
import type { Release } from './schema';

const release: Release = {
  id: 'r1',
  date: '2026-09-30',
  items: [
    { icon: 'grimoire', href: '/grimoire', text: { 'pt-BR': 'Grimório', 'pt-PT': 'Grimório PT', en: 'Grimoire' } },
    { icon: 'sparkles', text: { 'pt-BR': 'Outra', 'pt-PT': 'Outra PT', en: 'Other' } },
  ],
};
const courses = [
  { slug: 'rituais', title: 'Rituais do cotidiano', icon: 'candle' as const, publishedAt: '2026-10-05' },
  { slug: 'vida-magica', title: 'A sua vida mágica', icon: 'sparkles' as const },
];

describe('pendingAnnouncements', () => {
  it('quem já usava a app vê cursos e lançamentos novos, mais recentes primeiro, na sua língua', () => {
    const items = pendingAnnouncements({ releases: [release], courses, userSince: '2026-09-01', seen: new Set(), locale: 'pt-PT' });
    expect(items.map((i) => i.key)).toEqual(['course:rituais', 'release:r1', 'release:r1']);
    expect(items[0]).toMatchObject({ courseTitle: 'Rituais do cotidiano', href: '/grimoire#region-rituais' });
    expect(items[1]!.text).toBe('Grimório PT');
  });

  it('o que já foi visto não volta; cursos sem data não são anunciados', () => {
    const seen = new Set(['release:r1']);
    expect(pendingAnnouncements({ releases: [release], courses, userSince: '2026-09-01', seen, locale: 'en' }).map((i) => i.key)).toEqual([
      'course:rituais',
    ]);
  });

  it('quem se registou depois do lançamento não o vê como novidade', () => {
    expect(pendingAnnouncements({ releases: [release], courses, userSince: '2026-10-10', seen: new Set(), locale: 'pt-BR' })).toEqual([]);
    expect(pendingAnnouncements({ releases: [release], courses, userSince: '2026-09-30', seen: new Set(), locale: 'pt-BR' }).map((i) => i.key)).toEqual([
      'course:rituais',
    ]);
  });
});

describe('content/whats-new.json', () => {
  it('valida', () => {
    expect(checkWhatsNew()).toEqual([]);
  });
});
