import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { DateTime } from 'luxon';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { OnboardingForm, type OnboardingInitial } from '@/components/forms/OnboardingForm';
import { geocodeLanguage, isAppLocale } from '@/i18n/locales';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('onboarding');
  return { title: t('title') };
}

interface OnboardingPageProps {
  searchParams: { edit?: string };
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [t, locale, profile] = await Promise.all([
    getTranslations('onboarding'),
    getLocale(),
    db.birthProfile.findUnique({ where: { userId: session.user.id } }),
  ]);
  const isEdit = searchParams.edit === '1' && session.user.onboarded;

  const initial: OnboardingInitial | undefined = profile
    ? {
        birthDate: profile.birthDate.toISOString().slice(0, 10),
        birthTime: profile.birthTime,
        birthTimeKnown: profile.birthTimeKnown,
        placeName: profile.placeName,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone,
      }
    : undefined;

  // Máximo "hoje" no fuso mais adiantado (UTC+14) para não bloquear ninguém que nasceu hoje.
  const maxDate = DateTime.utc().plus({ hours: 14 }).toISODate() ?? '';

  return (
    <>
      <AmbientBackground />
      <main className="mg-auth">
        <div className="mg-auth__brand">
          <MagicIcon name="zodiac-wheel" size="lg" decorative />
          <h1 className="mg-auth__title">{isEdit ? t('editTitle') : t('title')}</h1>
          <p className="mg-auth__tagline">{isEdit ? t('editSubtitle') : t('subtitle')}</p>
        </div>
        <GlassCard className="mg-auth__card mg-auth__card--wide" variant="accent">
          <OnboardingForm
            initial={initial}
            isEdit={isEdit}
            geocodeLang={geocodeLanguage(isAppLocale(locale) ? locale : 'pt-PT')}
            maxDate={maxDate}
          />
        </GlassCard>
      </main>
    </>
  );
}
