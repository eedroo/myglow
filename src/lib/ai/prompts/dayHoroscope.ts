import type { Locale, ZodiacSign } from '@prisma/client';
import type { DayFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Horóscopo do dia para um signo solar (partilhado; factos sem horas). */
export function build(facts: DayFacts & { sign: ZodiacSign }, locale: Locale): PromptPair {
  return {
    system: systemPrompt(locale),
    user: userPrompt(
      `Write today's horoscope (${facts.date}) for people whose Sun sign is ${facts.sign}. Relate the sky of the day (Moon phase and sign, Sun, retrogrades, events) to that sign.`,
      [
        'headline [80]: evocative one-line title',
        'energy [450]: the energy of the day for this sign',
        'advice [220]: one gentle, practical suggestion',
        'keywords: exactly 3 single words or short phrases [24 each]',
        'crystal: { name [40], why [140] } — a crystal of the day and why it fits',
      ],
      facts,
    ),
  };
}
