/**
 * Mapa muscular (F17). Puro. Vocabulário da free-exercise-db → músculos do `react-body-highlighter` (2.0.5)
 * e estado de recuperação: menos de 48 h, 48 a 72 h, mais de 72 h.
 */

export type MapMuscle =
  | 'trapezius' | 'upper-back' | 'lower-back' | 'chest' | 'biceps' | 'triceps' | 'forearm'
  | 'back-deltoids' | 'front-deltoids' | 'abs' | 'obliques' | 'adductor' | 'abductors'
  | 'hamstring' | 'quadriceps' | 'calves' | 'gluteal' | 'neck';

export const MAP_MUSCLES: MapMuscle[] = [
  'trapezius', 'upper-back', 'lower-back', 'chest', 'biceps', 'triceps', 'forearm', 'back-deltoids', 'front-deltoids',
  'abs', 'obliques', 'adductor', 'abductors', 'hamstring', 'quadriceps', 'calves', 'gluteal', 'neck',
];

export const MUSCLE_MAP: Record<string, MapMuscle[]> = {
  abdominals: ['abs', 'obliques'],
  abductors: ['abductors'],
  adductors: ['adductor'],
  biceps: ['biceps'],
  calves: ['calves'],
  chest: ['chest'],
  forearms: ['forearm'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  lats: ['upper-back'],
  'lower back': ['lower-back'],
  'middle back': ['upper-back'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  traps: ['trapezius'],
  triceps: ['triceps'],
};

export const toMapMuscles = (muscles: string[]): MapMuscle[] => [...new Set(muscles.flatMap((m) => MUSCLE_MAP[m] ?? []))];

export type Recovery = 'just-trained' | 'recovering' | 'rested';

const HOUR = 3_600_000;

/**
 * Primários: < 48 h → acabou de treinar; 48 a 72 h → a recuperar; depois (ou nunca) → descansado.
 * Secundários só chegam a "a recuperar" (dentro de 72 h).
 */
export function muscleRecovery(
  lastTrained: Partial<Record<MapMuscle, Date>>,
  now: Date,
  lastSecondary: Partial<Record<MapMuscle, Date>> = {},
): Record<MapMuscle, Recovery> {
  const out = {} as Record<MapMuscle, Recovery>;
  for (const m of MAP_MUSCLES) {
    const p = lastTrained[m];
    const s = lastSecondary[m];
    const hp = p ? (now.getTime() - p.getTime()) / HOUR : Infinity;
    const hs = s ? (now.getTime() - s.getTime()) / HOUR : Infinity;
    out[m] = hp < 48 ? 'just-trained' : hp <= 72 || hs <= 72 ? 'recovering' : 'rested';
  }
  return out;
}

/** Última vez que cada músculo foi trabalhado (primário e secundário) a partir das séries. */
export function lastTrainedByMuscle(sets: { completedAt: Date; primary: string[]; secondary: string[] }[]): {
  primary: Partial<Record<MapMuscle, Date>>;
  secondary: Partial<Record<MapMuscle, Date>>;
} {
  const primary: Partial<Record<MapMuscle, Date>> = {};
  const secondary: Partial<Record<MapMuscle, Date>> = {};
  const bump = (rec: Partial<Record<MapMuscle, Date>>, m: MapMuscle, at: Date) => {
    if (!rec[m] || rec[m]! < at) rec[m] = at;
  };
  for (const s of sets) {
    for (const m of toMapMuscles(s.primary)) bump(primary, m, s.completedAt);
    for (const m of toMapMuscles(s.secondary)) bump(secondary, m, s.completedAt);
  }
  return { primary, secondary };
}
