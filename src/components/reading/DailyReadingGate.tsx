'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { setReadingChoice } from '@/actions/daily';
import { readingGate } from '@/lib/daily/readingChoice';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { Button } from '@/components/ui/Button';

/** Hoje: "Quer a leitura do dia agora ou à noite?" (uma vez por dia). À noite mostra-a; de dia, espera. */
export function DailyReadingGate({ date, initialChoice, isNight, children }: { date: string; initialChoice: 'NOW' | 'NIGHT' | null; isNight: boolean; children: ReactNode }) {
  const t = useTranslations('reading.gate');
  const [choice, setChoice] = useState(initialChoice);
  const choose = (c: 'NOW' | 'NIGHT') => {
    setChoice(c);
    void setReadingChoice(date, c).catch(() => {});
  };
  const gate = readingGate({ choice, isToday: true, isNight });
  if (gate === 'show') return <>{children}</>;
  return (
    <GlassCard className="mg-reading-gate" aria-labelledby="reading-gate-title" data-tour="reading-card">
      <h2 id="reading-gate-title" className="mg-reading__heading">
        <MagicIcon name={gate === 'ask' ? 'sparkles' : 'moon-crescent'} size="sm" decorative />
        {gate === 'ask' ? t('question') : t('waitingTitle')}
      </h2>
      <p className="mg-reading__text">{gate === 'ask' ? t('hint') : t('waiting')}</p>
      <div className="mg-reading-gate__actions">
        {gate === 'ask' ? (
          <>
            <Button onClick={() => choose('NOW')}>{t('now')}</Button>
            <Button variant="subtle" onClick={() => choose('NIGHT')}>
              {t('night')}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => choose('NOW')}>
            {t('showNow')}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
