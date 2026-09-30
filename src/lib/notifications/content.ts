import type { Locale, MoonPhase, NotificationKind, ZodiacSign } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import type { SabbatKey } from '@/lib/astro/skyEvents';
import { XP_POINTS } from '@/lib/xp/rules';
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
  weekHeadline?: string;
  monthHeadline?: string;
  monthRituals?: number;
  /** Período do aviso (para a última chamada da reflexão, que abre a semana/mês anterior). */
  periodKey?: string;
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

export function buildNotification(kind: NotificationKind, ctx: NotificationContext): NotificationContent {
  const t = translatorFor(ctx.locale);
  const emoji = ctx.moon ? MOON_EMOJI[ctx.moon.phase] : '✨';
  let title: string;
  let body: string;
  let url = '/today';

  switch (kind) {
    case 'MORNING':
      if (ctx.dayHeadline) {
        // Convite: a mensagem do dia (leitura IA) já está pronta.
        title = ctx.dayHeadline;
        body = ctx.ritualToday
          ? t('notifications.push.morning.readyBodyRitual', { ritual: ctx.ritualToday })
          : t('notifications.push.morning.readyBody');
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
          : t('notifications.push.morning.body');
      break;
    case 'BODY':
      title = t('notifications.push.body.title');
      body = t('notifications.push.body.body');
      break;
    case 'NIGHT':
      title = t('notifications.push.night.title', { emoji });
      body = t('notifications.push.night.body');
      break;
    case 'WEEK_START':
      title = ctx.weekHeadline ?? t('notifications.push.weekStart.title');
      body = ctx.weekHeadline
        ? t('notifications.push.weekStart.readyBody')
        : t('notifications.push.weekStart.body', { points: XP_POINTS.WEEK_PLAN });
      url = '/week';
      break;
    case 'WEEK_END':
      title = t('notifications.push.weekEnd.title');
      body = t('notifications.push.weekEnd.body', { points: XP_POINTS.WEEK_REFLECTION });
      url = '/week';
      break;
    case 'MONTH_START':
      title = ctx.monthHeadline ?? t('notifications.push.monthStart.title');
      body = ctx.monthHeadline
        ? t('notifications.push.monthStart.readyBody', { rituals: ctx.monthRituals ?? 0 })
        : t('notifications.push.monthStart.body', { points: XP_POINTS.MONTH_PLAN });
      url = '/month';
      break;
    case 'MONTH_END':
      title = t('notifications.push.monthEnd.title');
      body = t('notifications.push.monthEnd.body', { points: XP_POINTS.MONTH_REFLECTION });
      url = '/month';
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
  }
  return { title: clip(title, MAX_TITLE), body: clip(body, MAX_BODY), url };
}

/** Notificação de teste (definições). */
export function testNotification(locale: Locale): NotificationContent {
  const t = translatorFor(locale);
  return { title: t('notifications.push.test.title'), body: t('notifications.push.test.body'), url: '/settings' };
}
