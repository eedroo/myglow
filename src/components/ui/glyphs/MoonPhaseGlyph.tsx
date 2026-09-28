import type { ComponentType } from 'react';

export type MoonPhaseKey =
  | 'NEW_MOON'
  | 'WAXING_CRESCENT'
  | 'FIRST_QUARTER'
  | 'WAXING_GIBBOUS'
  | 'FULL_MOON'
  | 'WANING_GIBBOUS'
  | 'LAST_QUARTER'
  | 'WANING_CRESCENT';

/** Fracção iluminada (0–1) e lado iluminado de cada fase (hemisfério norte). */
const PHASES: Record<MoonPhaseKey, { lit: number; waxing: boolean }> = {
  NEW_MOON: { lit: 0, waxing: true },
  WAXING_CRESCENT: { lit: 0.25, waxing: true },
  FIRST_QUARTER: { lit: 0.5, waxing: true },
  WAXING_GIBBOUS: { lit: 0.75, waxing: true },
  FULL_MOON: { lit: 1, waxing: true },
  WANING_GIBBOUS: { lit: 0.75, waxing: false },
  LAST_QUARTER: { lit: 0.5, waxing: false },
  WANING_CRESCENT: { lit: 0.25, waxing: false },
};

const R = 10;
const C = 12;

/**
 * Caminho da parte iluminada: meia circunferência do lado iluminado + elipse do terminador.
 * rx do terminador = R * |1 - 2·lit|; sweep define se a elipse "incha" para fora ou para dentro.
 */
function litPath(lit: number, waxing: boolean): string {
  const rx = Math.abs(1 - 2 * lit) * R;
  const outerSweep = waxing ? 1 : 0;
  const termSweep = lit > 0.5 ? outerSweep : 1 - outerSweep;
  return [
    `M ${C} ${C - R}`,
    `A ${R} ${R} 0 0 ${outerSweep} ${C} ${C + R}`,
    `A ${rx} ${R} 0 0 ${termSweep} ${C} ${C - R}`,
    'Z',
  ].join(' ');
}

interface MoonPhaseGlyphProps {
  phase: MoonPhaseKey;
  className?: string;
}

/** Glifo de fase da lua desenhado por código. Cor via currentColor. */
export function MoonPhaseGlyph({ phase, className }: MoonPhaseGlyphProps) {
  const { lit, waxing } = PHASES[phase];
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx={C} cy={C} r={R} stroke="currentColor" strokeWidth={1.5} />
      {lit >= 1 ? (
        <circle cx={C} cy={C} r={R} fill="currentColor" />
      ) : lit > 0 ? (
        <path d={litPath(lit, waxing)} fill="currentColor" />
      ) : null}
    </svg>
  );
}

/** Fábrica usada pelo registo de ícones: devolve um componente `{ className }` para uma fase fixa. */
export function createMoonPhaseGlyph(phase: MoonPhaseKey): ComponentType<{ className?: string }> {
  function Glyph({ className }: { className?: string }) {
    return <MoonPhaseGlyph phase={phase} className={className} />;
  }
  Glyph.displayName = `MoonPhaseGlyph(${phase})`;
  return Glyph;
}
