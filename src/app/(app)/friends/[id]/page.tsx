import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getFriendProfile } from '@/lib/friends/queries';
import { FriendProfileView } from '@/components/friends/FriendProfileView';
import { FriendMenu } from '@/components/friends/FriendMenu';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('friends');
  return { title: t('profile.title') };
}

/** Perfil de um amigo. Não amigo ou bloqueio → 404, sem distinguir. */
export default async function FriendProfileRoute({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const [profile, t] = await Promise.all([getFriendProfile(session.user.id, params.id.slice(0, 64)), getTranslations('friends')]);
  if (!profile) notFound();
  return (
    <>
      <Link href="/friends" className="mg-btn mg-btn--ghost">
        {t('back')}
      </Link>
      <FriendProfileView profile={profile} />
      <FriendMenu friendId={profile.id} name={profile.name} />
    </>
  );
}
