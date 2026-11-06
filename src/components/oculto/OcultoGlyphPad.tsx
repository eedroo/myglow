'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { addPoint, MAX_POINTS, MAX_STROKES, normalizePoint, type Point, type Strokes } from '@/lib/oculto/glyph';
import { Button } from '@/components/ui/Button';
import { OcultoGlyph } from './OcultoGlyph';

interface Props {
  value: Strokes;
  onChange: (v: Strokes) => void;
  labels: { pad: string; undo: string; clear: string };
}

/** Quadro para desenhar um símbolo com o dedo ou o rato; os traços ficam em 0–100. */
export function OcultoGlyphPad({ value, onChange, labels }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<Point[] | null>(null);
  const total = value.reduce((n, s) => n + s.length, 0);

  const at = (e: PointerEvent<HTMLDivElement>): Point => {
    const r = ref.current!.getBoundingClientRect();
    return normalizePoint(e.clientX - r.left, e.clientY - r.top, r.width);
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (value.length >= MAX_STROKES || total >= MAX_POINTS) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCurrent([at(e)]);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!current || total + current.length >= MAX_POINTS) return;
    setCurrent(addPoint(current, at(e)));
  };
  const up = () => {
    if (current) onChange([...value, current]);
    setCurrent(null);
  };

  return (
    <div className="mg-oculto-pad">
      <div
        ref={ref}
        className="mg-oculto-pad__canvas"
        role="img"
        aria-label={labels.pad}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <OcultoGlyph strokes={current ? [...value, current] : value} />
      </div>
      <div className="mg-oculto-pad__actions">
        <Button variant="ghost" onClick={() => onChange(value.slice(0, -1))} disabled={value.length === 0}>
          {labels.undo}
        </Button>
        <Button variant="ghost" onClick={() => onChange([])} disabled={value.length === 0}>
          {labels.clear}
        </Button>
      </div>
    </div>
  );
}
