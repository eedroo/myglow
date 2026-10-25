import 'server-only';
import type { Prisma, ZodiacSign } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, fromDbDate, toDbDate, todayInTz } from '@/lib/dates';
import { levelFor } from '@/lib/xp/levels';
import { DAY_SOURCES } from '@/lib/xp/rules';
import { currentMagicStreak } from '@/lib/xp/streak';
import { publishedCourses } from '@/lib/grimoire/queries';
import { dbToAppLocale } from '@/i18n/locales';
import type { NatalChart } from '@/types/astro';
import { initialsOf, isExpired } from './rules';
import { orbSigns, type OrbSigns } from './orb';

/**
 * Leituras dos Amigos (F15). PRIVACIDADE POR CONSTRUÇÃO: o perfil de um amigo sai só de `getFriendProfile`,
 * com `select` explícito e um DTO de campos fechados. Nada aqui lê o diário, os planners, o Guia nem dados
 * de bem-estar. Acrescentar um campo ao DTO obriga a actualizar `docs/DECISIONS.md`.
 */
export interface FriendSummary {
  id: string;
  name: string;
  initials: string;
  level: number; // levelFor(xpTotal).level
  levelKey: string;
  progress: number; // 0–1 dentro do nível (anel)
  magicStreak: number;
  /** Cores da esfera de luz: só se a pessoa partilha o Sol, a Lua e o Ascendente. */
  orb: OrbSigns | null;
}

export interface FriendProfile extends FriendSummary {
  /** O @ escolhido pela pessoa (público por natureza), ou null. */
  handle: string | null;
  bestMagicStreak: number;
  badges: { courseSlug: string; earnedAt: string }[];
  coursesCompleted: number;
  currentCourse: { slug: string; done: number; total: number } | null;
  bigThree: { sun: ZodiacSign; moon: ZodiacSign; asc: ZodiacSign | null } | null; // null se showBigThree = false
  friendsSince: string;
}

/** Os únicos campos de `User` que os amigos podem ver. */
const PUBLIC_USER = {
  id: true,
  name: true,
  xpTotal: true,
  timezone: true,
  showBigThree: true,
} as const satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER }>;

/** Sol, Lua e Ascendente do mapa (Ascendente só com hora de nascimento). */
export function bigThreeOf(chart: unknown): FriendProfile['bigThree'] {
  const c = chart as NatalChart | null;
  if (!c?.bodies?.SUN || !c.bodies.MOON) return null;
  return {
    sun: c.bodies.SUN.sign,
    moon: c.bodies.MOON.sign,
    asc: c.computedFor?.timeKnown && c.ascendant ? c.ascendant.sign : null,
  };
}

/** Só lê o mapa de quem escolheu partilhar. */
async function bigThreeFor(users: PublicUser[]): Promise<Map<string, FriendProfile['bigThree']>> {
  const ids = users.filter((u) => u.showBigThree).map((u) => u.id);
  if (!ids.length) return new Map();
  const rows = await db.birthProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, natalChart: true } });
  return new Map(rows.map((r) => [r.userId, bigThreeOf(r.natalChart)]));
}

/** Sequência mágica actual de cada pessoa (a mesma função do `StreakCard`), numa só consulta. */
async function streaksFor(users: PublicUser[]): Promise<Map<string, number>> {
  if (!users.length) return new Map();
  const since = toDbDate(addDays(todayInTz('UTC'), -400));
  const rows = await db.xpEvent.findMany({
    where: { userId: { in: users.map((u) => u.id) }, source: { in: [...DAY_SOURCES] }, periodStart: { gte: since } },
    select: { userId: true, periodStart: true },
  });
  const byUser = new Map<string, string[]>();
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? [];
    list.push(fromDbDate(r.periodStart));
    byUser.set(r.userId, list);
  }
  return new Map(users.map((u) => [u.id, currentMagicStreak(byUser.get(u.id) ?? [], todayInTz(u.timezone))]));
}

function summary(u: PublicUser, streak: number, big: FriendProfile['bigThree'] | undefined): FriendSummary {
  const info = levelFor(u.xpTotal);
  return {
    id: u.id,
    name: u.name,
    initials: initialsOf(u.name),
    level: info.level,
    levelKey: info.key,
    progress: info.progress,
    magicStreak: streak,
    orb: u.showBigThree ? orbSigns(big ?? null) : null,
  };
}

async function summaries(users: PublicUser[]): Promise<FriendSummary[]> {
  const [streaks, big] = await Promise.all([streaksFor(users), bigThreeFor(users)]);
  return users.map((u) => summary(u, streaks.get(u.id) ?? 0, big.get(u.id)));
}

/** Ids bloqueados em qualquer sentido. */
async function blockedIds(userId: string): Promise<Set<string>> {
  const rows = await db.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const [userAId, userBId] = a < b ? [a, b] : [b, a];
  return (await db.friendship.count({ where: { userAId, userBId } })) > 0;
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  return (await db.userBlock.count({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } })) > 0;
}

/** Ids dos amigos (e desde quando). */
async function friendIds(userId: string): Promise<{ id: string; since: Date }[]> {
  const rows = await db.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true, createdAt: true },
  });
  return rows.map((r) => ({ id: r.userAId === userId ? r.userBId : r.userAId, since: r.createdAt }));
}

