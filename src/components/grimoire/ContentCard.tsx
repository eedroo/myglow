'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { parseInline } from '@/lib/grimoire/markdown';
import type { Card } from '@/lib/grimoire/schema';

/** Texto com `**negrito**` (sem HTML). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </>
  );
}

interface ContentCardProps {
  card: Card;
  /** Prática: concluir a lição e navegar. */
  onPractice?: (href: string) => void;
  practicePending?: boolean;
}

/** Um card da lição (concept, icon, example, didYouKnow, reflection, practice). */
export function ContentCard({ card, onPractice, practicePending }: ContentCardProps) {
  const t = useTranslations('grimoire.player');
  const cls = `mg-lcard mg-lcard--${card.type.toLowerCase()}`;

  switch (card.type) {
    case 'concept':
    case 'example':
      return (
        <article className={cls}>
          <h2 className="mg-lcard__title">{card.title}</h2>
          <p className="mg-lcard__body">
            <Rich text={card.body} />
          </p>
        </article>
      );
    case 'icon':
      return (
        <article className={cls}>
          <span className="mg-lcard__icon">
            <MagicIcon name={card.icon} size="lg" decorative />
          </span>
          <h2 className="mg-lcard__title">{card.title}</h2>
          <p className="mg-lcard__body">
            <Rich text={card.body} />
          </p>
        </article>
      );
    case 'didYouKnow':
      return (
        <article className={cls}>
          <p className="mg-lcard__eyebrow">
            <MagicIcon name="sparkles" size="sm" decorative /> {t('didYouKnow')}
          </p>
          <p className="mg-lcard__body">
            <Rich text={card.body} />
          </p>
        </article>
      );
    case 'reflection':
      return (
        <article className={cls}>
          <p className="mg-lcard__eyebrow">{t('reflection')}</p>
          <h2 className="mg-lcard__title">{card.prompt}</h2>
          {/* Só para pensar: o texto nunca é gravado nem enviado. */}
          <label className="mg-visually-hidden" htmlFor={`reflect-${card.id}`}>
            {t('reflectionLabel')}
          </label>
          <textarea id={`reflect-${card.id}`} className="mg-input mg-lcard__input" rows={4} placeholder={t('reflectionPlaceholder')} />
        </article>
      );
    case 'practice':
      return (
        <article className={cls}>
          <p className="mg-lcard__eyebrow">{t('practice')}</p>
          <h2 className="mg-lcard__title">{card.title}</h2>
          <p className="mg-lcard__body">
            <Rich text={card.body} />
          </p>
          <Button className="mg-lcard__action" loading={practicePending} onClick={() => onPractice?.(card.action.href)}>
            {card.action.label}
          </Button>
        </article>
      );
  }
}
