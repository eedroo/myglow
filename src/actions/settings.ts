'use server';

import { cookies } from 'next/headers';
import { IANAZone } from 'luxon';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { settingsSchema, type SettingsInput } from '@/lib/validation/settings';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, dbToAppLocale } from '@/i18n/locales';
import { currentUserJobs } from '@/lib/ai/schedule';
import { toDbDate, todayInTz } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';
import { sendSafely, userEvents } from '@/inngest/client';

type SettingsField = 'name' | 'locale' | 'theme' | 'timezone' | 'sleepGoalMinutes' | 'hemisphere' | 'aiUseIntentions' | 'pronouns';

export type SaveSettingsResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Partial<Record<SettingsField, string>> };

const FIELD_ERRORS: Record<SettingsField, string> = {
  name: 'validation.nameLength',
  locale: 'validation.required',
  theme: 'validation.required',
  timezone: 'validation.timezone',
  sleepGoalMinutes: 'validation.sleepGoal',
  hemisphere: 'validation.required',
  aiUseIntentions: 'validation.required',
  pronouns: 'validation.required',
};

/**
 * Guarda as definições e escreve o cookie NEXT_LOCALE. Ao mudar de língua pede as leituras actuais na nova língua;
 * ao mudar de pronomes apaga as leituras pessoais actuais e futuras e pede-as de novo.
 * O cliente chama depois `update()` da sessão, `setTheme()` e `router.refresh()`.
 */
export async function saveSettings(input: SettingsInput): Promise<SaveSettingsResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, formError: 'common.errors.unauthorized' };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SettingsField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as SettingsField;
      if (field in FIELD_ERRORS) fieldErrors[field] = FIELD_ERRORS[field];
    }
    return { ok: false, fieldErrors };
  }
  if (!IANAZone.isValidZone(parsed.data.timezone)) {
    return { ok: false, fieldErrors: { timezone: 'validation.timezone' } };
  }

  const before = await db.user.findUnique({ where: { id: session.user.id }, select: { locale: true, pronouns: true } });
  await db.user.update({ where: { id: session.user.id }, data: parsed.data });
  cookies().set(LOCALE_COOKIE, dbToAppLocale(parsed.data.locale), LOCALE_COOKIE_OPTIONS);

  const pronounsChanged = !!before && before.pronouns !== parsed.data.pronouns;
  if (pronounsChanged) {
    const monthStart = `${todayInTz(parsed.data.timezone).slice(0, 7)}-01`;
    // Desde o 1.º dia do mês: inclui o dia, a semana e o mês actuais (a semana pode começar no mês anterior).
    const weekStart = weekStartOf(todayInTz(parsed.data.timezone));
    const from = weekStart < monthStart ? weekStart : monthStart;
    await db.userAiContent.deleteMany({ where: { userId: session.user.id, periodStart: { gte: toDbDate(from) } } });
  }
  if (before && (before.locale !== parsed.data.locale || pronounsChanged)) {
    await sendSafely(userEvents(session.user.id, parsed.data.locale, currentUserJobs(new Date(), parsed.data.timezone)));
  }

  return { ok: true };
}
