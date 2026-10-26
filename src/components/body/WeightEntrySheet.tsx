'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { logWeight } from '@/actions/body';
import { addDays, type DateISO } from '@/lib/dates';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** "Novo registo": data (hoje por defeito) e kg; abre sozinho com `?new=1` (lembrete de pesagem). */
export function WeightEntrySheet({ today, autoOpen, lastKg }: { today: DateISO; autoOpen: boolean; lastKg: string }) {
  const t = useTranslations('body.weight');
  const te = useTranslations();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(autoOpen);
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState(lastKg);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const save = () =>
    start(async () => {
      const res = await logWeight({ date, kg });
      if (!res.ok) return setError(te(res.error));
      setError(null);
      setOpen(false);
      if (autoOpen) router.replace('/body/weight');
      router.refresh();
    });

  return (
    <>
      <Button className="mg-btn--body" onClick={() => setOpen(true)}>
        {t('new')}
      </Button>
      <dialog ref={ref} className="mg-body-sheet mg-weight-entry" onClose={() => setOpen(false)} aria-labelledby="weight-entry-title">
        <h2 id="weight-entry-title" className="mg-body-sheet__title">
          {t('new')}
        </h2>
        <div className="mg-body-sheet__form">
          <label>
            {t('date')}
            <TextInput type="date" value={date} min={addDays(today, -365)} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            {t('kgLabel')}
            <TextInput
              className="mg-weight-entry__kg"
              inputMode="decimal"
              autoComplete="off"
              value={kg}
              placeholder="0,0"
              onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
              autoFocus
            />
          </label>
          {error && (
            <p className="mg-set-input__error" role="alert">
              {error}
            </p>
          )}
          <div className="mg-body-sheet__actions">
            <Button className="mg-btn--body" loading={pending} disabled={!kg.trim()} onClick={save}>
              {t('save')}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
