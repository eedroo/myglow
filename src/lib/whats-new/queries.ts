import 'server-only';
import type { Locale } from '@prisma/client';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { dbToAppLocale } from '@/i18n/locales';
import { getCatalog } from '@/lib/grimoire/content';
import { contentPrefsFor, publishedCourses } from '@/lib/grimoire/queries';
import { getWhatsNew } from './content';
import { pendingAnnouncements, type AnnouncementItem } from './rules';

/** Novidades por ver para o pop-up (cursos novos do Grimório + lançamentos de `content/whats-new.json`). */
export async function getPendingAnnouncements(user: { id: string; locale: Locale; timezone: string; createdAt: Date }): Promise<AnnouncementItem[]> {
  const seen = await db.announcementSeen.findMany({ where: { userId: user.id }, select: { key: true } });
  const publishedAt = new Map(getCatalog().map((c) => [c.slug, c.publishedAt]));
  const courses = publishedCourses(contentPrefsFor(user.locale)).map(({ entry, course }) => ({
    slug: entry.slug,
    title: course.title,
    icon: course.icon,
    publishedAt: publishedAt.get(entry.slug),
  }));
  return pendingAnnouncements({
    releases: getWhatsNew().releases,
    courses,
    userSince: todayInTz(user.timezone, user.createdAt),
    seen: new Set(seen.map((s) => s.key)),
    locale: dbToAppLocale(user.locale),
  });
}
