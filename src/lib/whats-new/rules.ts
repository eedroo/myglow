import { compareDates, type DateISO } from '@/lib/dates';
import type { AppLocale } from '@/i18n/locales';
import type { MagicIconName } from '@/lib/icons';
import type { Release } from './schema';

/** Regras do pop-up "Novidades". Puras. */
export const MAX_ITEMS = 8;

export interface AnnouncementItem {
  key: string; // "release:<id>" ou "course:<slug>" — marcado como visto ao fechar
  icon: MagicIconName;
  href?: string;
  /** Texto final (release) ou título do curso (o componente monta a frase). */
  text?: string;
  courseTitle?: string;
  date: DateISO;
}

export interface CourseAnnouncement {
  slug: string;
  title: string; // na língua em que o utilizador lê o curso
  icon: MagicIconName;
  publishedAt?: DateISO;
}

/**
 * Novidades por ver: lançamentos e cursos publicados DEPOIS do registo do utilizador (para quem chega
 * depois, isso já não é novidade) e ainda não vistos. Mais recentes primeiro; itens de um lançamento juntos.
 */
export function pendingAnnouncements(i: {
  releases: Release[];
  courses: CourseAnnouncement[];
  userSince: DateISO;
  seen: Set<string>;
  locale: AppLocale;
}): AnnouncementItem[] {
  const isNew = (date: DateISO) => compareDates(date, i.userSince) > 0;
  const fromReleases = i.releases
    .filter((r) => isNew(r.date) && !i.seen.has(`release:${r.id}`))
    .flatMap((r) => r.items.map((it) => ({ key: `release:${r.id}`, icon: it.icon, href: it.href, text: it.text[i.locale], date: r.date })));
  const fromCourses = i.courses
    .filter((c) => c.publishedAt && isNew(c.publishedAt) && !i.seen.has(`course:${c.slug}`))
    .map((c) => ({ key: `course:${c.slug}`, icon: c.icon, href: `/grimoire#region-${c.slug}`, courseTitle: c.title, date: c.publishedAt! }));
  return [...fromCourses, ...fromReleases].sort((a, b) => compareDates(b.date, a.date)).slice(0, MAX_ITEMS);
}
