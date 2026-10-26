'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { searchExercises } from '@/lib/fitness/library';
import type { ExerciseView } from '@/lib/fitness/types';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { ExerciseThumb } from './ExerciseThumb';
import { ExerciseFilters, type ExerciseFilterState } from './ExerciseFilters';

const MAX_SHOWN = 80;

interface ExercisePickerProps {
  exercises: ExerciseView[];
  open: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => Promise<void> | void;
  confirmLabel: string;
  multiple?: boolean;
}

/** Folha com pesquisa (português e inglês) e filtros; selecção múltipla. */
export function ExercisePicker({ exercises, open, onClose, onConfirm, confirmLabel, multiple = true }: ExercisePickerProps) {
  const t = useTranslations('fitness');
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilterState>({ muscle: '', equipment: '', category: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const results = useMemo(
    () => searchExercises(exercises, query, { muscle: filters.muscle || undefined, equipment: filters.equipment || undefined, category: filters.category || undefined }),
    [exercises, query, filters],
  );

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]));
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(selected);
      setSelected([]);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="mg-ex-picker" onClose={onClose} aria-label={t('picker.title')}>
      <div className="mg-ex-picker__inner">
        <div className="mg-ex-picker__head">
          <TextInput type="search" value={query} placeholder={t('picker.search')} aria-label={t('picker.search')} onChange={(e) => setQuery(e.target.value)} autoFocus />
          <ExerciseFilters exercises={exercises} value={filters} onChange={setFilters} />
        </div>
        <ul className="mg-ex-picker__list">
          {results.slice(0, MAX_SHOWN).map((e) => {
            const on = selected.includes(e.id);
            return (
              <li key={e.id}>
                <button type="button" className={on ? 'mg-ex-picker__item mg-ex-picker__item--selected' : 'mg-ex-picker__item'} aria-pressed={on} onClick={() => toggle(e.id)}>
                  <ExerciseThumb src={e.thumb} />
                  <span className="mg-ex-row__text">
                    <span className="mg-ex-row__name">{e.name}</span>
                    <span className="mg-ex-row__meta">{e.primaryMuscles.map((m) => (t.has(`muscles.${m}`) ? t(`muscles.${m}`) : m)).join(', ')}</span>
                  </span>
                  {on && <Check size={20} strokeWidth={2} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
          {results.length > MAX_SHOWN && <li className="mg-ex-row__meta">{t('picker.more', { n: results.length - MAX_SHOWN })}</li>}
          {!results.length && <li className="mg-body-empty">{t('picker.none')}</li>}
        </ul>
        <div className="mg-ex-picker__footer">
          <Button variant="ghost" onClick={onClose}>
            {t('picker.cancel')}
          </Button>
          <Button className="mg-btn--body" disabled={!selected.length} loading={busy} onClick={confirm}>
            {selected.length ? `${confirmLabel} (${selected.length})` : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
