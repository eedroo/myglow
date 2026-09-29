import type { Locale, Pronouns } from '@prisma/client';
import type { PersonalPeriodFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Leitura pessoal da semana. */
export function build(facts: PersonalPeriodFacts, locale: Locale, pronouns: Pronouns = 'NEUTRAL'): PromptPair {
  return {
    system: systemPrompt(locale, pronouns),
    user: userPrompt(
      `Write a personal reading for the week ${facts.from} to ${facts.to}, based on the exact transits to this person's natal chart ("keyAspects") and the sky of the week.`,
      [
        'headline [80]',
        'reading [850]',
        'focusAreas: up to 3 items { area: one of MAGIC, PERSONAL, LEISURE, PROFESSIONAL, STUDIES; note [160] } — where to put energy this week',
      ],
      facts,
      locale,
    ),
  };
}
