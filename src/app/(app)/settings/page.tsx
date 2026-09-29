import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logout } from '@/actions/auth';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SettingsForm } from '@/components/forms/SettingsForm';
import { intlLocale, isAppLocale } from '@/i18n/locales';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings');
  return { title: t('title') };
}

function supportedTimezones(current: string): string[] {
  const list = Intl.supportedValuesOf('timeZone');
  return list.includes(current) ? list : [current, ...list];
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [t, tAuth, locale, user] = await Promise.all([
    getTranslations('settings'),
    getTranslations('auth'),
    getLocale(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        locale: true,
        theme: true,
        timezone: true,
        sleepGoalMinutes: true,
        hemisphere: true,
        birthProfile: {
          select: { birthDate: true, birthTime: true, birthTimeKnown: true, placeName: true, timezone: true },
        },
      },
    }),
  ]);
  if (!user) redirect('/login');

  const birth = user.birthProfile;
  const birthDate = birth
    ? new Intl.DateTimeFormat(intlLocale(isAppLocale(locale) ? locale : 'pt-PT'), {
        dateStyle: 'long',
        timeZone: 'UTC', // @db.Date guardado à meia-noite UTC
      }).format(birth.birthDate)
    : null;

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <GlassCard title={t('preferencesSection')}>
        <SettingsForm
          initial={{
            name: user.name,
            locale: user.locale,
            theme: user.theme,
            timezone: user.timezone,
            sleepGoalMinutes: user.sleepGoalMinutes,
            hemisphere: user.hemisphere,
          }}
          timezones={supportedTimezones(user.timezone)}
        />
      </GlassCard>

      <GlassCard
        title={t('birth.title')}
        header={
          <Link href="/onboarding?edit=1" className="mg-btn mg-btn--subtle">
            {t('birth.edit')}
          </Link>
        }
      >
        {birth ? (
          <dl className="mg-dl">
            <dt>{t('birth.date')}</dt>
            <dd>{birthDate}</dd>
            <dt>{t('birth.time')}</dt>
            <dd>{birth.birthTimeKnown && birth.birthTime ? birth.birthTime : t('birth.unknownTime')}</dd>
            <dt>{t('birth.place')}</dt>
            <dd>{birth.placeName}</dd>
            <dt>{t('birth.timezone')}</dt>
            <dd>{birth.timezone.replaceAll('_', ' ')}</dd>
          </dl>
        ) : (
          <p>{t('birth.empty')}</p>
        )}
      </GlassCard>

      <GlassCard title={t('accountSection')}>
        <dl className="mg-dl">
          <dt>{t('email')}</dt>
          <dd>{user.email}</dd>
        </dl>
        <form action={logout}>
          <Button type="submit" variant="ghost">
            {tAuth('logout')}
          </Button>
        </form>
      </GlassCard>
    </>
  );
}
