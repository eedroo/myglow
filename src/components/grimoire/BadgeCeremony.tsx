'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

interface BadgeCeremonyProps {
  badge: { name: string; icon: MagicIconName; description: string };
  points: number;
  /** Esc / fecho do diálogo (ex.: showcase). */
  onClose?: () => void;
}

/** Diálogo modal nativo (foco preso, Esc fecha) com o emblema conquistado. */
export function BadgeCeremony({ badge, points, onClose }: BadgeCeremonyProps) {
  const t = useTranslations('grimoire.ceremony');
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  return (
    <dialog ref={ref} className="mg-badge-cer" aria-labelledby="badge-cer-name" aria-describedby="badge-cer-text" onClose={onClose}>
      <div className="mg-badge-cer__body">
        <span className="mg-badge-cer__icon">
          <MagicIcon name={badge.icon} size="xl" decorative />
        </span>
        <p className="mg-badge-cer__eyebrow">{t('eyebrow')}</p>
        <h2 id="badge-cer-name" className="mg-badge-cer__name">
          {badge.name}
        </h2>
        <p id="badge-cer-text" className="mg-badge-cer__text">
          {badge.description}
        </p>
        {points > 0 && <p className="mg-badge-cer__glow">{t('glow', { points })}</p>}
        <div className="mg-badge-cer__actions">
          <Link href="/profile" className="mg-btn mg-btn--ghost">
            {t('profile')}
          </Link>
          <Link href="/grimoire" className="mg-btn mg-btn--primary" autoFocus>
            {t('close')}
          </Link>
        </div>
      </div>
    </dialog>
  );
}
