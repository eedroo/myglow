import type { MoonPhase, ZodiacSign } from '@prisma/client';

export type BodyKey = 'SUN' | 'MOON' | 'MERCURY' | 'VENUS' | 'MARS' | 'JUPITER' | 'SATURN' | 'URANUS' | 'NEPTUNE' | 'PLUTO';

export type MainMoonPhase = 'NEW_MOON' | 'FIRST_QUARTER' | 'FULL_MOON' | 'LAST_QUARTER';

export interface ZodiacPosition {
  longitude: number; // 0–360, tropical, eclíptica verdadeira da data
  sign: ZodiacSign;
  degree: number; // 0–29.99 dentro do signo
}

export interface DailyMoon {
  phase: MoonPhase;
  phaseAngle: number; // 0–360 ao meio-dia local
  illumination: number; // 0–1 ao meio-dia local
  signAtNoon: ZodiacSign;
  ingress: { sign: ZodiacSign; at: string } | null; // lua muda de signo durante o dia local (ISO UTC)
  event: { phase: MainMoonPhase; at: string } | null; // fase principal exacta no dia
}

export interface DailySky {
  date: string; // DateISO
  timezone: string;
  sun: ZodiacPosition;
  moon: DailyMoon;
}

export interface NatalBody extends ZodiacPosition {
  retrograde: boolean;
  house: number | null; // 1–12 (casas por signo inteiro); null se hora desconhecida
}

export interface NatalChart {
  version: 1;
  computedFor: { birthUtc: string; latitude: number; longitude: number; timeKnown: boolean };
  houseSystem: 'WHOLE_SIGN' | null;
  bodies: Record<BodyKey, NatalBody>;
  ascendant: ZodiacPosition | null;
  midheaven: ZodiacPosition | null;
  moonSignUncertain: boolean; // hora desconhecida e a lua mudou de signo nesse dia
}