export async function friendsCount(userId: string): Promise<number> {
  return db.friendship.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } });
}

/** Amigos ordenados por nome. */
export async function listFriends(userId: string): Promise<FriendSummary[]> {
  const ids = (await friendIds(userId)).map((f) => f.id);
  if (!ids.length) return [];
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: PUBLIC_USER });
  const list = await summaries(users);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listIncoming(userId: string): Promise<{ id: string; from: FriendSummary; createdAt: string }[]> {
  const now = new Date();
  const [rows, blocked] = await Promise.all([
    db.friendRequest.findMany({
      where: { toId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, from: { select: PUBLIC_USER } },
    }),
    blockedIds(userId),
  ]);
  const live = rows.filter((r) => !isExpired(r.createdAt, now) && !blocked.has(r.from.id));
  const froms = await summaries(live.map((r) => r.from));
  return live.map((r, i) => ({ id: r.id, from: froms[i]!, createdAt: r.createdAt.toISOString() }));
}

export async function listOutgoing(userId: string): Promise<{ id: string; to: { name: string; initials: string }; createdAt: string }[]> {
  const now = new Date();
  const rows = await db.friendRequest.findMany({
    where: { fromId: userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, to: { select: { name: true } } },
  });
  return rows
    .filter((r) => !isExpired(r.createdAt, now))
    .map((r) => ({ id: r.id, to: { name: r.to.name, initials: initialsOf(r.to.name) }, createdAt: r.createdAt.toISOString() }));
}

/** Pedidos por responder (ponto dourado no avatar e no cartão do perfil). */
export async function pendingCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  return db.friendRequest.count({
    where: {
      toId: userId,
      status: 'PENDING',
      createdAt: { gte: since },
      from: { blocks: { none: { blockedId: userId } }, blockedBy: { none: { blockerId: userId } } },
    },
  });
}

/**
 * O perfil que um amigo vê. `null` se não forem amigos ou houver bloqueio em qualquer sentido
 * (a página responde `notFound()` sem distinguir).
 */
export async function getFriendProfile(viewerId: string, targetId: string): Promise<FriendProfile | null> {
  if (viewerId === targetId) return null;
  const [userAId, userBId] = viewerId < targetId ? [viewerId, targetId] : [targetId, viewerId];
  const [friendship, blocked] = await Promise.all([
    db.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { createdAt: true } }),
    isBlockedEitherWay(viewerId, targetId),
  ]);
  if (!friendship || blocked) return null;

  const user = await db.user.findUnique({ where: { id: targetId }, select: { ...PUBLIC_USER, bestMagicStreak: true, locale: true, handle: true } });
  if (!user) return null;

  const [streaks, big, courses, lessons] = await Promise.all([
    streaksFor([user]),
    bigThreeFor([user]),
    db.courseProgress.findMany({ where: { userId: targetId }, select: { courseSlug: true, completedAt: true } }),
    db.lessonProgress.findMany({ where: { userId: targetId }, select: { courseSlug: true, completedAt: true } }),
  ]);

  const completed = courses.filter((c) => c.completedAt !== null);
  const completedSlugs = new Set(completed.map((c) => c.courseSlug));
  // Curso em curso: o da lição mais recente, se ainda não estiver concluído.
  const last = [...lessons].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
  let currentCourse: FriendProfile['currentCourse'] = null;
  if (last && !completedSlugs.has(last.courseSlug)) {
    const course = publishedCourses({ userLocale: dbToAppLocale(user.locale), readInPortuguese: true }).find(
      (c) => c.entry.slug === last.courseSlug,
    );
    if (course) {
      const done = lessons.filter((l) => l.courseSlug === last.courseSlug).length; // uma linha por lição concluída
      currentCourse = { slug: last.courseSlug, done: Math.min(done, course.course.lessons.length), total: course.course.lessons.length };
    }
  }

  const streak = streaks.get(user.id) ?? 0;
  const bigThree = user.showBigThree ? (big.get(user.id) ?? null) : null;
  const profile: FriendProfile = {
    ...summary(user, streak, big.get(user.id)),
    handle: user.handle,
    bestMagicStreak: Math.max(user.bestMagicStreak, streak),
    badges: completed
      .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
      .map((c) => ({ courseSlug: c.courseSlug, earnedAt: c.completedAt!.toISOString() })),
    coursesCompleted: completed.length,
    currentCourse,
    bigThree,
    friendsSince: friendship.createdAt.toISOString(),
  };
  return profile;
}

/** Para a página pública do convite: só o primeiro nome, as iniciais e o nível. */
export async function getInviter(code: string): Promise<{ id: string; name: string; initials: string; level: number } | null> {
  const user = await db.user.findUnique({ where: { friendCode: code }, select: { id: true, name: true, xpTotal: true, onboardedAt: true } });
  if (!user?.onboardedAt) return null;
  const name = user.name.trim().split(/\s+/)[0] ?? '';
  return { id: user.id, name, initials: initialsOf(user.name), level: levelFor(user.xpTotal).level };
}

/** O próprio (avatar na TopBar e no perfil): a esfera usa sempre os signos da pessoa. */
export async function ownOrb(userId: string): Promise<OrbSigns | null> {
  const row = await db.birthProfile.findUnique({ where: { userId }, select: { natalChart: true } });
  return orbSigns(bigThreeOf(row?.natalChart ?? null));
}
