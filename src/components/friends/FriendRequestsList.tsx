'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { acceptFriendRequest, declineFriendRequest } from '@/actions/friends';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import type { FriendSummary } from '@/lib/friends/queries';
import { FriendAvatar } from './FriendAvatar';

interface FriendRequestsListProps {
  requests: { id: string; from: FriendSummary; createdAt: string }[];
  /** Nomes dos níveis já traduzidos (o cliente não lê `glow.levels`). */
  levelNames: Record<string, string>;
}

/** Pedidos por responder: aceitar ou recusar (recusar não avisa ninguém). */
export function FriendRequestsList({ requests, levelNames }: FriendRequestsListProps) {
  const t = useTranslations('friends');
  const te = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = (id: string, fn: (id: string) => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(id);
    start(async () => {
      const res = await fn(id);
      if (!res.ok && res.error) setError(te(res.error));
      router.refresh();
    });
  };

  return (
    <GlassCard title={t('requests.title', { n: requests.length })}>
      <ul className="mg-friend-requests">
        {requests.map((r) => (
          <li key={r.id} className="mg-friend-requests__item">
            <FriendAvatar idKey={`req-${r.id}`} orb={r.from.orb} initials={r.from.initials} progress={r.from.progress} />
            <span className="mg-friend-requests__text">
              <span>{r.from.name}</span>
              <span className="mg-friend-requests__meta">{t('levelLine', { level: r.from.level, name: levelNames[r.from.levelKey] ?? '' })}</span>
            </span>
            <span className="mg-friend-requests__actions">
              <Button loading={pending && busy === r.id} onClick={() => act(r.id, acceptFriendRequest)}>
                {t('requests.accept')}
              </Button>
              <Button variant="ghost" disabled={pending && busy === r.id} onClick={() => act(r.id, declineFriendRequest)}>
                {t('requests.decline')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mg-friend-invite__note" role="alert">
          {error}
        </p>
      )}
    </GlassCard>
  );
}
