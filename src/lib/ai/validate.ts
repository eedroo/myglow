import type { ZodiacSign } from '@prisma/client';
import { compareDates, isDateISO, type DateISO } from '@/lib/dates';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import ptPT from '../../../messages/pt-PT.json';
import ptBR from '../../../messages/pt-BR.json';
import en from '../../../messages/en.json';
import { eventDates, type DayFacts, type PeriodFacts, type PersonalDayFacts, type PersonalPeriodFacts } from './facts';
import type {
  DayHoroscope, DayPersonal, MonthEnergy, MonthPersonal, MonthRituals, WeekEnergy, WeekPersonal,
} from './schemas';

/**
 * Validação semântica das respostas da IA contra os factos calculados.
 * Cada função devolve `null` se a resposta é válida ou a razão da falha (usada como feedback no retry).
 */
export type ValidationResult = string | null;

// ─── Nomes dos signos em todas as línguas ──────────────────────────────────────────────────────────

const SIGN_NAMES: [ZodiacSign, string][] = [];
for (const messages of [ptPT, ptBR, en]) {
  for (const [sign, name] of Object.entries(messages.astro.signs)) SIGN_NAMES.push([sign as ZodiacSign, name]);
}
for (const sign of ZODIAC_ORDER) SIGN_NAMES.push([sign, sign]);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SIGN_BY_NAME = new Map(SIGN_NAMES.map(([s, n]) => [n.toLocaleLowerCase('pt'), s]));
const SIGN_ALT = [...new Set(SIGN_NAMES.map(([, n]) => escapeRe(n)))].sort((a, b) => b.length - a.length).join('|');

/**
 * "Lua em Touro", "Lua Nova em Balança", "Sol entra em Gémeos", "Moon in Taurus", "Sun enters Gemini"…
 * Até 30 caracteres entre o astro e a preposição, sem atravessar frases.
 */
const MENTION_RE = new RegExp(
  `(?<![\\p{L}])(Lua|Sol|Moon|Sun)(?![\\p{L}])[^.!?;:\\n]{0,30}?(?<![\\p{L}])(?:em|no|na|in|into|enters)\\s+(?:o\\s+|a\\s+|the\\s+)?(${SIGN_ALT})(?![\\p{L}])`,
  'giu',
);

const LABEL_RE = /\b[A-Z]+_(?:CONJUNCTION|SEXTILE|SQUARE|TRINE|OPPOSITION)_NATAL_[A-Z]+\b/g;

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

const prevSign = (s: ZodiacSign) => ZODIAC_ORDER[(ZODIAC_ORDER.indexOf(s) + 11) % 12]!;

interface Allowed {
  MOON: Set<ZodiacSign>;
  SUN: Set<ZodiacSign>;
}

/** Signos permitidos para Lua e Sol a partir dos factos do dia. */
function allowedForDay(f: DayFacts): Allowed {
  const moon = new Set<ZodiacSign>([f.moon.sign]);
  if (f.moon.ingress) moon.add(f.moon.ingress.sign).add(prevSign(f.moon.ingress.sign));
  const sun = new Set<ZodiacSign>([f.sun.sign]);
  for (const e of f.skyEvents) {
    if (e.type !== 'SUN_INGRESS') continue;
    const s = e.label.split(' ').pop() as ZodiacSign;
    sun.add(s).add(prevSign(s));
  }
  return { MOON: moon, SUN: sun };
}

function allowedForPeriod(f: PeriodFacts): Allowed {
  return {
    MOON: new Set(f.moonEvents.map((e) => e.sign)),
    SUN: new Set(f.sunSigns.map((s) => s.sign)),
  };
}

/** Acrescenta os signos natais (a "Lua natal em Carneiro" é um facto) e o signo do horóscopo. */
function withNatal(a: Allowed, natal?: { sun: ZodiacSign; moon: ZodiacSign }, sign?: ZodiacSign): Allowed {
  if (natal) {
    a.SUN.add(natal.sun);
    a.MOON.add(natal.moon);
  }
  if (sign) a.SUN.add(sign);
  return a;
}

/** Nenhum texto pode pôr a Lua ou o Sol num signo que não esteja nos factos. */
export function checkSignMentions(data: unknown, allowed: Allowed): ValidationResult {
  for (const text of allStrings(data)) {
    for (const m of text.matchAll(MENTION_RE)) {
      const body = /^(lua|moon)$/i.test(m[1]!) ? 'MOON' : 'SUN';
      const sign = SIGN_BY_NAME.get(m[2]!.toLocaleLowerCase('pt'));
      if (sign && !allowed[body].has(sign)) {
        return `"${m[0]}" places the ${body === 'MOON' ? 'Moon' : 'Sun'} in ${sign}, which is not in the facts (allowed: ${[...allowed[body]].join(', ')}).`;
      }
    }
  }
  return null;
}

/** Rótulos de aspectos citados (em `transits` ou no texto) têm de existir nos factos. */
function checkLabels(data: unknown, labels: Set<string>, explicit: string[] = []): ValidationResult {
  const cited = [...explicit, ...allStrings(data).flatMap((t) => t.match(LABEL_RE) ?? [])];
  const bad = cited.filter((l) => !labels.has(l));
  if (bad.length) return `Unknown transit labels: ${[...new Set(bad)].join(', ')}. Use only: ${[...labels].join(', ') || '(none)'}.`;
  return null;
}

function checkDatesInPeriod(dates: string[], from: DateISO, to: DateISO): ValidationResult {
  const bad = dates.filter((d) => !isDateISO(d) || compareDates(d, from) < 0 || compareDates(d, to) > 0);
  if (bad.length) return `Dates outside ${from}..${to} or not YYYY-MM-DD: ${bad.join(', ')}.`;
  return null;
}

