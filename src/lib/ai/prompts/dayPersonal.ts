import type { Locale, Pronouns } from '@prisma/client';
import type { PersonalDayFacts } from '../facts';
import { systemPrompt, userPrompt, type PromptPair } from './system';

/**
 * Voz da leitura do dia (v6): directa e concreta, ao estilo de "o teu dia num relance". Os exemplos estão já na língua
 * de saída para a IA não copiar frases inglesas; são só referência de tom.
 */
const HEADLINE_EXAMPLES: Record<Locale, string> = {
  PT_PT: '"Nem todas as mensagens merecem resposta hoje.", "Já sabes a resposta. Pára de perguntar.", "Pede ajuda antes de precisares."',
  PT_BR: '"Nem toda mensagem merece resposta hoje.", "Você já sabe a resposta. Pare de perguntar.", "Peça ajuda antes de precisar."',
  EN: '"Not every message deserves a reply today.", "You already know the answer. Stop asking.", "Ask for help before you need it."',
};

const VOICE =
  'Voice for this reading: a sharp, honest friend who knows astrology. Short declarative sentences. Concrete, everyday situations (messages, plans, people, work, rest, habits) instead of abstract imagery. A little wit and edge is welcome; say what is true even if slightly uncomfortable, but never cruel, never fatalistic, never fear-based.';

/** Leitura pessoal do dia: trânsitos ao mapa natal. */
export function build(facts: PersonalDayFacts, locale: Locale, pronouns: Pronouns = 'NEUTRAL'): PromptPair {
  return {
    system: systemPrompt(locale, pronouns),
    user: userPrompt(
      `Write a personal reading for ${facts.date} based on the transits to this person's natal chart ("aspects"), the house the Moon transits ("moonTransitHouse", whole-sign; ignore if null) and the sky of the day. If "moonSignUncertain" is true, do not rely on the natal Moon sign.\n${VOICE}`,
      [
        `headline [60]: one striking sentence that reads like a verdict or a direct instruction for the day, grounded in today's transits. Tone references only, never reuse them: ${HEADLINE_EXAMPLES[locale]}. No planet, sign or aspect names, no questions, no tides/waters/light metaphors, no emojis`,
        'reading [650]: the personal reading. Open with the most concrete point of the day, then explain how the transits touch this person\'s chart and what to do (or not do) about it, in plain language and short sentences',
        'transits: up to 3 items { label: exact "label" identifier from facts.aspects (only here), meaning [180]: what this transit invites in daily life, in plain words with no technical terms } — empty if there are no aspects',
        'keywords: exactly 3 items [24 each]: single words or very short expressions that capture the day',
        'crystal: { name [40]: one common, easy-to-find crystal that supports the day\'s energy, why [140]: why, in one sentence }',
        'intentionSuggestion [90]: an intention for today in first person, one concrete action or stance that follows from today\'s transits and could not fit any other day. Avoid generic formulas (respecting my time, being grateful, finding balance, trusting the universe, being kind to myself)',
        'banishSuggestion [120]: something to release or banish today (a habit, feeling or pattern), short and concrete',
        'reflectionQuestion [120]: one direct question for the evening about a real situation of the day, the kind that is a little uncomfortable to answer honestly',
      ],
      facts,
      locale,
    ),
  };
}
