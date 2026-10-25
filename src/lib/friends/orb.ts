import type { ZodiacSign } from '@prisma/client';

/**
 * Esfera de luz (F15): o avatar de cada pessoa. A cor junta os três signos: o Sol no centro, a Lua no meio
 * e o Ascendente na borda (sem Ascendente, a Lua vai até à borda). Pura; as cores vivem em `tokens.css`
 * (`--sign-*`), uma por signo.
 *
 * Privacidade: as cores revelam os signos, por isso os amigos só vêem a esfera colorida quando a pessoa
 * partilha o Sol, a Lua e o Ascendente; senão vêem a esfera neutra (dourada) com as iniciais.
 */
export interface OrbSigns {
  core: ZodiacSign;
  mid: ZodiacSign;
  edge: ZodiacSign;
}

export function orbSigns(bigThree: { sun: ZodiacSign; moon: ZodiacSign; asc: ZodiacSign | null } | null): OrbSigns | null {
  if (!bigThree) return null;
  return { core: bigThree.sun, mid: bigThree.moon, edge: bigThree.asc ?? bigThree.moon };
}

/** Classe CSS da paragem do gradiente de um signo (`mg-orb__stop--leo`). */
export function signStopClass(sign: ZodiacSign): string {
  return `mg-orb__stop--${sign.toLowerCase()}`;
}
