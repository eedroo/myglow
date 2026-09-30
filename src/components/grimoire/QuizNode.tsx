'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { NodePopover } from './NodePopover';

/** Nó do quiz final (cristal): bloqueado até todas as lições estarem concluídas. */
export function QuizNode({ courseSlug, unlocked, completed }: { courseSlug: string; unlocked: boolean; completed: boolean }) {
  const t = useTranslations('grimoire');
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const popId = `pop-${courseSlug}-quiz`;
  const state = completed ? 'completed' : unlocked ? 'current' : 'locked';

  return (
    <span className="mg-node-wrap">
      <button
        type="button"
        className={`mg-node mg-node--quiz mg-node--${state}`}
        aria-label={`${t('node.quiz')} · ${t(`node.${state}`)}`}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mg-node__ring" aria-hidden="true">
          {unlocked ? <MagicIcon name="crystal-cluster" size="md" decorative /> : <Lock size={20} strokeWidth={1.75} />}
        </span>
      </button>
      {open && (
        <NodePopover
          id={popId}
          title={t('node.quiz')}
          text={unlocked ? t('pop.quizText') : t('pop.quizLocked')}
          action={unlocked ? { label: completed ? t('pop.quizRetry') : t('pop.quizStart'), href: `/grimoire/${courseSlug}/quiz` } : null}
          onClose={close}
        />
      )}
    </span>
  );
}
