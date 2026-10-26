'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ExerciseMeasure, SetInput } from '@/lib/fitness/types';
import { SET_LIMITS } from '@/lib/fitness/session';
import { formatGramsAsKg, parseKgToGrams } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import { Button } from '@/components/ui/Button';
import { NumberStepper } from './NumberStepper';

export type SetValues = Omit<SetInput, 'exerciseId'>;

export function useKg() {
  const raw = useLocale();
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  return (g: number) => formatGramsAsKg(g, loc);
}

/** Campos editáveis (texto) a partir de valores; e o caminho inverso, com validação de formato. */
function toForm(v: SetValues, kg: (g: number) => string) {
  return { reps: v.reps != null ? String(v.reps) : '', kg: v.weightGrams != null ? kg(v.weightGrams) : '', sec: v.durationSec != null ? String(v.durationSec) : '' };
}

function fromForm(measure: ExerciseMeasure, f: { reps: string; kg: string; sec: string }): SetValues | null {
  const int = (s: string) => (s.trim() === '' ? undefined : Number(s));
  if (measure === 'DURATION') return { durationSec: int(f.sec) };
  const reps = int(f.reps);
  if (measure === 'REPS') return { reps };
  try {
    const g = parseKgToGrams(f.kg);
    return { reps, ...(g !== null && { weightGrams: g }) };
  } catch {
    return null;
  }
}

/** Steppers para uma série: reps ±1 e kg ±2,5, ou segundos ±5. */
function SetFields({ measure, form, setForm }: { measure: ExerciseMeasure; form: { reps: string; kg: string; sec: string }; setForm: (f: { reps: string; kg: string; sec: string }) => void }) {
  const t = useTranslations('fitness.session');
  if (measure === 'DURATION') {
    return <NumberStepper label={t('seconds')} kind="time" value={form.sec} step={5} max={SET_LIMITS.durationMaxSec} onChange={(sec) => setForm({ ...form, sec })} />;
  }
  return (
    <>
      <NumberStepper label={t('reps')} kind="reps" value={form.reps} step={1} max={SET_LIMITS.repsMax} onChange={(reps) => setForm({ ...form, reps })} />
      {measure === 'REPS_WEIGHT' && (
        <NumberStepper label={t('kg')} kind="kg" value={form.kg} step={2.5} max={SET_LIMITS.weightMaxGrams / 1000} decimal onChange={(kg) => setForm({ ...form, kg })} />
      )}
    </>
  );
}

/** Uma série feita: toque para editar ou apagar. */
export function SetRow({
  n,
  measure,
  values,
  pending,
  onSave,
  onDelete,
}: {
  n: number;
  measure: ExerciseMeasure;
  values: SetValues;
  pending?: boolean;
  onSave: (v: SetValues) => Promise<string | null>;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations('fitness.session');
  const kg = useKg();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(values, kg));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li className="mg-set-edit">
        <SetFields measure={measure} form={form} setForm={setForm} />
        {error && (
          <p className="mg-set-input__error" role="alert">
            {error}
          </p>
        )}
        <Button
          className="mg-btn--body"
          loading={busy}
          onClick={async () => {
            const v = fromForm(measure, form);
            if (!v) return setError(t('invalid'));
            setBusy(true);
            const err = await onSave(v);
            setBusy(false);
            if (err) return setError(err);
            setEditing(false);
          }}
        >
          {t('save')}
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onDelete();
            setBusy(false);
          }}
        >
          {t('deleteSet')}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
          {t('cancel')}
        </Button>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        className={`mg-set-row${pending ? ' mg-set-row--pending' : ''}`}
        disabled={pending}
        aria-label={t('editSet', { n })}
        onClick={() => {
          setForm(toForm(values, kg));
          setError(null);
          setEditing(true);
        }}
      >
        <span className="mg-set-row__n">{n}</span>
        {values.durationSec != null ? (
          <span className="mg-set-row__time">{t('secondsShort', { n: values.durationSec })}</span>
        ) : (
          <span className="mg-set-row__reps">{values.reps != null ? t('repsShort', { n: values.reps }) : ''}</span>
        )}
        <span className="mg-set-row__kg">{values.weightGrams != null ? t('kgShort', { kg: kg(values.weightGrams) }) : ''}</span>
        <span aria-hidden="true">{pending ? '…' : '✓'}</span>
      </button>
    </li>
  );
}

/** Próxima série, pré-preenchida, com "Feita ✓". */
export function SetInputRow({
  measure,
  prefill,
  onDone,
}: {
  measure: ExerciseMeasure;
  prefill: SetValues;
  onDone: (v: SetValues) => string | null;
}) {
  const t = useTranslations('fitness.session');
  const kg = useKg();
  const key = JSON.stringify(prefill);
  const [state, setState] = useState(() => ({ key, form: toForm(prefill, kg) }));
  const [error, setError] = useState<string | null>(null);
  // O pré-preenchimento muda depois de cada série: recomeça o formulário.
  const form = state.key === key ? state.form : toForm(prefill, kg);
  const setForm = (f: typeof form) => setState({ key, form: f });
  return (
    <div className="mg-set-input">
      <SetFields measure={measure} form={form} setForm={setForm} />
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button
        className="mg-btn--body mg-set-input__done"
        onClick={() => {
          const v = fromForm(measure, form);
          const err = v ? onDone(v) : t('invalid');
          setError(err);
        }}
      >
        {t('done')}
      </Button>
    </div>
  );
}
