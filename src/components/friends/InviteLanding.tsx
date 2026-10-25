import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { startInviteSignup } from '@/actions/friends';
import { Button } from '@/components/ui/Button';
import { LightOrb } from './LightOrb';
import { FriendAvatar } from './FriendAvatar';
import { InviteRequestButton } from './InviteRequestButton';

interface InviteLandingProps {
  code: string;
  inviter: { id: string; name: string; initials: string; level: number } | null;
  signedIn: boolean;
  self: boolean;
}

/** /f/[code]: sem sessão convida a criar conta; com sessão pede amizade. Sem revelar nada com código inválido. */
export async function InviteLanding({ code, inviter, signedIn, self }: InviteLandingProps) {
  const t = await getTranslations('friends.landing');
  if (!inviter) {
    return (
      <div className="mg-invite-landing">
        <section className="mg-invite-landing__card">
          <span className="mg-friend-avatar mg-friend-avatar--lg" aria-hidden="true">
            <LightOrb signs={null} idKey="landing" className="mg-friend-avatar__orb" />
          </span>
          <h1 className="mg-invite-landing__title">{t('unavailableTitle')}</h1>
          <p className="mg-invite-landing__text">{t('unavailableText')}</p>
          <Link href="/" className="mg-btn mg-btn--subtle">
            {t('home')}
          </Link>
        </section>
      </div>
    );
  }
  // Página pública: sempre a esfera neutra (as cores revelariam os signos).
  return (
    <div className="mg-invite-landing">
      <section className="mg-invite-landing__card">
        <FriendAvatar idKey="landing" orb={null} initials={inviter.initials} progress={0} size="lg" />
        <h1 className="mg-invite-landing__title">{t('title', { name: inviter.name })}</h1>
        <p className="mg-invite-landing__text">{t('level', { level: inviter.level })}</p>
        <div className="mg-invite-landing__actions">
          {self ? (
            <>
              <p className="mg-invite-landing__text">{t('self')}</p>
              <Link href="/friends" className="mg-btn mg-btn--primary">
                {t('goFriends')}
              </Link>
            </>
          ) : signedIn ? (
            <InviteRequestButton code={code} name={inviter.name} />
          ) : (
            <form action={startInviteSignup.bind(null, code)}>
              <Button type="submit" block>
                {t('createAccount')}
              </Button>
            </form>
          )}
          {!signedIn && (
            <Link href="/login" className="mg-btn mg-btn--ghost">
              {t('haveAccount')}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
