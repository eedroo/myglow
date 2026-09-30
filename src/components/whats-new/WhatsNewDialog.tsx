'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { markAnnouncementsSeen } from '@/actions/whats-new';
import type { AnnouncementItem } from '@/lib/whats-new/rules';

/**
 * Pop-up "Novidades MYGLOW": abre sozinho quando há novidades por ver (cursos novos e lançamentos).
 * Fechar (botão, Esc) ou tocar num item marca todas as mostradas como vistas.
 */
export function WhatsNewDialog({ items }: { items: AnnouncementItem[] }) {
  const t = useTranslations('whatsNew');
  const ref = useRef<HTMLDialogElement>(null);
  const marked = useRef(false);

  useEffect(() => {
    if (items.length && ref.current && !ref.current.open) ref.current.showModal();
  }, [items.length]);

  if (!items.length) return null;

  const markSeen = () => {
    if (marked.current) return;
    marked.current = true;
    void markAnnouncementsSeen(items.map((i) => i.key));
  };
  const close = () => {
    markSeen();
    ref.current?.close();
  };

  return (
    <dialog ref={ref} className="mg-whats-new" aria-labelledby="whats-new-title" onClose={markSeen}>
      <div className="mg-whats-new__body">
        <span className="mg-whats-new__icon">
          <MagicIcon name="sparkles" size="lg" decorative />
        </span>
        <h2 id="whats-new-title" className="mg-whats-new__title">
          {t('title')}
        </h2>
        <p className="mg-whats-new__subtitle">{t('subtitle')}</p>
        <ul className="mg-whats-new__list">
          {items.map((item, i) => {
            const text = item.courseTitle ? t('course', { title: item.courseTitle }) : item.text;
            const content = (
              <>
                <MagicIcon name={item.icon} size="sm" decorative />
                <span>{text}</span>
              </>
            );
            return (
              <li key={`${item.key}-${i}`}>
                {item.href ? (
                  <Link href={item.href} className="mg-whats-new__link" onClick={close}>
                    {content}
                  </Link>
                ) : (
                  <span className="mg-whats-new__item">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mg-whats-new__actions">
          <Button onClick={close} autoFocus>
            {t('close')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
