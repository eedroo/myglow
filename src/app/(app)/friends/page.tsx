import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { FriendsPage } from '@/components/friends/FriendsPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('friends');
  return { title: t('title') };
}

export default async function FriendsRoute() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return <FriendsPage userId={session.user.id} />;
}
