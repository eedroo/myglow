import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/env';
import { getAdminStats } from '@/lib/admin/stats';
import { getCourse } from '@/lib/grimoire/content';
import { intlLocale, isAppLocale } from '@/i18n/locales';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatTile } from '@/components/admin/StatTile';
import { AdminTable } from '@/components/admin/AdminTable';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** Backoffice: só para os emails em ADMIN_EMAILS; para os outros a página não existe (404). */
export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) notFound();

  const [t, rawLocale, stats] = await Promise.all([getTranslations('admin'), getLocale(), getAdminStats()]);
  const locale = intlLocale(isAppLocale(rawLocale) ? rawLocale : 'pt-PT');
  const num = new Intl.NumberFormat(locale);
  const n = (v: number) => num.format(v);
  const day = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  const u = stats.users;

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mg-admin">
        <GlassCard title={t('users.title')}>
          <div className="mg-admin__tiles">
            <StatTile value={n(u.total)} label={t('users.total')} />
            <StatTile value={n(u.onboarded)} label={t('users.onboarded')} />
            <StatTile value={n(u.active1d)} label={t('users.active1d')} />
            <StatTile value={n(u.active7d)} label={t('users.active7d')} />
            <StatTile value={n(u.active30d)} label={t('users.active30d')} />
            <StatTile value={n(u.new7d)} label={t('users.new7d')} />
            <StatTile value={n(u.withPush)} label={t('users.withPush')} />
          </div>
        </GlassCard>

        <GlassCard title={t('days.title')}>
          <div className="mg-admin__scroll">
            <AdminTable
              caption={t('days.title')}
              columns={[
                { key: 'day', label: t('days.day') },
                { key: 'signups', label: t('days.signups'), numeric: true },
                { key: 'diary', label: t('days.diary'), numeric: true },
                { key: 'lessons', label: t('days.lessons'), numeric: true },
                { key: 'grimoire', label: t('days.grimoire'), numeric: true },
              ]}
              rows={stats.days.map((d) => ({
                day: day.format(new Date(`${d.date}T00:00:00Z`)),
                signups: n(d.signups),
                diary: n(d.diaryPeople),
                lessons: n(d.lessons),
                grimoire: n(d.grimoirePeople),
              }))}
            />
          </div>
          <p className="mg-admin__note">{t('days.note')}</p>
        </GlassCard>

        <GlassCard title={t('courses.title')}>
          {stats.courses.length === 0 ? (
            <p>{t('empty')}</p>
          ) : (
            <AdminTable
              caption={t('courses.title')}
              columns={[
                { key: 'course', label: t('courses.course') },
                { key: 'started', label: t('courses.started'), numeric: true },
                { key: 'completed', label: t('courses.completed'), numeric: true },
              ]}
              rows={stats.courses.map((c) => ({
                course: getCourse(c.slug, 'pt-BR')?.title ?? c.slug,
                started: n(c.started),
                completed: n(c.completed),
              }))}
            />
          )}
        </GlassCard>

        <GlassCard title={t('notifications.title')}>
          {stats.notifications.length === 0 ? (
            <p>{t('empty')}</p>
          ) : (
            <div className="mg-admin__scroll">
              <AdminTable
                caption={t('notifications.title')}
                columns={[
                  { key: 'kind', label: t('notifications.kind') },
                  { key: 'sent', label: t('notifications.sent'), numeric: true },
                  { key: 'opened', label: t('notifications.opened'), numeric: true },
                  { key: 'rate', label: t('notifications.rate'), numeric: true },
                ]}
                rows={stats.notifications.map((r) => ({
                  kind: r.kind,
                  sent: n(r.sent),
                  opened: n(r.opened),
                  rate: r.sent ? `${Math.round((100 * r.opened) / r.sent)}%` : '–',
                }))}
              />
            </div>
          )}
          <p className="mg-admin__note">{t('notifications.note')}</p>
        </GlassCard>

        <GlassCard title={t('locales.title')}>
          <AdminTable
            caption={t('locales.title')}
            columns={[
              { key: 'locale', label: t('locales.locale') },
              { key: 'users', label: t('locales.users'), numeric: true },
            ]}
            rows={stats.locales.map((l) => ({ locale: l.locale, users: n(l.users) }))}
          />
        </GlassCard>
      </div>
    </>
  );
}
