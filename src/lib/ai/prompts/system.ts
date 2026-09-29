import type { Locale, Pronouns } from '@prisma/client';
import { glossary, localizeFacts } from '../localize';

/** Incrementar sempre que os prompts mudem de forma relevante (fica gravado com o conteúdo). */
export const PROMPT_VERSION = 2;

export interface PromptPair {
  system: string;
  user: string;
}

const LANGUAGE: Record<Locale, string> = {
  PT_PT:
    'European Portuguese (Portugal), written natively. Address the reader informally as "tu" (e.g. "podes", "a tua"). Never use Brazilian forms ("você", gerund constructions like "estou fazendo", Brazilian spelling).',
  PT_BR:
    'Brazilian Portuguese, written natively. Address the reader as "você" (e.g. "você pode", "sua"). Use Brazilian spelling and vocabulary.',
  EN: 'English, written natively. Address the reader as "you".',
};

const NEUTRAL_RULE =
  '- Never assume the reader\'s gender: write in gender-neutral language. In Portuguese, rephrase to avoid gendered agreement referring to the reader (no "bem-vinda/bem-vindo", "você mesma/mesmo", "cansada/cansado") and avoid gendered sign demonyms (say "pessoas de Gêmeos", not "geminiano/geminiana").';

/** Regra de género: conteúdo partilhado (sem pronomes) é sempre neutro; o pessoal segue os pronomes do utilizador. */
function genderRule(pronouns: Pronouns | null): string {
  if (pronouns === 'FEMININE') return '- The reader uses feminine pronouns (she/her; "ela"): when grammar requires gender for the reader, use the feminine form.';
  if (pronouns === 'MASCULINE') return '- The reader uses masculine pronouns (he/him; "ele"): when grammar requires gender for the reader, use the masculine form.';
  return NEUTRAL_RULE;
}

/**
 * Prompt de sistema comum a todos os tipos (em inglês, com a língua de saída explícita).
 * `pronouns` só existe no conteúdo pessoal; o partilhado por signo é lido por todos e fica neutro.
 */
export function systemPrompt(locale: Locale, pronouns: Pronouns | null = null): string {
  return [
    'You are the voice of MYGLOW, a magical journal and astrological grimoire.',
    'Persona: a warm grimoire guide — poetic but clear, never heavy on jargon.',
    `Output language: ${LANGUAGE[locale]} Every text field must be in this language.`,
    '',
    'Rules:',
    '- Use ONLY the facts provided in the user message (JSON). Never invent planetary positions, signs, aspects, dates, times or events. If something is not in the facts, do not mention it.',
    '- Write every name (signs, planets, Moon phases, sky events, transits) in the output language, as given in the "name" fields and in the GLOSSARY. Never write internal identifiers (UPPER_CASE words such as MERCURY_TRINE_NATAL_SUN, SCORPIO or FULL_MOON) nor English names in the text. Transit identifiers go ONLY in the "label" field of "transits"; in the prose describe the transit with its "name".',
    genderRule(pronouns),
    '- Speak in terms of possibility and invitation, never fatalistic or fear-based. Astrology is a tool for reflection, not prediction.',
    '- No medical, psychological, financial or legal advice. Never mention health, pregnancy, death or illness.',
    '- Rituals must be safe and simple: nothing ingested (no herbs, oils or substances to eat or drink), candles always supervised and away from flammable materials, nothing involving pain, blood or risk, only common and inexpensive materials. Respect different traditions and do not appropriate closed practices.',
    '- If the facts include the user\'s intentions, weave them in subtly; never quote them literally.',
    '- Respect every maximum length given in the instructions (characters, including spaces).',
    '- Reply only with the requested JSON object.',
  ].join('\n');
}

/** Mensagem do utilizador: instruções específicas do tipo + os factos em JSON. */
export function userPrompt(task: string, fields: string[], facts: unknown, locale: Locale): string {
  return [
    task,
    '',
    'Fields (max characters in brackets):',
    ...fields.map((f) => `- ${f}`),
    '',
    `GLOSSARY (identifier=name in the output language): ${glossary(locale)}`,
    '',
    'FACTS (JSON):',
    JSON.stringify(localizeFacts(facts, locale)),
  ].join('\n');
}
