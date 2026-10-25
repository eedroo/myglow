import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { RegisterForm } from '@/components/forms/RegisterForm';
import { BetaNotice } from '@/components/beta/BetaNotice';
import { inviteRequired } from '@/lib/beta';
import { FRIEND_INVITE_PLACEHOLDER, readFriendInviteCookie, inviterByCode } from '@/lib/friends/invite';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('submit') };
}

export default async function RegisterPage({ searchParams }: { searchParams: { convite?: string } }) {
  const t = await getTranslations('auth.register');
  const invite = typeof searchParams.convite === 'string' ? searchParams.convite.slice(0, 40) : '';
  // F15: chegou por link de um amigo? Então o link conta como convite do beta.
  const friendCode = readFriendInviteCookie();
  const viaFriend = !!friendCode && !!(await inviterByCode(friendCode));
  return (
    <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
      <p>{t('subtitle')}</p>
      <RegisterForm betaNotice={<BetaNotice />} invite={inviteRequired() ? (viaFriend ? { initial: FRIEND_INVITE_PLACEHOLDER, hidden: true } : { initial: invite }) : null} />
    </GlassCard>
  );
}
