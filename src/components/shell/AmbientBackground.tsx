/** Fundo com orbes dourados desfocados em movimento lento (parado com prefers-reduced-motion). */
export function AmbientBackground() {
  return (
    <div className="mg-ambient" aria-hidden="true">
      <span className="mg-ambient__orb mg-ambient__orb--1" />
      <span className="mg-ambient__orb mg-ambient__orb--2" />
      <span className="mg-ambient__orb mg-ambient__orb--3" />
      <span className="mg-ambient__orb mg-ambient__orb--4" />
    </div>
  );
}
