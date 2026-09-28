import type { ComponentType } from 'react';

export type ZodiacKey =
  | 'ARIES'
  | 'TAURUS'
  | 'GEMINI'
  | 'CANCER'
  | 'LEO'
  | 'VIRGO'
  | 'LIBRA'
  | 'SCORPIO'
  | 'SAGITTARIUS'
  | 'CAPRICORN'
  | 'AQUARIUS'
  | 'PISCES';

/** VS15 (︎) força apresentação em texto em vez de emoji. */
const TEXT_VS = '︎';

export const ZODIAC_CHARS: Record<ZodiacKey, string> = {
  ARIES: '♈',
  TAURUS: '♉',
  GEMINI: '♊',
  CANCER: '♋',
  LEO: '♌',
  VIRGO: '♍',
  LIBRA: '♎',
  SCORPIO: '♏',
  SAGITTARIUS: '♐',
  CAPRICORN: '♑',
  AQUARIUS: '♒',
  PISCES: '♓',
};

interface ZodiacGlyphProps {
  sign: ZodiacKey;
  className?: string;
}

/** Glifo de signo como carácter Unicode em modo texto. Cor via currentColor. */
export function ZodiacGlyph({ sign, className }: ZodiacGlyphProps) {
  return (
    <span className={className ? `mg-magic-icon__zodiac ${className}` : 'mg-magic-icon__zodiac'} aria-hidden="true">
      {ZODIAC_CHARS[sign] + TEXT_VS}
    </span>
  );
}

/** Fábrica usada pelo registo de ícones: devolve um componente `{ className }` para um signo fixo. */
export function createZodiacGlyph(sign: ZodiacKey): ComponentType<{ className?: string }> {
  function Glyph({ className }: { className?: string }) {
    return <ZodiacGlyph sign={sign} className={className} />;
  }
  Glyph.displayName = `ZodiacGlyph(${sign})`;
  return Glyph;
}
