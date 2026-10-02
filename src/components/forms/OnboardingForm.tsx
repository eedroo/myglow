'use client';

import { useCallback, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { isOldEnough, MIN_AGE } from '@/lib/account/age';
import { UnderageNotice } from '@/components/account/UnderageNotice';
import { saveBirthProfile, type BirthField } from '@/actions/onboarding';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { Button } from '@/components/ui/Button';
import { Field, describedBy } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';
import type { PlaceResult } from '@/lib/geocode';

export interface OnboardingInitial {
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface OnboardingFormProps {
  initial?: OnboardingInitial;
  isEdit: boolean;
  geocodeLang: 'pt' | 'en';
  /** Data máxima (hoje) em YYYY-MM-DD. */
  maxDate: string;
  /** Palavra para apagar a conta ("APAGAR"/"DELETE"), se for menor de 16 anos. */
  confirmWord: string;
}

type Place = Pick<PlaceResult, 'latitude' | 'longitude' | 'timezone'> & { label: string };

export function OnboardingForm({ initial, isEdit, geocodeLang, maxDate, confirmWord }: OnboardingFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2>(1);
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(initial?.birthTime ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial ? !initial.birthTimeKnown : false);
  const [place, setPlace] = useState<Place | null>(
    initial
      ? { label: initial.placeName, latitude: initial.latitude, longitude: initial.longitude, timezone: initial.timezone }
      : null,
  );
  const [errors, setErrors] = useState<Partial<Record<BirthField, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [underage, setUnderage] = useState(false);

  const fetchPlaces = useCallback(
    async (q: string, signal: AbortSignal) => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&lang=${geocodeLang}`, { signal });
      if (!res.ok) throw new Error(String(res.status));
      return ((await res.json()) as { results: PlaceResult[] }).results;
    },
    [geocodeLang],
  );

  function validateStep1(): boolean {
    const next: typeof errors = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > maxDate) next.birthDate = 'validation.birthDate';
    if (!timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) next.birthTime = 'validation.birthTime';
    setErrors(next);
    if (!next.birthDate && !isOldEnough(birthDate, new Date().toLocaleDateString('en-CA'), MIN_AGE)) {
      setUnderage(true);
      return false;
    }
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }
    if (!place) {
      setErrors({ placeName: 'validation.place' });
      return;
    }

    startTransition(async () => {
      const result = await saveBirthProfile({
        birthDate,
        birthTimeKnown: !timeUnknown,
        birthTime: timeUnknown ? null : birthTime,
        placeName: place.label,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (!result.ok) {
        if (result.underage) return setUnderage(true);
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError);
        if (result.fieldErrors?.birthDate || result.fieldErrors?.birthTime) setStep(1);
        return;
      }
      // Com argumento → POST → jwt({ trigger: "update" }) relê a DB (sem argumento é só um GET).
      await update({});
      router.replace(isEdit ? '/settings' : '/today');
      router.refresh();
    });
  }

  const err = (key?: string) => (key ? t(key) : undefined);
  const timeHint = t('onboarding.step1.unknownTimeHelp');

  if (underage) return <UnderageNotice confirmWord={confirmWord} />;

  return (
    <form className="mg-stack mg-stack--lg" onSubmit={onSubmit} noValidate>
      <div className="mg-stack">
        <p className="mg-label">{t('onboarding.stepLabel', { current: step, total: 2 })}</p>
        <div className="mg-steps" aria-hidden="true">
          <span className="mg-steps__dot mg-steps__dot--active" />
          <span className={step === 2 ? 'mg-steps__dot mg-steps__dot--active' : 'mg-steps__dot'} />
        </div>
      </div>

      {formError && (
        <p className="mg-form-error" role="alert">
          {t(formError)}
        </p>
      )}

      {step === 1 ? (
        <fieldset className="mg-stack">
          <legend className="mg-card__title">{t('onboarding.step1.title')}</legend>
          <Field id="birth-date" label={t('onboarding.step1.birthDate')} error={err(errors.birthDate)}>
            <TextInput
              id="birth-date"
              type="date"
              max={maxDate}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              invalid={!!errors.birthDate}
              aria-describedby={describedBy('birth-date', { error: errors.birthDate })}
              required
            />
          </Field>
          <Field id="birth-time" label={t('onboarding.step1.birthTime')} hint={timeHint} error={err(errors.birthTime)}>
            <TextInput
              id="birth-time"
              type="time"
              value={timeUnknown ? '' : birthTime}
              disabled={timeUnknown}
              onChange={(e) => setBirthTime(e.target.value)}
              invalid={!!errors.birthTime}
              aria-describedby={describedBy('birth-time', { hint: timeHint, error: errors.birthTime })}
              required={!timeUnknown}
            />
          </Field>
          <label className="mg-checkbox">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => {
                setTimeUnknown(e.target.checked);
                setErrors((prev) => ({ ...prev, birthTime: undefined }));
              }}
            />
            {t('onboarding.step1.unknownTime')}
          </label>
        </fieldset>
      ) : (
        <fieldset className="mg-stack">
          <legend className="mg-card__title">{t('onboarding.step2.title')}</legend>
          <Autocomplete<PlaceResult>
            id="birth-place"
            label={t('onboarding.step2.place')}
            placeholder={t('onboarding.step2.placePlaceholder')}
            hint={place ? t('onboarding.step2.selected', { timezone: place.timezone }) : t('onboarding.step2.placeHint')}
            error={err(errors.placeName)}
            defaultValue={place?.label ?? ''}
            fetchOptions={fetchPlaces}
            getOptionKey={(p) => p.id}
            getOptionLabel={(p) => p.label}
            onSelect={(p) => {
              setPlace({ label: p.label, latitude: p.latitude, longitude: p.longitude, timezone: p.timezone });
              setErrors((prev) => ({ ...prev, placeName: undefined }));
            }}
            onInputChange={() => setPlace(null)}
            loadingLabel={t('onboarding.step2.searching')}
            emptyLabel={t('onboarding.step2.noResults')}
            errorLabel={t('onboarding.step2.searchError')}
          />
        </fieldset>
      )}

      <div className="mg-form-actions">
        {step === 2 ? (
          <Button variant="ghost" onClick={() => setStep(1)} disabled={pending}>
            {t('common.back')}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={pending} loadingLabel={t('common.saving')}>
          {step === 1 ? t('common.next') : isEdit ? t('onboarding.saveEdit') : t('onboarding.submit')}
        </Button>
      </div>
    </form>
  );
}
