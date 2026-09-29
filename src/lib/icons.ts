import type { ComponentType } from 'react';
import type { ProjectArea } from '@prisma/client';
import type { LucideIcon } from 'lucide-react';
import {
  Sun, Moon, Sparkles, Coffee, Flower2, BedDouble, PersonStanding, Dumbbell, Droplet, Feather,
  Circle, Heart, Thermometer, MoonStar, NotebookPen, CalendarDays, Gem, Frown, Annoyed, Meh, Smile, Laugh,
  Orbit, Scale, FlaskRound, Briefcase, BookOpen, Flame, Star, ScrollText, Sparkle, Award,
} from 'lucide-react';
import { createMoonPhaseGlyph } from '@/components/ui/glyphs/MoonPhaseGlyph';
import { createZodiacGlyph } from '@/components/ui/glyphs/ZodiacGlyph';

export type MagicIconKind = '3d' | 'glyph';

export const MAGIC_ICON_NAMES = [
  // Diário
  'sun', 'moon-crescent', 'sparkles', 'tea-cup', 'lotus', 'bed', 'stretch', 'dumbbell', 'water-drop', 'feather',
  'crystal-ball', 'heart', 'thermometer', 'moon-stars', 'journal', 'calendar', 'crystal-cluster',
  'mood-1', 'mood-2', 'mood-3', 'mood-4', 'mood-5',
  // Semana
  'planet-mars', 'planet-mercury', 'planet-jupiter', 'planet-venus', 'planet-saturn',
  'scale', 'cauldron', 'briefcase', 'book-open',
  // Mês / ano
  'candle', 'zodiac-wheel', 'scroll', 'star',
  // Gamificação
  'glow-orb', 'flame', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'level-7',
  // Vazio
  'constellation',
  // Glifos
  'phase-new', 'phase-waxing-crescent', 'phase-first-quarter', 'phase-waxing-gibbous', 'phase-full',
  'phase-waning-gibbous', 'phase-last-quarter', 'phase-waning-crescent',
  'sign-aries', 'sign-taurus', 'sign-gemini', 'sign-cancer', 'sign-leo', 'sign-virgo', 'sign-libra',
  'sign-scorpio', 'sign-sagittarius', 'sign-capricorn', 'sign-aquarius', 'sign-pisces',
] as const;
export type MagicIconName = (typeof MAGIC_ICON_NAMES)[number];

export type MagicIconFallback = LucideIcon | ComponentType<{ className?: string }>;

export interface MagicIconDef {
  kind: MagicIconKind;
  ready: boolean; // true quando public/icons/magic/<name>.png existir
  fallback: MagicIconFallback; // placeholder enquanto ready = false
}

/** Nome do componente de fallback, usado em docs/ICONS.md e no showcase. */
export function fallbackName(def: MagicIconDef): string {
  const c = def.fallback as { displayName?: string; name?: string };
  return c.displayName ?? c.name ?? 'Unknown';
}

const icon = (fallback: MagicIconFallback): MagicIconDef => ({ kind: '3d', ready: false, fallback });
const glyph = (fallback: MagicIconFallback): MagicIconDef => ({ kind: 'glyph', ready: false, fallback });

export const MAGIC_ICONS: Record<MagicIconName, MagicIconDef> = {
  // Diário
  sun: icon(Sun),
  'moon-crescent': icon(Moon),
  sparkles: icon(Sparkles),
  'tea-cup': icon(Coffee),
  lotus: icon(Flower2),
  bed: icon(BedDouble),
  stretch: icon(PersonStanding),
  dumbbell: icon(Dumbbell),
  'water-drop': icon(Droplet),
  feather: icon(Feather),
  'crystal-ball': icon(Circle),
  heart: icon(Heart),
  thermometer: icon(Thermometer),
  'moon-stars': icon(MoonStar),
  journal: icon(NotebookPen),
  calendar: icon(CalendarDays),
  'crystal-cluster': icon(Gem),
  'mood-1': icon(Frown),
  'mood-2': icon(Annoyed),
  'mood-3': icon(Meh),
  'mood-4': icon(Smile),
  'mood-5': icon(Laugh),
  // Semana
  'planet-mars': icon(Orbit),
  'planet-mercury': icon(Orbit),
  'planet-jupiter': icon(Orbit),
  'planet-venus': icon(Orbit),
  'planet-saturn': icon(Orbit),
  scale: icon(Scale),
  cauldron: icon(FlaskRound),
  briefcase: icon(Briefcase),
  'book-open': icon(BookOpen),
  // Mês / ano
  candle: icon(Flame),
  'zodiac-wheel': icon(Orbit),
  scroll: icon(ScrollText),
  star: icon(Star),
  // Gamificação
  'glow-orb': icon(Sparkle),
  flame: icon(Flame),
  'level-1': icon(Award),
  'level-2': icon(Award),
  'level-3': icon(Award),
  'level-4': icon(Award),
  'level-5': icon(Award),
  'level-6': icon(Award),
  'level-7': icon(Award),
  // Vazio
  constellation: icon(Sparkles),
  // Glifos — fases da lua
  'phase-new': glyph(createMoonPhaseGlyph('NEW_MOON')),
  'phase-waxing-crescent': glyph(createMoonPhaseGlyph('WAXING_CRESCENT')),
  'phase-first-quarter': glyph(createMoonPhaseGlyph('FIRST_QUARTER')),
  'phase-waxing-gibbous': glyph(createMoonPhaseGlyph('WAXING_GIBBOUS')),
  'phase-full': glyph(createMoonPhaseGlyph('FULL_MOON')),
  'phase-waning-gibbous': glyph(createMoonPhaseGlyph('WANING_GIBBOUS')),
  'phase-last-quarter': glyph(createMoonPhaseGlyph('LAST_QUARTER')),
  'phase-waning-crescent': glyph(createMoonPhaseGlyph('WANING_CRESCENT')),
  // Glifos — signos
  'sign-aries': glyph(createZodiacGlyph('ARIES')),
  'sign-taurus': glyph(createZodiacGlyph('TAURUS')),
  'sign-gemini': glyph(createZodiacGlyph('GEMINI')),
  'sign-cancer': glyph(createZodiacGlyph('CANCER')),
  'sign-leo': glyph(createZodiacGlyph('LEO')),
  'sign-virgo': glyph(createZodiacGlyph('VIRGO')),
  'sign-libra': glyph(createZodiacGlyph('LIBRA')),
  'sign-scorpio': glyph(createZodiacGlyph('SCORPIO')),
  'sign-sagittarius': glyph(createZodiacGlyph('SAGITTARIUS')),
  'sign-capricorn': glyph(createZodiacGlyph('CAPRICORN')),
  'sign-aquarius': glyph(createZodiacGlyph('AQUARIUS')),
  'sign-pisces': glyph(createZodiacGlyph('PISCES')),
};

/** Ícone de cada área de projecto (partilhado por componentes server e client). */
export const PROJECT_ICONS: Record<ProjectArea, MagicIconName> = {
  MAGIC: 'cauldron',
  PERSONAL: 'heart',
  LEISURE: 'lotus',
  PROFESSIONAL: 'briefcase',
  STUDIES: 'book-open',
};
