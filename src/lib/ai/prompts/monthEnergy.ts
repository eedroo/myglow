import type { Locale, ZodiacSign } from '@prisma/client';
import type { PeriodFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Energia do mês para um signo solar (partilhada). */
export function build(facts: PeriodFacts & { sign: ZodiacSign }, locale: Locale): PromptPair {
  return {
    system: systemPrompt(locale),
    user: userPrompt(
      `Write the energy of the month ${facts.from} to ${facts.to} for people whose Sun sign is ${facts.sign}.`,
      [
        'headline [80]',
        'overview [950]',
        `keyDates: up to 6 items { date: YYYY-MM-DD from the moonEvents or skyEvents in the facts; note [180] }`,
      ],
      facts,
    ),
  };
}
