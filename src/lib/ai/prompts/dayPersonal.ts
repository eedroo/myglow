import type { Locale, Pronouns } from '@prisma/client';
import type { PersonalDayFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/** Leitura pessoal do dia: trânsitos ao mapa natal. */
export function build(facts: PersonalDayFacts, locale: Locale, pronouns: Pronouns = 'NEUTRAL'): PromptPair {
  return {
    system: systemPrompt(locale, pronouns),
    user: userPrompt(
      `Write a personal reading for ${facts.date} based on the transits to this person's natal chart ("aspects"), the house the Moon transits ("moonTransitHouse", whole-sign; ignore if null) and the sky of the day. If "moonSignUncertain" is true, do not rely on the natal Moon sign.`,
      [
        'headline [80]',
        'reading [650]: the personal reading',
        'transits: up to 3 items { label: exact "label" identifier from facts.aspects (only here), meaning [180] } — empty if there are no aspects',
        'intentionSuggestion [120]: a short intention for the day, written in first person',
        'banishSuggestion [120]: something to release or banish today (a habit, feeling or pattern), short',
        'reflectionQuestion [140]: one question for the evening reflection',
      ],
      facts,
      locale,
    ),
  };
}
