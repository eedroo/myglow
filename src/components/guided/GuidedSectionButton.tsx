import Link from 'next/link';
import { Footprints } from 'lucide-react';

/** "Passo a passo": ícone ao lado do título das secções do Hoje, ou botão com texto nos cabeçalhos dos períodos. */
export function GuidedSectionButton({ href, label, showLabel = false }: { href: string; label: string; showLabel?: boolean }) {
  return (
    <Link href={href} className={`mg-guided-btn${showLabel ? ' mg-guided-btn--labelled' : ''}`} aria-label={showLabel ? undefined : label} title={label}>
      <Footprints size={16} strokeWidth={1.75} aria-hidden="true" />
      {showLabel && label}
    </Link>
  );
}
