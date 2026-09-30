'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface NodePopoverProps {
  id: string;
  title: string;
  meta?: string;
  text?: string;
  action?: { label: string; href: string } | null;
  onClose: () => void;
  children?: ReactNode;
}

/** Detalhes de um nó: título, duração e acção (Começar / Rever / Fazer o quiz) ou o motivo do bloqueio. */
export function NodePopover({ id, title, meta, text, action, onClose }: NodePopoverProps) {
  const t = useTranslations('grimoire.pop');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    ref.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  return (
    <div ref={ref} id={id} className="mg-node-pop" role="dialog" aria-label={title}>
      <p className="mg-node-pop__title">{title}</p>
      {meta && <p className="mg-node-pop__meta">{meta}</p>}
      {text && <p className="mg-node-pop__text">{text}</p>}
      <div className="mg-node-pop__actions">
        <Button variant="subtle" onClick={onClose}>
          {t('close')}
        </Button>
        {action && (
          <Link href={action.href} className="mg-btn mg-btn--primary">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
