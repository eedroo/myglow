import type { MoonPhase } from '@prisma/client';
import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from './MagicIcon';

export const MOON_PHASE_ORDER: MoonPhase[] = [
  'NEW_MOON', 'WAXING_CRESCENT', 'FIRST_QUARTER', 'WAXING_GIBBOUS',
  'FULL_MOON', 'WANING_GIBBOUS', 'LAST_QUARTER', 'WANING_CRESCENT',
];

export const MOON_PHASE_ICON: Record<MoonPhase, MagicIconName> = {
  NEW_MOON: 'phase-new',
  WAXING_CRESCENT: 'phase-waxing-crescent',
  FIRST_QUARTER: 'phase-first-quarter',
  WAXING_GIBBOUS: 'phase-waxing-gibbous',
  FULL_MOON: 'phase-full',
  WANING_GIBBOUS: 'phase-waning-gibbous',
  LAST_QUARTER: 'phase-last-quarter',
  WANING_CRESCENT: 'phase-waning-crescent',
};

interface MoonPhaseStripProps {
  phase: MoonPhase;
  labels: Record<MoonPhase, string>;
  /** Nome acessível da lista (ex.: "Fases da lua"). */
  label: string;
}

/** 8 fases da lua; a actual destacada com halo dourado. */
export function MoonPhaseStrip({ phase, labels, label }: MoonPhaseStripProps) {
  return (
    <ul className="mg-moon-strip" aria-label={label}>
      {MOON_PHASE_ORDER.map((p) => {
        const active = p === phase;
        return (
          <li
            key={p}
            className={active ? 'mg-moon-strip__phase mg-moon-strip__phase--active' : 'mg-moon-strip__phase'}
            aria-current={active ? 'true' : undefined}
          >
            <MagicIcon name={MOON_PHASE_ICON[p]} size="sm" label={labels[p]} />
          </li>
        );
      })}
    </ul>
  );
}
