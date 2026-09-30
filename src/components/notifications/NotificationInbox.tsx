'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { markAllNotificationsRead, markNotificationRead } from '@/actions/notifications';
import type { InboxItem } from '@/lib/notifications/queries';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

function relative(iso: string, locale: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') return rtf.format(Math.round(diff / ms), unit);
  }
  return '';
}

/** Sino (com não lidos) + caixa de avisos num `<dialog>`. */
export function NotificationInbox({ items, unread }: { items: InboxItem[]; unread: number }) {
  const t = useTranslations('notifications.inbox');
  const locale = useLocale();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const [, startTransition] = useTransition();

  const isRead = (i: InboxItem) => allRead || i.read || readIds.has(i.id);
  const count = Math.max(0, unread - (allRead ? unread : items.filter((i) => !i.read && readIds.has(i.id)).length));
  const label = count > 0 ? `${t('open')} · ${t('unread', { count })}` : t('open');

  const open = (item: InboxItem) => {
    ref.current?.close();
    if (!isRead(item)) {
      setReadIds((s) => new Set(s).add(item.id));
      void markNotificationRead(item.id);
    }
    startTransition(() => router.push(item.url));
  };

  const markAll = async () => {
    setAllRead(true);
    await markAllNotificationsRead();
    router.refresh();
  };

  return (
    <>
      <button type="button" className="mg-bell" aria-label={label} title={label} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        {count > 0 && (
          <span className="mg-bell__count" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <dialog
        ref={ref}
        className="mg-inbox"
        aria-labelledby="inbox-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className="mg-inbox__head">
          <h2 id="inbox-title" className="mg-inbox__heading">
            {t('title')}
          </h2>
          <Button variant="subtle" onClick={() => ref.current?.close()}>
            {t('close')}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="mg-inbox__empty">{t('empty')}</p>
        ) : (
          <>
            <ul className="mg-inbox__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={isRead(item) ? 'mg-inbox__item' : 'mg-inbox__item mg-inbox__item--unread'}
                    onClick={() => open(item)}
                  >
                    <span className="mg-inbox__dot" aria-hidden="true" />
                    <span>
                      <span className="mg-inbox__title">{item.title}</span>
                      <span className="mg-inbox__body">{item.body}</span>
                      <time className="mg-inbox__time" dateTime={item.sentAt}>
                        {relative(item.sentAt, locale)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {count > 0 && (
              <div className="mg-inbox__actions">
                <Button variant="ghost" onClick={markAll}>
                  {t('markAll')}
                </Button>
              </div>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