const first = (...results: ValidationResult[]): ValidationResult => results.find((r) => r !== null) ?? null;

// ─── Por tipo ───────────────────────────────────────────────────────────────────────────────────────

export function validateDayHoroscope(data: DayHoroscope, facts: DayFacts & { sign: ZodiacSign }): ValidationResult {
  return first(
    checkLabels(data, new Set()),
    checkSignMentions(data, withNatal(allowedForDay(facts), undefined, facts.sign)),
  );
}

export function validateDayPersonal(data: DayPersonal, facts: PersonalDayFacts): ValidationResult {
  const labels = new Set(facts.aspects.map((a) => a.label));
  return first(
    checkLabels(data, labels, data.transits.map((t) => t.label)),
    checkSignMentions(data, withNatal(allowedForDay(facts), facts.natal)),
  );
}

export function validateWeekEnergy(data: WeekEnergy, facts: PeriodFacts & { sign: ZodiacSign }): ValidationResult {
  return first(
    checkDatesInPeriod(data.highlights.map((h) => h.date), facts.from, facts.to),
    checkLabels(data, new Set()),
    checkSignMentions(data, withNatal(allowedForPeriod(facts), undefined, facts.sign)),
  );
}

export function validateWeekPersonal(data: WeekPersonal, facts: PersonalPeriodFacts): ValidationResult {
  return first(
    checkLabels(data, new Set(facts.keyAspects.map((a) => a.label))),
    checkSignMentions(data, withNatal(allowedForPeriod(facts), facts.natal)),
  );
}

export function validateMonthEnergy(data: MonthEnergy, facts: PeriodFacts & { sign: ZodiacSign }): ValidationResult {
  return first(
    checkDatesInPeriod(data.keyDates.map((k) => k.date), facts.from, facts.to),
    checkLabels(data, new Set()),
    checkSignMentions(data, withNatal(allowedForPeriod(facts), undefined, facts.sign)),
  );
}

export function validateMonthPersonal(data: MonthPersonal, facts: PersonalPeriodFacts): ValidationResult {
  return first(
    checkLabels(data, new Set(facts.keyAspects.map((a) => a.label))),
    checkSignMentions(data, withNatal(allowedForPeriod(facts), facts.natal)),
  );
}

export function validateMonthRituals(data: MonthRituals, facts: PersonalPeriodFacts): ValidationResult {
  const valid = eventDates(facts);
  const dates = data.rituals.map((r) => r.date);
  const offEvent = dates.filter((d) => !valid.has(d));
  return first(
    checkDatesInPeriod(dates, facts.from, facts.to),
    offEvent.length
      ? `Ritual dates must match a provided moon or sky event date (${[...valid].sort().join(', ')}); got: ${offEvent.join(', ')}.`
      : null,
    checkLabels(data, new Set(facts.keyAspects.map((a) => a.label))),
    checkSignMentions(data, withNatal(allowedForPeriod(facts), facts.natal)),
  );
}

// ─── Fugas de identificadores e de inglês (todas as respostas) ─────────────────────────────────────

/** Campos que contêm identificadores por desenho (não são texto para ler). */
const IDENTIFIER_FIELDS = new Set(['label', 'id', 'date', 'area']);

function proseStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => proseStrings(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!IDENTIFIER_FIELDS.has(k)) proseStrings(v, out);
  }
  return out;
}

const ENUM_WORDS = [
  ...ZODIAC_ORDER,
  'SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO', 'ASC',
  'IMBOLC', 'OSTARA', 'BELTANE', 'LITHA', 'LUGHNASADH', 'MABON', 'SAMHAIN', 'YULE',
];
const IDENTIFIER_RE = new RegExp(`(?<![\\p{L}])(?:[A-Z]{2,}(?:_[A-Z]+)+|${ENUM_WORDS.join('|')})(?![\\p{L}_])`, 'u');

/** Expressões/nomes em inglês que não podem aparecer num texto em português. */
const ENGLISH_RE = new RegExp(
  `(?<![\\p{L}])(?:Full Moon|New Moon|First Quarter|Last Quarter|Waxing|Waning|stations? (?:retrograde|direct)|` +
    `lunar eclipse|solar eclipse|enters|natal (?:Sun|Moon)|Aries|Taurus|Gemini|Cancer|Virgo|Scorpio|Sagittarius|` +
    `Capricorn|Aquarius|Pisces|Mercury|Venus|Mars|Jupiter|Saturn|` +
    // v4: expressões do vocabulário simples que a IA deixava em inglês, e a ordem inglesa "natal Vênus".
    `friendly support|easy flow|side by side|small opportunity|facing each other|review|` +
    `natal (?:Sol|Lua|Merc[uú]rio|V[êé]nus|Marte|Ascendente))(?![\\p{L}])`,
  'iu',
);

/**
 * Nenhum identificador interno (MERCURY_TRINE_NATAL_SUN, SCORPIO…) no texto; em português, nenhum nome
 * ou expressão astrológica em inglês. Os rótulos só podem estar nos campos de identificadores.
 */
export function checkLeaks(data: unknown, locale: 'PT_PT' | 'PT_BR' | 'EN'): ValidationResult {
  for (const text of proseStrings(data)) {
    const id = IDENTIFIER_RE.exec(text);
    if (id) return `Internal identifier "${id[0]}" in the text. Use the localized "name" from the facts/GLOSSARY instead.`;
    if (locale !== 'EN') {
      // "Áries" (PT-BR) e "Libra" são portugueses; "Aries" sem acento não.
      const en = ENGLISH_RE.exec(text);
      if (en && !/^(Libra)$/i.test(en[0])) return `English term "${en[0]}" in a Portuguese text. Write every name in the output language (see GLOSSARY).`;
    }
  }
  return null;
}
