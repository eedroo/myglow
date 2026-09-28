import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'subtle';
  block?: boolean;
  loading?: boolean;
  /** Texto anunciado a leitores de ecrã enquanto `loading`. */
  loadingLabel?: string;
}

export function Button({
  variant = 'primary',
  block = false,
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'mg-btn',
    `mg-btn--${variant}`,
    block && 'mg-btn--block',
    loading && 'mg-btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="mg-btn__spinner" aria-hidden="true" />}
      <span className="mg-btn__label">{children}</span>
      {loading && loadingLabel && <span className="mg-visually-hidden">{loadingLabel}</span>}
    </button>
  );
}
