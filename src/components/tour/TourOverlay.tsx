'use client';

import { useEffect, useState } from 'react';

const PAD = 8; // folga à volta do alvo
const RADIUS = 18;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Caixa do alvo no ecrã, actualizada com scroll, resize e mudanças de tamanho do próprio alvo. */
function useTargetBox(target: HTMLElement | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect();
        setBox({ x: r.left - PAD, y: r.top - PAD, w: r.width + 2 * PAD, h: r.height + 2 * PAD });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(target);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [target]);
  return box;
}

function roundedRect({ x, y, w, h }: Box): string {
  const r = Math.min(RADIUS, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/**
 * Ecrã escurecido com um recorte arredondado à volta do alvo. A máscara apanha os cliques (fora do recorte não
 * acontece nada); dentro do recorte não há nada pintado, por isso o alvo continua clicável. Sem alvo: só escurece.
 */
export function TourOverlay({ target }: { target: HTMLElement | null }) {
  const box = useTargetBox(target);
  const outer = 'M0 0H100000V100000H0Z';
  return (
    <svg className="mg-tour" aria-hidden="true">
      <path className="mg-tour__mask" d={box ? `${outer}${roundedRect(box)}` : outer} />
      {box && <path className="mg-tour__ring" d={roundedRect(box)} />}
    </svg>
  );
}
