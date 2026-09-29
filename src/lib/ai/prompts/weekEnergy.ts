import type { Locale, ZodiacSign } from '@prisma/client';
import type { PeriodFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Energia da semana para um signo solar (partilhada). */
export function build(facts: PeriodFacts & { sign: ZodiacSign }, locale: Locale): PromptPair {
  return {
    system: systemPrompt(locale),
    user: userPrompt(
      `Write the energy of the week ${facts.from} to ${facts.to} for people whose Sun sign is ${facts.sign}.`,
      [
        'headline [80]',
        'overview [650]',
        `highlights: up to 4 items { date: YYYY-MM-DD between ${facts.from} and ${facts.to}, preferably a date from the facts; note [160] }`,
      ],
      facts,
      locale,
    ),
  };
}
