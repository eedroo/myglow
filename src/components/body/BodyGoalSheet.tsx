'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { clearBodyGoal, setBodyGoal } from '@/actions/body';
import { GOAL_RATES, type GoalDirection } from '@/lib/body/weight';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';

/** Objectivo: direcção, ritmo (opções fixas) e alvo opcional. */
export function BodyGoalSheet({ current }: { current: { direction: GoalDirection; weeklyRateGrams: number; targetKg: string } | null }) {
  const t = useTranslations('body.goal');
  const te = useTranslations();
  const raw = useLocale();
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<GoalDirection>(current?.direction ?? 'MAINTAIN');
  const [rate, setRate] = useState<number>(current?.weeklyRateGrams ?? 0);
  const [target, setTarget] = useState(current?.targetKg ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const rates: readonly number[] = GOAL_RATES[direction];
  const pickDirection = (d: GoalDirection) => {
    setDirection(d);
    const r: readonly number[] = GOAL_RATES[d];
    setRate(r.includes(rate) ? rate : r[Math.min(1, r.length - 1)]!);
  };
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(te(res.error ?? 'common.errors.generic'));
      setError(null);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant="subtle" onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <dialog ref={ref} className="mg-body-sheet mg-goal-sheet" onClose={() => setOpen(false)} aria-labelledby="goal-title">
        <h2 id="goal-title" className="mg-body-sheet__title">
          {t('title')}
        </h2>
        <div className="mg-body-sheet__form">
          <SegmentedControl<GoalDirection>
            name="goal-direction"
            legend={t('direction')}
            value={direction}
            onChange={pickDirection}
            options={(['GAIN', 'MAINTAIN', 'LOSE'] as const).map((d) => ({ value: d, label: t(`directions.${d}`) }))}
          />
          {direction !== 'MAINTAIN' && (
            <>
              <div className="mg-goal-sheet__rates" role="radiogroup" aria-label={t('rate')}>
                {rates.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={rate === r} className="mg-chip-toggle" onClick={() => setRate(r)}>
                    {t('rateOption', { sign: direction === 'GAIN' ? '+' : '−', kg: formatGramsAsKg(r, loc) })}
                  </button>
                ))}
              </div>
              <label>
                {t('target')}
                <TextInput inputMode="decimal" value={target} placeholder={t('targetPlaceholder')} onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))} />
              </label>
            </>
          )}
          {error && (
            <p className="mg-set-input__error" role="alert">
              {error}
            </p>
          )}
          <div className="mg-body-sheet__actions">
            <Button
              className="mg-btn--body"
              loading={pending}
              onClick={() => run(() => setBodyGoal({ direction, weeklyRateGrams: direction === 'MAINTAIN' ? 0 : rate, targetKg: direction === 'MAINTAIN' ? null : target || null }))}
            >
              {t('save')}
            </Button>
            {current && (
              <Button variant="danger" disabled={pending} onClick={() => run(clearBodyGoal)}>
                {t('clear')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
