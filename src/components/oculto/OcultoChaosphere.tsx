/** A estrela de oito setas (Chaosphere), desenho próprio em SVG, para a contemplação da semana 19. */
export function OcultoChaosphere({ label }: { label: string }) {
  const arrows = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="-100 -100 200 200" className="mg-oculto-chaosphere" role="img" aria-label={label}>
      <circle r="22" />
      {arrows.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <line x1="0" y1="-22" x2="0" y2="-86" />
          <path d="M-9 -72 L0 -90 L9 -72" />
        </g>
      ))}
    </svg>
  );
}
