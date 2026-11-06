import { strokePath, type Strokes } from '@/lib/oculto/glyph';

/** Desenho de um símbolo do Alfabeto do Desejo (só leitura). */
export function OcultoGlyph({ strokes, label, className }: { strokes: Strokes; label?: string; className?: string }) {
  return (
    <svg
      viewBox="-4 -4 108 108"
      className={['mg-oculto-glyph', className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {strokes.map((s, i) => (
        <path key={i} d={strokePath(s)} />
      ))}
    </svg>
  );
}
