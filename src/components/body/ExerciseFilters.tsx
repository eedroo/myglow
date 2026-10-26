'use client';

import { useTranslations } from 'next-intl';
import type { ExerciseView } from '@/lib/fitness/types';

export interface ExerciseFilterState {
  muscle: string;
  equipment: string;
  category: string;
}

/** Filtros por músculo, equipamento e categoria (só os valores que existem na lista). */
export function ExerciseFilters({ exercises, value, onChange }: { exercises: ExerciseView[]; value: ExerciseFilterState; onChange: (v: ExerciseFilterState) => void }) {
  const t = useTranslations('fitness');
  const muscles = [...new Set(exercises.flatMap((e) => e.primaryMuscles))].sort();
  const equipment = [...new Set(exercises.map((e) => e.equipment ?? 'none'))].sort();
  const categories = [...new Set(exercises.map((e) => e.category))].sort();
  const label = (ns: 'muscles' | 'equipment' | 'categories', k: string) => (t.has(`${ns}.${k}`) ? t(`${ns}.${k}`) : k);
  return (
    <div className="mg-ex-filters">
      <select className="mg-input" aria-label={t('filters.muscle')} value={value.muscle} onChange={(e) => onChange({ ...value, muscle: e.target.value })}>
        <option value="">{t('filters.anyMuscle')}</option>
        {muscles.map((m) => (
          <option key={m} value={m}>
            {label('muscles', m)}
          </option>
        ))}
      </select>
      <select className="mg-input" aria-label={t('filters.equipment')} value={value.equipment} onChange={(e) => onChange({ ...value, equipment: e.target.value })}>
        <option value="">{t('filters.anyEquipment')}</option>
        {equipment.map((m) => (
          <option key={m} value={m}>
            {label('equipment', m)}
          </option>
        ))}
      </select>
      <select className="mg-input" aria-label={t('filters.category')} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
        <option value="">{t('filters.anyCategory')}</option>
        {categories.map((m) => (
          <option key={m} value={m}>
            {label('categories', m)}
          </option>
        ))}
      </select>
    </div>
  );
}
