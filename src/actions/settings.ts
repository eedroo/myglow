'use server';

import { cookies } from 'next/headers';
import { IANAZone } from 'luxon';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { settingsSchema, type SettingsInput } from '@/lib/validation/settings';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, dbToAppLocale } from '@/i18n/locales';
import { currentUserJobs } from '@/lib/ai/schedule';
import { sendSafely, userEvents } from '@/inngest/client';

type SettingsField = 'name' | 'locale' | 'theme' | 'timezone' | 'sleepGoalMinutes' | 'hemisphere' | 'aiUseIntentions';

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
};

/**
 * Guarda as definições e escreve o cookie NEXT_LOCALE. Ao mudar de língua pede as leituras actuais na nova língua.
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

  const before = await db.user.findUnique({ where: { id: session.user.id }, select: { locale: true } });
  await db.user.update({ where: { id: session.user.id }, data: parsed.data });
  cookies().set(LOCALE_COOKIE, dbToAppLocale(parsed.data.locale), LOCALE_COOKIE_OPTIONS);

  if (before && before.locale !== parsed.data.locale) {
    await sendSafely(userEvents(session.user.id, parsed.data.locale, currentUserJobs(new Date(), parsed.data.timezone)));
  }

  return { ok: true };
}
