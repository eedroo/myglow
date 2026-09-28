import Image from 'next/image';
import type { ComponentType, CSSProperties } from 'react';
import { MAGIC_ICONS, type MagicIconName } from '@/lib/icons';

export type MagicIconSize = 'sm' | 'md' | 'lg' | 'xl';

export const MAGIC_ICON_PX: Record<MagicIconSize, number> = { sm: 24, md: 40, lg: 56, xl: 120 };

interface MagicIconBaseProps {
  name: MagicIconName;
  size?: MagicIconSize;
  className?: string;
}

type MagicIconProps = MagicIconBaseProps &
  ({ decorative: true; label?: string } | { decorative?: false; label: string });

/**
 * Ícone mágico: PNG 3D dourado quando `ready`, senão placeholder de linha com halo.
 * Trocar para o PNG final = colocar `public/icons/magic/<name>.png` e `ready: true` em `src/lib/icons.ts`.
 */
export function MagicIcon({ name, size = 'md', decorative, label, className }: MagicIconProps) {
  const def = MAGIC_ICONS[name];
  const px = MAGIC_ICON_PX[size];
  const src = `/icons/magic/${name}.png`;
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': label } as const);

  const classes = [
    'mg-magic-icon',
    `mg-magic-icon--${size}`,
    def.kind === 'glyph' && 'mg-magic-icon--glyph',
    !def.ready && 'mg-magic-icon--placeholder',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (def.ready && def.kind === '3d') {
    return (
      <span className={classes}>
        <Image className="mg-magic-icon__img" src={src} width={px} height={px} alt={decorative ? '' : (label ?? '')} />
      </span>
    );
  }

  if (def.ready && def.kind === 'glyph') {
    // PNG monocromático: a cor vem de currentColor através de mask-image.
    const style = { '--mg-icon-src': `url(${src})` } as CSSProperties;
    return (
      <span className={classes} {...a11y}>
        <span className="mg-magic-icon__mask" style={style} />
      </span>
    );
  }

  const Fallback = def.fallback as ComponentType<{ className?: string; strokeWidth?: number }>;
  return (
    <span className={classes} {...a11y}>
      <Fallback className="mg-magic-icon__svg" strokeWidth={1.5} />
    </span>
  );
}
