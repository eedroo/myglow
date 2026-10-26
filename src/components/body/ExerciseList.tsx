'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { searchExercises } from '@/lib/fitness/library';
import type { ExerciseView } from '@/lib/fitness/types';
import { TextInput } from '@/components/ui/TextInput';
import { ExerciseThumb } from './ExerciseThumb';
import { ExerciseFilters, type ExerciseFilterState } from './ExerciseFilters';
import { CustomExerciseForm } from './CustomExerciseForm';

const PAGE = 60;

export function ExerciseRow({ exercise }: { exercise: ExerciseView }) {
  const t = useTranslations('fitness');
  const muscles = exercise.primaryMuscles.map((m) => (t.has(`muscles.${m}`) ? t(`muscles.${m}`) : m)).join(', ');
  const equipment = exercise.equipment ? (t.has(`equipment.${exercise.equipment}`) ? t(`equipment.${exercise.equipment}`) : exercise.equipment) : null;
  return (
    <Link href={`/body/exercises/${encodeURIComponent(exercise.id)}`} className="mg-ex-row">
      <ExerciseThumb src={exercise.thumb} />
      <span className="mg-ex-row__text">
        <span className="mg-ex-row__name">{exercise.name}</span>
        <span className="mg-ex-row__meta">{[muscles, equipment].filter(Boolean).join(' · ')}</span>
      </span>
    </Link>
  );
}

/** Biblioteca e os meus, com pesquisa e filtros. */
export function ExerciseList({ exercises, initialTab }: { exercises: ExerciseView[]; initialTab: 'all' | 'mine' }) {
  const t = useTranslations('fitness.exercises');
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilterState>({ muscle: '', equipment: '', category: '' });
  const [limit, setLimit] = useState(PAGE);
  const pool = useMemo(() => (tab === 'mine' ? exercises.filter((e) => e.source === 'CUSTOM') : exercises), [exercises, tab]);
  const results = useMemo(
    () => searchExercises(pool, query, { muscle: filters.muscle || undefined, equipment: filters.equipment || undefined, category: filters.category || undefined }),
    [pool, query, filters],
  );

  return (
    <>
      <div className="mg-ex-tabs" role="tablist" aria-label={t('title')}>
        {(['all', 'mine'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className="mg-ex-tabs__tab" onClick={() => setTab(k)}>
            {t(k === 'all' ? 'tabAll' : 'tabMine')}
          </button>
        ))}
      </div>
      {tab === 'mine' && <CustomExerciseForm />}
      <TextInput type="search" value={query} placeholder={t('search')} aria-label={t('search')} onChange={(e) => setQuery(e.target.value)} />
      <ExerciseFilters exercises={pool} value={filters} onChange={setFilters} />
      {results.length ? (
        <ul className="mg-ex-list">
          {results.slice(0, limit).map((e) => (
            <li key={e.id}>
              <ExerciseRow exercise={e} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mg-body-empty">{t(tab === 'mine' && !pool.length ? 'mineEmpty' : 'none')}</p>
      )}
      {results.length > limit && (
        <button type="button" className="mg-btn mg-btn--subtle" onClick={() => setLimit(limit + PAGE)}>
          {t('more', { n: results.length - limit })}
        </button>
      )}
    </>
  );
}
