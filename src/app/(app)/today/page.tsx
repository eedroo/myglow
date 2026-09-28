import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/shell/PageHeader';
import { ComingSoon } from '@/components/shell/ComingSoon';
import { Motto } from '@/components/ui/Motto';
import { intlLocale, isAppLocale } from '@/i18n/locales';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell.pages.today');
  return { title: t('title') };
}

export default async function TodayPage() {
  const [t, tc, locale, session] = await Promise.all([
    getTranslations('shell.pages.today'),
    getTranslations('common'),
    getLocale(),
    auth(),
  ]);
  const user = session?.user
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } })
    : null;

  // O "hoje" do diário é o dia no fuso IANA do utilizador.
  const today = new Intl.DateTimeFormat(intlLocale(isAppLocale(locale) ? locale : 'pt-PT'), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: user?.timezone ?? 'Europe/Lisbon',
  }).format(new Date());

  return (
    <>
      <PageHeader eyebrow={today} title={t('title')} subtitle={t('subtitle')} />
      <ComingSoon icon="sun" />
      <Motto text={tc('motto')} />
    </>
  );
}
