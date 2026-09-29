import type { Locale } from '@prisma/client';
import type { PersonalPeriodFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Leitura pessoal do mês. */
export function build(facts: PersonalPeriodFacts, locale: Locale): PromptPair {
  return {
    system: systemPrompt(locale),
    user: userPrompt(
      `Write a personal reading for the month ${facts.from} to ${facts.to}, based on the exact transits to this person's natal chart ("keyAspects") and the sky of the month.`,
      [
        'headline [80]',
        'reading [1100]',
        'focusAreas: up to 3 items { area: one of MAGIC, PERSONAL, LEISURE, PROFESSIONAL, STUDIES; note [180] }',
      ],
      facts,
    ),
  };
}
