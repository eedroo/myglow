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
        'headline [80]: a short, poetic, image-based title (a metaphor drawn from the day\'s sky: waters, light, tides, seeds, paths…), never a description; no planet, sign or aspect names',
        'reading [650]: the personal reading — warm and detailed about the day\'s transits and how they touch this person\'s chart, in plain language, focused on their effects and invitations (pause, adjust the pace, trust intuition…)',
        'transits: up to 3 items { label: exact "label" identifier from facts.aspects (only here), meaning [180]: what this transit invites in daily life, in plain words with no technical terms } — empty if there are no aspects',
        'keywords: exactly 3 items [24 each]: single words or very short expressions that capture the day',
        'crystal: { name [40]: one common, easy-to-find crystal that supports the day\'s energy, why [140]: why, in one sentence }',
        'intentionSuggestion [120]: a short intention for the day, written in first person',
        'banishSuggestion [120]: something to release or banish today (a habit, feeling or pattern), short',
        'reflectionQuestion [140]: one question for the evening reflection',
      ],
      facts,
      locale,
    ),
  };
}
