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
import { hasPush } from '@/lib/env';
import { listDevices } from '@/actions/push';
import { signOutEverywhere } from '@/actions/account';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { ChangeEmailForm } from '@/components/account/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { ResendVerificationButton } from '@/components/account/ResendVerificationButton';
import { WellbeingConsentCard } from '@/components/account/WellbeingConsentCard';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { DELETE_CONFIRM_WORD } from '@/lib/validation/account';

const SECTIONS = ['profile', 'account', 'preferences', 'birth', 'notifications', 'privacy', 'sessions', 'danger'] as const;

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

  const [t, tAuth, tn, ta, tr, locale, devices, user] = await Promise.all([
    getTranslations('settings'),
    getTranslations('auth'),
    getTranslations('notifications.settings'),
    getTranslations('account'),
    getTranslations('reading.settings'),
    getLocale(),
    listDevices(),
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
        pronouns: true,
        emailVerifiedAt: true,
        wellbeingConsentAt: true,
        notificationPrefs: true,
        birthProfile: {
          select: { birthDate: true, birthTime: true, birthTimeKnown: true, placeName: true, timezone: true },
        },
      },
    }),
  ]);
  if (!user) redirect('/login');

  const birth = user.birthProfile;
  const prefs = user.notificationPrefs;
  const intl = intlLocale(isAppLocale(locale) ? locale : 'pt-PT');
  const birthDate = birth
    ? new Intl.DateTimeFormat(intl, {
        dateStyle: 'long',
        timeZone: 'UTC', // @db.Date guardado à meia-noite UTC
      }).format(birth.birthDate)
    : null;
  const consentedOn = user.wellbeingConsentAt
    ? new Intl.DateTimeFormat(intl, { dateStyle: 'long', timeZone: user.timezone }).format(user.wellbeingConsentAt)
    : null;
  const formInitial = {
    name: user.name,
    locale: user.locale,
    theme: user.theme,
    timezone: user.timezone,
    sleepGoalMinutes: user.sleepGoalMinutes,
    hemisphere: user.hemisphere,
    pronouns: user.pronouns,
  };
  const timezones = supportedTimezones(user.timezone);

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mg-settings">
      <SettingsNav label={t('sections.label')} sections={SECTIONS.map((id) => ({ id, label: t(`sections.${id}`) }))} />
      <div className="mg-settings__sections">
      <GlassCard id="profile" className="mg-settings__section" title={t('sections.profile')}>
        <SettingsForm part="profile" initial={formInitial} timezones={timezones} />
      </GlassCard>

      <GlassCard id="account" className="mg-settings__section" title={t('sections.account')}>
        <div className="mg-form">
          <dl className="mg-dl">
            <dt>{t('email')}</dt>
            <dd>
              {user.email}{' '}
              <span className={user.emailVerifiedAt ? 'mg-form__status mg-form__status--ok' : 'mg-form__status'}>
                {user.emailVerifiedAt ? ta('email.verified') : ta('email.unverified')}
              </span>
            </dd>
          </dl>
          {!user.emailVerifiedAt && (
            <div className="mg-banner__actions">
              <ResendVerificationButton />
            </div>
          )}
          <hr className="mg-form__divider" />
          <ChangeEmailForm />
          <hr className="mg-form__divider" />
          <ChangePasswordForm />
        </div>
      </GlassCard>

      <GlassCard id="preferences" className="mg-settings__section" title={t('sections.preferences')}>
        <SettingsForm part="preferences" initial={formInitial} timezones={timezones} />
      </GlassCard>

      <GlassCard
        id="birth"
        className="mg-settings__section"
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

      <GlassCard id="notifications" className="mg-settings__section" title={tn('title')}>
        <NotificationSettings
          initial={{
            enabled: prefs?.enabled ?? true,
            morningEnabled: prefs?.morningEnabled ?? true,
            bodyEnabled: prefs?.bodyEnabled ?? true,
            nightEnabled: prefs?.nightEnabled ?? true,
            morningTime: prefs?.morningTime ?? '08:00',
            bodyTime: prefs?.bodyTime ?? '13:00',
            nightTime: prefs?.nightTime ?? '21:30',
            weekStart: prefs?.weekStart ?? true,
            weekEnd: prefs?.weekEnd ?? true,
            monthStart: prefs?.monthStart ?? true,
            monthEnd: prefs?.monthEnd ?? true,
            lastCall: prefs?.lastCall ?? true,
            grimoireEnabled: prefs?.grimoireEnabled ?? true,
            grimoireTime: prefs?.grimoireTime ?? '10:00',
          }}
          devices={devices}
          pushConfigured={hasPush()}
        />
      </GlassCard>

      <GlassCard id="privacy" className="mg-settings__section" title={t('sections.privacy')}>
        <div className="mg-form">
          <div>
            <h3 className="mg-form__title">{tr('title')}</h3>
            <p className="mg-form__status">{tr('aiPrivacy')}</p>
          </div>
          <hr className="mg-form__divider" />
          <WellbeingConsentCard consentedOn={consentedOn} />
          <hr className="mg-form__divider" />
          <div className="mg-form">
            <h3 className="mg-form__title">{ta('export.title')}</h3>
            <p className="mg-form__status">{ta('export.text')}</p>
            <div className="mg-form__row">
              <a href="/api/account/export" download className="mg-btn mg-btn--ghost">
                {ta('export.button')}
              </a>
            </div>
          </div>
          <hr className="mg-form__divider" />
          <p className="mg-form__row">
            <Link href="/privacy">{ta('links.privacy')}</Link>
            <Link href="/terms">{ta('links.terms')}</Link>
          </p>
        </div>
      </GlassCard>

      <GlassCard id="sessions" className="mg-settings__section" title={t('sections.sessions')}>
        <div className="mg-form">
          <p className="mg-form__status">{ta('sessions.text')}</p>
          <div className="mg-form__row">
            <form action={logout}>
              <Button type="submit" variant="ghost">
                {tAuth('logout')}
              </Button>
            </form>
            <form action={signOutEverywhere}>
              <Button type="submit" variant="subtle">
                {ta('sessions.button')}
              </Button>
            </form>
          </div>
        </div>
      </GlassCard>

      <GlassCard id="danger" className="mg-settings__section" title={t('sections.danger')}>
        <DeleteAccountDialog confirmWord={DELETE_CONFIRM_WORD[user.locale]} />
      </GlassCard>
      </div>
      </div>
    </>
  );
}
