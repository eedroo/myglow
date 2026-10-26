'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

type Tab = 'sets' | 'progress' | 'records';

/** Séries · Evolução · Recordes no topo do exercício (o conteúdo vem do servidor). */
export function ExerciseTabs({ sets, progress, records }: { sets: ReactNode; progress: ReactNode; records: ReactNode }) {
  const t = useTranslations('fitness.exerciseTabs');
  const [tab, setTab] = useState<Tab>('sets');
  const panels: Record<Tab, ReactNode> = { sets, progress, records };
  return (
    <>
      <div className="mg-ex-tabs" role="tablist" aria-label={t('label')}>
        {(['sets', 'progress', 'records'] as const).map((k) => (
          <button key={k} id={`ex-tab-${k}`} type="button" role="tab" aria-selected={tab === k} aria-controls={`ex-panel-${k}`} className="mg-ex-tabs__tab" onClick={() => setTab(k)}>
            {t(k)}
          </button>
        ))}
      </div>
      {(['sets', 'progress', 'records'] as const).map((k) => (
        <div key={k} id={`ex-panel-${k}`} role="tabpanel" aria-labelledby={`ex-tab-${k}`} hidden={tab !== k}>
          {panels[k]}
        </div>
      ))}
    </>
  );
}
