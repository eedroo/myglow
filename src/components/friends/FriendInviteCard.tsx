'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { regenerateFriendCode, sendFriendRequestByCode, setHandle } from '@/actions/friends';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { GlassCard } from '@/components/ui/GlassCard';

interface FriendInviteCardProps {
  code: string; // já formatado (ABCD-EFGH)
  handle: string | null;
  inviteUrl: string;
}

/** O meu convite (código, @, partilhar) e "Tenho um código ou @". */
export function FriendInviteCard({ code, handle, inviteUrl }: FriendInviteCardProps) {
  const t = useTranslations('friends.invite');
  const te = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [input, setInput] = useState('');
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState(handle ?? '');
  const [confirmRegen, setConfirmRegen] = useState(false);

  const say = (text: string, error = false) => setMessage({ text, error });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      say(t('copied'));
    } catch {
      say(inviteUrl);
    }
  };

  const share = async () => {
    const data = { title: t('shareTitle'), text: t('shareText'), url: inviteUrl };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await copy();
  };

  const submitCode = () =>
    start(async () => {
      const res = await sendFriendRequestByCode(input);
      if (!res.ok) return say(te(res.error), true);
      setInput('');
      say(t(res.status === 'accepted' ? 'acceptedNow' : res.status === 'friends' ? 'alreadyFriends' : 'sent'));
      router.refresh();
    });

  const saveHandle = () =>
    start(async () => {
      const res = await setHandle(handleInput);
      if (!res.ok) return say(te(res.error), true);
      setEditingHandle(false);
      say(t('handleSaved'));
      router.refresh();
    });

  const regenerate = () =>
    start(async () => {
      const res = await regenerateFriendCode();
      setConfirmRegen(false);
      if (!res.ok) return say(te(res.error), true);
      say(t('regenerated'));
      router.refresh();
    });

  return (
    <GlassCard title={t('title')}>
      <div className="mg-friend-invite">
        <p className="mg-friend-invite__code" aria-label={t('codeLabel', { code })}>
          {code}
        </p>
        {editingHandle ? (
          <div className="mg-friend-invite__form">
            <TextInput
              aria-label={t('handleLabel')}
              placeholder={t('handlePlaceholder')}
              value={handleInput}
              maxLength={21}
              onChange={(e) => setHandleInput(e.target.value)}
            />
            <Button loading={pending} onClick={saveHandle}>
              {t('handleSave')}
            </Button>
          </div>
        ) : (
          <p className="mg-friend-invite__handle">
            {handle ? `@${handle}` : t('noHandle')}{' '}
            <button type="button" className="mg-friend-invite__link" onClick={() => setEditingHandle(true)}>
              {handle ? t('handleChange') : t('handleCreate')}
            </button>
          </p>
        )}
        <div className="mg-friend-invite__actions">
          <Button onClick={share}>{t('share')}</Button>
          <Button variant="ghost" onClick={copy}>
            {t('copy')}
          </Button>
        </div>

        <form
          className="mg-friend-invite__form"
          onSubmit={(e) => {
            e.preventDefault();
            submitCode();
          }}
        >
          <TextInput
            aria-label={t('haveCode')}
            placeholder={t('haveCodePlaceholder')}
            value={input}
            maxLength={40}
            autoCapitalize="characters"
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" variant="subtle" loading={pending} disabled={!input.trim()}>
            {t('send')}
          </Button>
        </form>

        {message && (
          <p className="mg-friend-invite__note" role={message.error ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}

        {confirmRegen ? (
          <div className="mg-friend-menu__confirm">
            <p className="mg-friend-invite__note">{t('regenConfirm')}</p>
            <div className="mg-friend-menu__confirm-actions">
              <Button variant="danger" loading={pending} onClick={regenerate}>
                {t('regenYes')}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRegen(false)}>
                {t('regenNo')}
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className="mg-friend-invite__link" onClick={() => setConfirmRegen(true)}>
            {t('regenerate')}
          </button>
        )}
      </div>
    </GlassCard>
  );
}
