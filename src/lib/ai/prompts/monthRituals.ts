import type { Locale, Pronouns } from '@prisma/client';
import { eventDates, type PersonalPeriodFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Rituais sugeridos para o mês, em datas de eventos reais do céu. */
export function build(facts: PersonalPeriodFacts, locale: Locale, pronouns: Pronouns = 'NEUTRAL'): PromptPair {
  const dates = [...eventDates(facts)].sort();
  return {
    system: systemPrompt(locale, pronouns),
    user: userPrompt(
      `Suggest 3 to 5 rituals for the month ${facts.from} to ${facts.to}. Each ritual must happen on one of these event dates, and its occasion must be the event on that date: ${dates.join(', ')}. Keep them safe, simple and beginner-friendly, following every ritual rule.`,
      [
        'rituals: 3 to 5 items, each:',
        '  id: any string (ignored)',
        '  title [60]',
        `  date: one of ${dates.join(', ')}`,
        '  occasion [60]: the "name" of the event of that date, in the output language',
        '  intention [160]',
        '  area: one of MAGIC, PERSONAL, LEISURE, PROFESSIONAL, STUDIES',
        '  durationMinutes: integer 5–90',
        '  materials: up to 6 items [60 each], common and inexpensive',
        '  steps: 3 to 7 items [220 each]',
        '  safety [200]: a safety note (candles supervised, nothing ingested…)',
      ],
      facts,
      locale,
    ),
  };
}
