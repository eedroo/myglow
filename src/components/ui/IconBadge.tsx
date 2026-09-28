import type { ReactNode } from 'react';

interface IconBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

/** Círculo de vidro com contorno dourado que envolve um MagicIcon ou ícone de linha. */
export function IconBadge({ size = 'md', className, children }: IconBadgeProps) {
  return (
    <span className={['mg-icon-badge', `mg-icon-badge--${size}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
