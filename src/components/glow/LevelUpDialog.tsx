'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { LEVELS } from '@/lib/xp/levels';
import type { MagicIconName } from '@/lib/icons';

interface LevelUpDialogProps {
  level: number;
  open: boolean;
  onClose: () => void;
}

/** Diálogo modal nativo (foco preso e Esc incluídos) de subida de nível. */
export function LevelUpDialog({ level, open, onClose }: LevelUpDialogProps) {
  const t = useTranslations('glow');
  const ref = useRef<HTMLDialogElement>(null);
  const info = LEVELS.find((l) => l.level === level) ?? LEVELS[0];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="mg-levelup"
      aria-labelledby="levelup-title"
      aria-describedby="levelup-text"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="mg-levelup__body">
        <span className="mg-levelup__icon">
          <MagicIcon name={`level-${info.level}` as MagicIconName} size="xl" decorative />
        </span>
        <p className="mg-levelup__eyebrow">{t('levelUp.eyebrow')}</p>
        <h2 id="levelup-title" className="mg-levelup__title">
          {t('levelUp.title', { name: t(`levels.${info.key}.name`) })}
        </h2>
        <p id="levelup-text" className="mg-levelup__text">
          {t(`levels.${info.key}.phrase`)}
        </p>
        <div className="mg-levelup__actions">
          <Button onClick={onClose} autoFocus>
            {t('levelUp.close')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
