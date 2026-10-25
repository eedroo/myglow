'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cancelFriendRequest } from '@/actions/friends';
import { Button } from '@/components/ui/Button';

/** Pedidos enviados à espera de resposta (compacto), com "Cancelar". */
export function OutgoingRequests({ requests }: { requests: { id: string; to: { name: string; initials: string }; createdAt: string }[] }) {
  const t = useTranslations('friends.outgoing');
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!requests.length) return null;
  return (
    <section aria-label={t('title')}>
      <h2 className="mg-form__title">{t('title')}</h2>
      <ul className="mg-friend-outgoing">
        {requests.map((r) => (
          <li key={r.id} className="mg-friend-outgoing__item">
            <span>{t('waiting', { name: r.to.name })}</span>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await cancelFriendRequest(r.id);
                  router.refresh();
                })
              }
            >
              {t('cancel')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
