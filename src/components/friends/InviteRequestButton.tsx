'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { sendFriendRequestByCode } from '@/actions/friends';
import { Button } from '@/components/ui/Button';

/** Na página do convite, com sessão: "Pedir amizade a {nome}". */
export function InviteRequestButton({ code, name }: { code: string; name: string }) {
  const t = useTranslations('friends.landing');
  const te = useTranslations();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);
  if (result?.ok) {
    return (
      <>
        <p className="mg-invite-landing__text" role="status">
          {result.text}
        </p>
        <Link href="/friends" className="mg-btn mg-btn--primary">
          {t('goFriends')}
        </Link>
      </>
    );
  }
  return (
    <>
      <Button
        block
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await sendFriendRequestByCode(code);
            if (!res.ok) setResult({ text: te(res.error), ok: false });
            else setResult({ text: t(res.status === 'accepted' || res.status === 'friends' ? 'nowFriends' : 'sent', { name }), ok: true });
          })
        }
      >
        {t('request', { name })}
      </Button>
      {result && (
        <p className="mg-invite-landing__text" role="alert">
          {result.text}
        </p>
      )}
    </>
  );
}
