'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { blockUser, removeFriend } from '@/actions/friends';
import { Button } from '@/components/ui/Button';

/** "Remover amigo" e "Bloquear", cada um com confirmação. Silenciosos para o outro. */
export function FriendMenu({ friendId, name }: { friendId: string; name: string }) {
  const t = useTranslations('friends.menu');
  const [confirm, setConfirm] = useState<'remove' | 'block' | null>(null);
  const [pending, start] = useTransition();

  if (confirm) {
    return (
      <div className="mg-friend-menu__confirm" role="alertdialog" aria-label={t(confirm === 'remove' ? 'removeConfirm' : 'blockConfirm', { name })}>
        <p>{t(confirm === 'remove' ? 'removeConfirm' : 'blockConfirm', { name })}</p>
        <div className="mg-friend-menu__confirm-actions">
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                await (confirm === 'remove' ? removeFriend(friendId) : blockUser(friendId));
              })
            }
          >
            {t(confirm === 'remove' ? 'removeYes' : 'blockYes')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            {t('no')}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mg-friend-menu">
      <Button variant="ghost" onClick={() => setConfirm('remove')}>
        {t('remove')}
      </Button>
      <Button variant="ghost" onClick={() => setConfirm('block')}>
        {t('block')}
      </Button>
    </div>
  );
}
