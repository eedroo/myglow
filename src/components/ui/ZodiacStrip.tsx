import type { ZodiacSign } from '@prisma/client';
import type { MagicIconName } from '@/lib/icons';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { MagicIcon } from './MagicIcon';

export const ZODIAC_ICON: Record<ZodiacSign, MagicIconName> = {
  ARIES: 'sign-aries',
  TAURUS: 'sign-taurus',
  GEMINI: 'sign-gemini',
  CANCER: 'sign-cancer',
  LEO: 'sign-leo',
  VIRGO: 'sign-virgo',
  LIBRA: 'sign-libra',
  SCORPIO: 'sign-scorpio',
  SAGITTARIUS: 'sign-sagittarius',
  CAPRICORN: 'sign-capricorn',
  AQUARIUS: 'sign-aquarius',
  PISCES: 'sign-pisces',
};

interface ZodiacStripProps {
  sign: ZodiacSign;
  labels: Record<ZodiacSign, string>;
  label: string;
}

/** 12 signos; o activo (signo da lua) destacado com halo dourado. */
export function ZodiacStrip({ sign, labels, label }: ZodiacStripProps) {
  return (
    <ul className="mg-zodiac-strip" aria-label={label}>
      {ZODIAC_ORDER.map((s) => {
        const active = s === sign;
        return (
          <li
            key={s}
            className={active ? 'mg-zodiac-strip__sign mg-zodiac-strip__sign--active' : 'mg-zodiac-strip__sign'}
            aria-current={active ? 'true' : undefined}
          >
            <MagicIcon name={ZODIAC_ICON[s]} size="sm" label={labels[s]} />
          </li>
        );
      })}
    </ul>
  );
}
