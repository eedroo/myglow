'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { saveSettings } from '@/actions/settings';
import { Button } from '@/components/ui/Button';
import { Field, describedBy } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Toast } from '@/components/ui/Toast';
import { DB_LOCALES, type DbLocale } from '@/i18n/locales';
import { prefToNextTheme, type ThemePref } from '@/lib/theme';
import type { SettingsInput } from '@/lib/validation/settings';

const THEMES: ThemePref[] = ['LIGHT', 'DARK', 'SYSTEM'];

interface SettingsFormProps {
  initial: SettingsInput;
  timezones: string[];
}

export function SettingsForm({ initial, timezones }: SettingsFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { update } = useSession();
  const { setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [locale, setLocale] = useState<DbLocale>(initial.locale);
  const [theme, setThemePref] = useState<ThemePref>(initial.theme);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [sleepHours, setSleepHours] = useState(String(initial.sleepGoalMinutes / 60));
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsInput, string>>>({});
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; messageKey: string } | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToast(null);
    const hours = Number(sleepHours.replace(',', '.'));

    startTransition(async () => {
      const result = await saveSettings({
        name,
        locale,
        theme,
        timezone,
        sleepGoalMinutes: Number.isFinite(hours) ? Math.round(hours * 60) : NaN,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setToast({ variant: 'error', messageKey: result.formError ?? 'common.errors.generic' });
        return;
      }
      setErrors({});
      setTheme(prefToNextTheme(theme));
      // Com argumento → POST → jwt({ trigger: "update" }) relê a DB (sem argumento é só um GET).
      await update({});
      // Re-renderiza os Server Components com o novo cookie NEXT_LOCALE (textos mudam sem recarregar).
      router.refresh();
      // Guarda a chave (não o texto) para o toast aparecer já na nova língua.
      setToast({ variant: 'success', messageKey: 'common.saved' });
    });
  }

  const err = (key?: string) => (key ? t(key) : undefined);
  const tzHint = t('settings.timezoneHint');
  const sleepHint = t('settings.sleepGoalHint');

  return (
    <form className="mg-stack mg-stack--lg" onSubmit={onSubmit} noValidate>
      <Field id="settings-name" label={t('settings.name')} error={err(errors.name)}>
        <TextInput
          id="settings-name"
          value={name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          invalid={!!errors.name}
          aria-describedby={describedBy('settings-name', { error: errors.name })}
        />
      </Field>

      <SegmentedControl<DbLocale>
        name="locale"
        legend={t('settings.language')}
        value={locale}
        onChange={setLocale}
        options={DB_LOCALES.map((value) => ({ value, label: t(`settings.languageOptions.${value}`) }))}
      />

      <SegmentedControl<ThemePref>
        name="theme"
        legend={t('settings.theme')}
        value={theme}
        onChange={(value) => {
          setThemePref(value);
          setTheme(prefToNextTheme(value)); // pré-visualização imediata
        }}
        options={THEMES.map((value) => ({ value, label: t(`settings.themeOptions.${value}`) }))}
      />

      <Field id="settings-timezone" label={t('settings.timezone')} hint={tzHint} error={err(errors.timezone)}>
        <select
          id="settings-timezone"
          className="mg-select"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          aria-describedby={describedBy('settings-timezone', { hint: tzHint, error: errors.timezone })}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </Field>

      <Field id="settings-sleep" label={t('settings.sleepGoal')} hint={sleepHint} error={err(errors.sleepGoalMinutes)}>
        <TextInput
          id="settings-sleep"
          type="number"
          inputMode="decimal"
          min={4}
          max={12}
          step={0.5}
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          invalid={!!errors.sleepGoalMinutes}
          aria-describedby={describedBy('settings-sleep', { hint: sleepHint, error: errors.sleepGoalMinutes })}
        />
      </Field>

      <Button type="submit" loading={pending} loadingLabel={t('common.saving')}>
        {t('common.save')}
      </Button>

      {toast && (
        <Toast variant={toast.variant} message={t(toast.messageKey)} closeLabel={t('common.close')} onClose={() => setToast(null)} />
      )}
    </form>
  );
}
