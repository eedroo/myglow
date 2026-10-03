import type { Locale, Pronouns } from '@prisma/client';
import { glossary, localizeFacts } from '../localize';

/** Incrementar sempre que os prompts mudem de forma relevante (fica gravado com o conteúdo). */
export const PROMPT_VERSION = 4;

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

/**
 * Vocabulário simples já na língua de saída (v4): imagens para os aspectos e áreas da vida para os pontos do mapa.
 * Em inglês no prompt, a IA copiava as expressões inglesas para o texto em português.
 */
const PLAIN_VOCABULARY: Record<Locale, { aspects: string; points: string }> = {
  PT_PT: {
    aspects:
      'conjunção → "lado a lado", "a unir forças"; sextil → "uma ajuda amiga", "uma pequena oportunidade"; quadratura → "uma tensão que pede ajuste", "um pequeno atrito"; trígono → "um fluxo leve", "em harmonia"; oposição → "frente a frente", "equilibrar dois lados"; retrógrado → "um tempo para rever e olhar para trás"',
    points:
      'Ascendente → "a forma como te mostras ao mundo"; Sol natal → "a tua essência"; Lua natal → "as tuas emoções e necessidades"; Mercúrio natal → "a tua forma de pensar e comunicar"; Vénus natal → "a tua forma de amar e de cuidar de ti"; Marte natal → "a tua energia e iniciativa"; casa → a área da vida (relações, trabalho, casa…), nunca o número',
  },
  PT_BR: {
    aspects:
      'conjunção → "lado a lado", "unindo forças"; sextil → "uma ajuda amiga", "uma pequena oportunidade"; quadratura → "uma tensão que pede ajuste", "um pequeno atrito"; trígono → "um fluxo leve", "em harmonia"; oposição → "frente a frente", "equilibrar dois lados"; retrógrado → "um tempo para rever e olhar para trás"',
    points:
      'Ascendente → "o jeito como você se mostra ao mundo"; Sol natal → "a sua essência"; Lua natal → "as suas emoções e necessidades"; Mercúrio natal → "o seu jeito de pensar e se comunicar"; Vênus natal → "o seu jeito de amar e de se cuidar"; Marte natal → "a sua energia e iniciativa"; casa → a área da vida (relações, trabalho, lar…), nunca o número',
  },
  EN: {
    aspects:
      'conjunction → "side by side", "joining forces"; sextile → "a friendly helping hand", "a small opportunity"; square → "a tension that asks for an adjustment", "a little friction"; trine → "an easy flow", "in harmony"; opposition → "face to face", "balancing two sides"; retrograde → "a time to review and look back"',
    points:
      'Ascendant → "how you show yourself to the world"; natal Sun → "your essence"; natal Moon → "your emotions and needs"; natal Mercury → "how you think and communicate"; natal Venus → "how you love and care for yourself"; natal Mars → "your energy and drive"; house → the area of life (relationships, work, home…), never the number',
  },
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
    '- Plain language first. Never use technical astrological terms on their own (conjunction, square, trine, opposition, sextile, orb, house numbers). Describe each transit by what it feels like and what it invites in daily life, and spend more words on the effect than on the mechanics.',
    `- Aspect images, already in the output language (use them, adapting naturally): ${PLAIN_VOCABULARY[locale].aspects}.`,
    `- Chart points: prefer naming the area of life instead of the technical point, e.g. say the Sun "lights up" the reader\'s way of loving rather than "the Sun touches natal Venus". Areas, already in the output language: ${PLAIN_VOCABULARY[locale].points}. If you do name a point, use the natural word order of the output language (in Portuguese "a sua Vênus natal" / "a tua Vénus natal", never "natal Vênus") and weave its meaning into the sentence — never define it between dashes or in parentheses.`,
    '- Never use em dashes (—) or parenthetical asides; write flowing sentences. Every word must be in the output language: never leave English words or expressions in a Portuguese text.',
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
