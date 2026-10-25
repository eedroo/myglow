import { signStopClass, type OrbSigns } from '@/lib/friends/orb';

/**
 * Esfera de luz: gradiente radial com o Sol no centro, a Lua no meio e o Ascendente na borda; neutra (dourada)
 * quando os signos não são partilhados. `idKey` torna os ids do SVG únicos na página.
 */
export function LightOrb({ signs, idKey, className }: { signs: OrbSigns | null; idKey: string; className?: string }) {
  const id = `orb-${idKey.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const stops = signs
    ? [signStopClass(signs.core), signStopClass(signs.mid), signStopClass(signs.edge)]
    : ['mg-orb__stop--gold-1', 'mg-orb__stop--gold-2', 'mg-orb__stop--gold-3'];
  return (
    <svg className={['mg-orb', !signs && 'mg-orb--neutral', className].filter(Boolean).join(' ')} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`} cx="38%" cy="34%" r="72%">
          <stop offset="0%" className="mg-orb__highlight" />
          <stop offset="24%" className={stops[0]} />
          <stop offset="62%" className={stops[1]} />
          <stop offset="100%" className={stops[2]} />
        </radialGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <circle className="mg-orb__glow" cx="50" cy="50" r="48" fill={`url(#${id}-g)`} filter={`url(#${id}-blur)`} />
      <circle cx="50" cy="50" r="44" fill={`url(#${id}-g)`} />
    </svg>
  );
}
