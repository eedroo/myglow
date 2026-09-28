import type { ReactNode } from 'react';

export type GlassCardVariant = 'accent' | 'flat' | 'interactive';

interface GlassCardProps {
  as?: 'section' | 'div' | 'article';
  variant?: GlassCardVariant | GlassCardVariant[];
  /** Título simples (Cormorant) no cabeçalho. */
  title?: ReactNode;
  /** Conteúdo livre do cabeçalho, à direita do título. */
  header?: ReactNode;
  className?: string;
  children?: ReactNode;
  'aria-labelledby'?: string;
  id?: string;
}

export function GlassCard({ as: Tag = 'section', variant, title, header, className, children, ...rest }: GlassCardProps) {
  const variants = variant ? (Array.isArray(variant) ? variant : [variant]) : [];
  const classes = ['mg-card', ...variants.map((v) => `mg-card--${v}`), className].filter(Boolean).join(' ');

  return (
    <Tag className={classes} {...rest}>
      {(title || header) && (
        <header className="mg-card__header">
          {title && <h2 className="mg-card__title">{title}</h2>}
          {header}
        </header>
      )}
      <div className="mg-card__body">{children}</div>
    </Tag>
  );
}
