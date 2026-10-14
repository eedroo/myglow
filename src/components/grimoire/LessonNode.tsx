'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Lock } from 'lucide-react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import type { LessonState } from '@/lib/grimoire/rules';
import { NodePopover, scrollToNode } from './NodePopover';

interface LessonNodeProps {
  courseSlug: string;
  slug: string;
  index: number;
  title: string;
  minutes: number;
  state: LessonState;
  lessonsLeft: number;
  icon: MagicIconName;
  /** Só o próximo passo do curso em foco faz scroll até si ao abrir o mapa. */
  autoScroll?: boolean;
}

/** Nó de uma lição. Com `autoScroll`, faz scroll suave até si ao abrir o mapa. */
export function LessonNode({ courseSlug, slug, index, title, minutes, state, lessonsLeft, icon, autoScroll = false }: LessonNodeProps) {
  const t = useTranslations('grimoire');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const popId = `pop-${courseSlug}-${slug}`;

  useEffect(() => {
    if (autoScroll) scrollToNode(ref.current);
  }, [autoScroll]);

  const href = `/grimoire/${courseSlug}/${slug}`;
  let text: string | undefined;
  let action: { label: string; href: string } | null = null;
  if (state === 'completed') action = { label: t('pop.review'), href };
  else if (state === 'locked') text = t('pop.locked');
  else if (lessonsLeft === 0) text = t('pop.limit');
  else action = { label: t('pop.start'), href };

  const label = `${t('node.lesson', { n: index + 1, title })} · ${t(`node.${state}`)}`;
  return (
    <span className="mg-node-wrap">
      <button
        ref={ref}
        type="button"
        className={`mg-node mg-node--${state}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mg-node__ring" aria-hidden="true">
          {state === 'completed' ? (
            <Check size={26} strokeWidth={2.5} />
          ) : state === 'locked' ? (
            <Lock size={20} strokeWidth={1.75} />
          ) : (
            <MagicIcon name={icon} size={state === 'current' ? 'lg' : 'md'} decorative />
          )}
        </span>
      </button>
      {open && <NodePopover id={popId} title={title} meta={t('pop.minutes', { n: minutes })} text={text} action={action} onClose={close} />}
    </span>
  );
}
