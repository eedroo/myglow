import type { MagicIconName } from '@/lib/icons';
import type { RetroPlanet, SkyEvent } from '@/lib/astro/skyEvents';
import { MOON_PHASE_ICON } from '@/components/ui/MoonPhaseStrip';
import { ZODIAC_ICON } from '@/components/ui/ZodiacStrip';

/** Tradutor simples (compatível com `getTranslations` / `useTranslations`). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export const PLANET_ICON: Record<RetroPlanet, MagicIconName> = {
  MERCURY: 'planet-mercury',
  VENUS: 'planet-venus',
  MARS: 'planet-mars',
};

/** Modificador de estilo por tipo de evento. */
export function skyEventVariant(e: SkyEvent): 'moon' | 'eclipse' | 'sabbat' | 'season' | 'station' | 'ingress' {
  switch (e.type) {
    case 'MOON_PHASE': return 'moon';
    case 'LUNAR_ECLIPSE':
    case 'SOLAR_ECLIPSE': return 'eclipse';
    case 'SABBAT': return 'sabbat';
    case 'SEASON': return 'season';
    case 'STATION': return 'station';
    case 'SUN_INGRESS': return 'ingress';
  }
}

export function skyEventIcon(e: SkyEvent): MagicIconName {
  switch (e.type) {
    case 'MOON_PHASE': return MOON_PHASE_ICON[e.phase];
    case 'LUNAR_ECLIPSE': return 'phase-full';
    case 'SOLAR_ECLIPSE': return 'sun';
    case 'SUN_INGRESS': return ZODIAC_ICON[e.sign];
    case 'SEASON': return 'sun';
    case 'SABBAT': return 'candle';
    case 'STATION': return PLANET_ICON[e.planet];
  }
}

/** Texto de um evento do céu. `t` = namespace `sky`, `ta` = namespace `astro`. */
export function skyEventText(e: SkyEvent, t: Translate, ta: Translate): string {
  switch (e.type) {
    case 'MOON_PHASE':
      return t('moonPhase', { phase: ta(`phases.${e.phase}`), sign: ta(`signs.${e.sign}`) });
    case 'LUNAR_ECLIPSE':
      return t('lunarEclipse', { kind: e.kind, sign: ta(`signs.${e.sign}`) });
    case 'SOLAR_ECLIPSE':
      return t('solarEclipse', { kind: e.kind, sign: ta(`signs.${e.sign}`) });
    case 'SUN_INGRESS':
      return t('sunIngress', { sign: ta(`signs.${e.sign}`) });
    case 'SEASON':
      return t(`seasons.${e.season}`);
    case 'SABBAT':
      return `${t(`sabbats.${e.sabbat}.name`)} · ${t(`sabbats.${e.sabbat}.subtitle`)}`;
    case 'STATION':
      return t('station', { planet: ta(`bodies.${e.planet}`), direction: e.direction, sign: ta(`signs.${e.sign}`) });
  }
}
