'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setFriendNotifications, setShowBigThree, unblockUser } from '@/actions/friends';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';

interface FriendSettingsProps {
  showBigThree: boolean;
  notifications: boolean;
  blocked: { id: string; name: string }[];
}

/** Definições, secção Amigos: partilhar Sol/Lua/Asc, avisos de amigos e bloqueados. */
export function FriendSettings({ showBigThree, notifications, blocked }: FriendSettingsProps) {
  const t = useTranslations('friends.settings');
  const router = useRouter();
  const [big, setBig] = useState(showBigThree);
  const [notify, setNotify] = useState(notifications);
  const [pending, start] = useTransition();

  return (
    <div className="mg-friend-settings">
      <CheckChip
        icon="zodiac-wheel"
        label={t('showBigThree')}
        checked={big}
        onCheckedChange={(v) => {
          setBig(v);
          start(async () => {
            await setShowBigThree(v);
          });
        }}
      />
      <p className="mg-form__status">{t('showBigThreeHint')}</p>
      <CheckChip
        icon="heart"
        label={t('notifications')}
        checked={notify}
        onCheckedChange={(v) => {
          setNotify(v);
          start(async () => {
            await setFriendNotifications(v);
          });
        }}
      />
      <h3 className="mg-form__title">{t('blockedTitle')}</h3>
      {blocked.length === 0 ? (
        <p className="mg-form__status">{t('blockedEmpty')}</p>
      ) : (
        <ul className="mg-friend-settings__blocked">
          {blocked.map((b) => (
            <li key={b.id}>
              <span>{b.name}</span>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await unblockUser(b.id);
                    router.refresh();
                  })
                }
              >
                {t('unblock')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
