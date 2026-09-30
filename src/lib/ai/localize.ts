import type { Locale } from '@prisma/client';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { messagesFor, translatorFor as translator, type Translator as T } from '@/i18n/translator';
import { parseAspectLabel } from './labels';

/**
 * Nomes na língua de saída para os factos enviados à IA (signos, astros, fases, eventos, aspectos),
 * a partir das mensagens da UI. Evita que a IA copie identificadores internos ou nomes em inglês.
 */
const signName = (t: T, s: string) => t(`astro.signs.${s}` as 'astro.signs.ARIES');
const bodyName = (t: T, b: string) => t(`astro.bodies.${b}` as 'astro.bodies.SUN');

/** Nome localizado de um evento do céu a partir do rótulo estável de `skyEventLabel`. */
export function localizeSkyEvent(t: T, type: string, label: string): string {
  let m: RegExpExecArray | null;
  switch (type) {
    case 'SUN_INGRESS':
      if ((m = /^Sun enters ([A-Z]+)$/.exec(label))) return t('sky.sunIngress', { sign: signName(t, m[1]!) });
      break;
    case 'LUNAR_ECLIPSE':
      if ((m = /^(\w+) lunar eclipse in ([A-Z]+)$/.exec(label))) return t('sky.lunarEclipse', { kind: m[1]!, sign: signName(t, m[2]!) });
      break;
    case 'SOLAR_ECLIPSE':
      if ((m = /^(\w+) solar eclipse in ([A-Z]+)$/.exec(label))) return t('sky.solarEclipse', { kind: m[1]!, sign: signName(t, m[2]!) });
      break;
    case 'STATION':
      if ((m = /^([A-Z]+) stations (retrograde|direct) in ([A-Z]+)$/.exec(label))) {
        return t('sky.station', { planet: bodyName(t, m[1]!), direction: m[2]!.toUpperCase(), sign: signName(t, m[3]!) });
      }
      break;
    case 'SEASON':
      return t(`sky.seasons.${label}` as 'sky.seasons.MARCH_EQUINOX');
    case 'SABBAT':
      return t(`sky.sabbats.${label}.name` as 'sky.sabbats.IMBOLC.name');
  }
  return label;
}

/** "Mercúrio trígono Sol natal" / "Mercury trine natal Sun". */
export function localizeAspect(t: T, label: string): string {
  const a = parseAspectLabel(label);
  if (!a) return label;
  const point = a.natal === 'ASC' ? t('reading.ascendant') : bodyName(t, a.natal);
  return `${bodyName(t, a.transit)} ${t(`reading.aspects.${a.type}` as 'reading.aspects.TRINE')} ${t('reading.natalPoint', { point })}`;
}

type Json = unknown;

/**
 * Cópia dos factos com `name` localizado em eventos, fases e aspectos (os identificadores ficam para
 * a validação; a IA escreve com os nomes).
 */
export function localizeFacts(facts: Json, locale: Locale): Json {
  const t = translator(locale);
  const walk = (v: Json): Json => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) as Record<string, Json>;
    if (typeof o.label === 'string' && typeof o.type === 'string' && 'transit' in o) o.name = localizeAspect(t, o.label);
    else if (typeof o.label === 'string' && typeof o.type === 'string') o.name = localizeSkyEvent(t, o.type, o.label);
    else if (typeof o.phase === 'string' && typeof o.sign === 'string' && 'date' in o) {
      o.name = t('sky.moonPhase', { phase: t(`astro.phases.${o.phase}` as 'astro.phases.NEW_MOON'), sign: signName(t, o.sign) });
    }
    return o;
  };
  return walk(facts);
}

/** Glossário identificador → nome na língua de saída (signos, astros, fases). */
export function glossary(locale: Locale): string {
  const t = translator(locale);
  const m = messagesFor(locale).astro;
  const pairs = [
    ...ZODIAC_ORDER.map((s) => `${s}=${signName(t, s)}`),
    ...Object.entries(m.bodies).map(([k, v]) => `${k}=${v}`),
    ...Object.entries(m.phases).map(([k, v]) => `${k}=${v}`),
  ];
  return pairs.join(', ');
}
