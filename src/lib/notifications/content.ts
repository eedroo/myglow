import type { Locale, MoonPhase, NotificationKind, ZodiacSign } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import type { SabbatKey } from '@/lib/astro/skyEvents';
import { XP_POINTS } from '@/lib/xp/rules';
import { weekStartOf } from '@/lib/weeks';
import { translatorFor } from '@/i18n/translator';

/** Texto de cada lembrete (push e caixa de avisos), na língua do utilizador. Puro. */
export const MAX_TITLE = 50;
export const MAX_BODY = 110;

export const MOON_EMOJI: Record<MoonPhase, string> = {
  NEW_MOON: '🌑',
  WAXING_CRESCENT: '🌒',
  FIRST_QUARTER: '🌓',
  WAXING_GIBBOUS: '🌔',
  FULL_MOON: '🌕',
  WANING_GIBBOUS: '🌖',
  LAST_QUARTER: '🌗',
  WANING_CRESCENT: '🌘',
};

export interface NotificationContent {
  title: string;
  body: string;
  url: string;
}

export interface NotificationContext {
  locale: Locale;
  date: DateISO;
  tz: string;
  moon?: { phase: MoonPhase; sign: ZodiacSign }; // MORNING e NIGHT
  sabbatToday?: SabbatKey;
  ritualToday?: string; // título do ritual do mês marcado para hoje
  // Convites (F7+): títulos das leituras IA já prontas (dia, semana, mês) e n.º de rituais do mês
  dayHeadline?: string;
  /** Da leitura do dia: a intenção sugerida (manhã) e a pergunta de reflexão (noite). */
  dayIntention?: string;
  dayQuestion?: string;
  weekHeadline?: string;
  monthHeadline?: string;
  monthRituals?: number;
  /** Período do aviso (para a última chamada da reflexão, que abre a semana/mês anterior). */
  periodKey?: string;
  /** Grimório do dia (GRIMOIRE e GRIMOIRE_LAST), com a próxima lição e os seus ganchos. */
  grimoire?: { lessonsLeft: number; quizPending: boolean; next?: { lesson: string; minutes: number; hooks: string[] } };
  /** F13: retrospectiva elegível e por ver (WEEK_START e MONTH_START): o aviso abre-a. */
  recapUrl?: { week?: string; month?: string };
  /** F15: primeiro nome de quem pediu ou aceitou a amizade. */
  friendName?: string;
  /** F16: exercício da próxima série (aviso de fim de descanso). */
  exerciseName?: string;
  /** F19: o que abriu na jornada (JOURNEY_UNLOCK) ou o anúncio publicado (ANNOUNCEMENT), ex. 'stage-2', 'v2'. */
  unlockId?: string;
  announcement?: string;
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

/** Rodízio: índice 0..n-1 que muda todos os dias (dois dias seguidos nunca repetem) e é igual num reenvio. */
export function dailyVariant(date: DateISO, n: number, salt = 0): number {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return (((day + salt) % n) + n) % n;
}

/** Chave da variante: a 1.ª é a chave base (`title`), as seguintes `title2`, `title3`… */
const variantKey = (base: string, i: number) => (i === 0 ? base : `${base}${i + 1}`);

/** Ganchos da lição que cabem inteiros no corpo (para não cortar a frase a meio); senão, todos. */
function hookFor(hooks: string[], date: DateISO, salt: number): string {
  const fit = hooks.filter((h) => h.length <= MAX_BODY);
  const pool = fit.length ? fit : hooks;
  return pool[dailyVariant(date, pool.length, salt)]!;
}

export function buildNotification(kind: NotificationKind, ctx: NotificationContext): NotificationContent {
  const t = translatorFor(ctx.locale);
  const emoji = ctx.moon ? MOON_EMOJI[ctx.moon.phase] : '✨';
  let title: string;
  let body: string;
  let url = '/today';
  // F18: os lembretes do dia e do período abrem o fluxo do modo guiado.
  const dayFlow = (segment: 'morning' | 'body' | 'night') => `/guided/day/${ctx.date}/${segment}`;
  const weekFlow = (segment: 'plan' | 'close') => `/guided/week/${weekStartOf(ctx.date)}/${segment}`;
  const monthFlow = (segment: 'plan' | 'close') => `/guided/month/${ctx.date.slice(0, 7)}/${segment}`;

  switch (kind) {
    case 'MORNING':
      if (ctx.dayHeadline) {
        // Convite: a mensagem do dia (leitura IA) já está pronta.
        // Convite: o título da leitura do dia e, no corpo, a intenção sugerida (o ritual do dia tem prioridade).
        title = ctx.dayHeadline;
        body = ctx.ritualToday
          ? t('notifications.push.morning.bodyRitual', { ritual: ctx.ritualToday })
          : (ctx.dayIntention ?? t('notifications.push.morning.readyBody'));
        break;
      }
      title = ctx.moon
        ? t('notifications.push.morning.title', {
            phase: t(`astro.phases.${ctx.moon.phase}`),
            sign: t(`astro.signs.${ctx.moon.sign}`),
            emoji,
          })
        : t('notifications.push.morning.body');
      body = ctx.ritualToday
        ? t('notifications.push.morning.bodyRitual', { ritual: ctx.ritualToday })
        : ctx.sabbatToday
          ? t('notifications.push.morning.bodySabbat', { sabbat: t(`sky.sabbats.${ctx.sabbatToday}.name`) })
          : t(variantKey('notifications.push.morning.body', dailyVariant(ctx.date, 3)));
      url = dayFlow('morning');
      break;
    case 'BODY': {
      const i = dailyVariant(ctx.date, 3, 1);
      title = t(variantKey('notifications.push.body.title', i));
      body = t(variantKey('notifications.push.body.body', i));
      url = dayFlow('body');
      break;
    }
    case 'NIGHT':
      // A pergunta de reflexão da leitura do dia; sem leitura, uma das variantes.
      title = t(variantKey('notifications.push.night.title', dailyVariant(ctx.date, 3, 2)), { emoji });
      body = ctx.dayQuestion ?? t(variantKey('notifications.push.night.body', dailyVariant(ctx.date, 3)));
      url = dayFlow('night');
      break;
    case 'WEEK_START':
      title = ctx.weekHeadline ?? t('notifications.push.weekStart.title');
      body = ctx.weekHeadline
        ? t('notifications.push.weekStart.readyBody')
        : t('notifications.push.weekStart.body', { points: XP_POINTS.WEEK_PLAN });
      url = weekFlow('plan');
      if (ctx.recapUrl?.week) {
        body = t('notifications.push.weekStart.recapBody');
        url = ctx.recapUrl.week;
      }
      break;
    case 'WEEK_END':
      title = t('notifications.push.weekEnd.title');
      body = t('notifications.push.weekEnd.body', { points: XP_POINTS.WEEK_REFLECTION });
      url = weekFlow('close');
      break;
    case 'MONTH_START':
      title = ctx.monthHeadline ?? t('notifications.push.monthStart.title');
      body = ctx.monthHeadline
        ? t('notifications.push.monthStart.readyBody', { rituals: ctx.monthRituals ?? 0 })
        : t('notifications.push.monthStart.body', { points: XP_POINTS.MONTH_PLAN });
      url = monthFlow('plan');
      if (ctx.recapUrl?.month) {
        body = t('notifications.push.monthStart.recapBody');
        url = ctx.recapUrl.month;
      }
      break;
    case 'MONTH_END':
      title = t('notifications.push.monthEnd.title');
      body = t('notifications.push.monthEnd.body', { points: XP_POINTS.MONTH_REFLECTION });
      url = monthFlow('close');
      break;
    case 'WEEK_PLAN_LAST':
      title = t('notifications.push.weekPlanLast.title');
      body = t('notifications.push.weekPlanLast.body', { points: XP_POINTS.WEEK_PLAN });
      url = '/week';
      break;
    case 'WEEK_REFLECTION_LAST':
      title = t('notifications.push.weekReflectionLast.title');
      body = t('notifications.push.weekReflectionLast.body', { points: XP_POINTS.WEEK_REFLECTION });
      url = ctx.periodKey?.startsWith('W') ? `/week/${ctx.periodKey.slice(1)}` : '/week';
      break;
    case 'MONTH_PLAN_LAST':
      title = t('notifications.push.monthPlanLast.title');
      body = t('notifications.push.monthPlanLast.body', { points: XP_POINTS.MONTH_PLAN });
      url = '/month';
      break;
    case 'MONTH_REFLECTION_LAST':
      title = t('notifications.push.monthReflectionLast.title');
      body = t('notifications.push.monthReflectionLast.body', { points: XP_POINTS.MONTH_REFLECTION });
      url = ctx.periodKey?.startsWith('M') ? `/month/${ctx.periodKey.slice(1)}` : '/month';
      break;
    case 'GRIMOIRE': {
      const left = ctx.grimoire?.lessonsLeft ?? 0;
      const next = ctx.grimoire?.next;
      // Sem lições novas mas com o quiz por fazer: convite para o quiz.
      if (left === 0 && ctx.grimoire?.quizPending) {
        title = t('notifications.push.grimoire.quizTitle');
        body = t('notifications.push.grimoire.quizBody', { points: XP_POINTS.COURSE_COMPLETE });
      } else if (next?.hooks.length) {
        // A próxima lição pelo nome e um gancho tirado dela (muda de dia para dia).
        title = t(variantKey('notifications.push.grimoire.lessonTitle', dailyVariant(ctx.date, 3)), { lesson: next.lesson });
        // Título longo demais com o nome da lição: a forma curta ("📖 {lição}").
        if (title.length > MAX_TITLE) title = t('notifications.push.grimoire.lessonTitle', { lesson: next.lesson });
        body = hookFor(next.hooks, ctx.date, 0);
      } else {
        title = t('notifications.push.grimoire.title');
        body = t('notifications.push.grimoire.body', { count: left });
      }
      url = '/grimoire';
      break;
    }
    case 'GRIMOIRE_LAST': {
      const next = ctx.grimoire?.next;
      if (next?.hooks.length) {
        // A mesma lição, com outro gancho do que o da manhã.
        const params = { lesson: next.lesson, minutes: next.minutes };
        title = t(variantKey('notifications.push.grimoireLast.lessonTitle', dailyVariant(ctx.date, 3, 1)), params);
        // Título longo demais com o nome da lição: a variante sem o nome ("{minutes} min antes de dormir").
        if (title.length > MAX_TITLE) title = t('notifications.push.grimoireLast.lessonTitle2', params);
        body = hookFor(next.hooks, ctx.date, 1);
      } else {
        title = t('notifications.push.grimoireLast.title');
        body = t('notifications.push.grimoireLast.body', { count: ctx.grimoire?.lessonsLeft ?? 0 });
      }
      url = '/grimoire';
      break;
    }
    // F15: amigos. Só o primeiro nome de quem pediu ou aceitou.
    case 'FRIEND_REQUEST':
      title = t('notifications.push.friendRequest.title', { name: ctx.friendName ?? '' });
      body = t('notifications.push.friendRequest.body');
      url = '/friends';
      break;
    case 'FRIEND_ACCEPTED':
      title = t('notifications.push.friendAccepted.title', { name: ctx.friendName ?? '' });
      body = t('notifications.push.friendAccepted.body');
      url = '/friends';
      break;
    // F16: fim do descanso (só push, nunca na caixa de avisos).
    case 'REST_DONE':
      title = t('notifications.push.restDone.title');
      body = ctx.exerciseName
        ? t('notifications.push.restDone.body', { exercise: ctx.exerciseName })
        : t('notifications.push.restDone.bodyGeneric');
      url = '/body/session';
      break;
    // F17: lembrete de pesagem (só sai sem registo hoje).
    case 'WEIGH_IN':
      title = t('notifications.push.weighIn.title');
      body = t('notifications.push.weighIn.body');
      url = '/body/weight?new=1';
      break;
    // F19: novo passo da jornada (a mini-lição abre no Hoje) e anúncios (os slides de novidades abrem no Hoje).
    case 'JOURNEY_UNLOCK':
      title = t('notifications.push.journeyUnlock.title');
      body = t(`notifications.push.journeyUnlock.${ctx.unlockId ?? 'stage-2'}`);
      break;
    case 'ANNOUNCEMENT':
      title = t(`notifications.push.announcement.${ctx.announcement ?? 'v2'}.title`);
      body = t(`notifications.push.announcement.${ctx.announcement ?? 'v2'}.body`);
      break;
  }
  return { title: clip(title, MAX_TITLE), body: clip(body, MAX_BODY), url };
}

/** Notificação de teste (definições). */
export function testNotification(locale: Locale): NotificationContent {
  const t = translatorFor(locale);
  return { title: t('notifications.push.test.title'), body: t('notifications.push.test.body'), url: '/settings' };
}
