'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { patchWeek } from '@/actions/week';
import { patchMonth } from '@/actions/planner';
import { Button } from '@/components/ui/Button';
import { parseMonthKey } from '@/lib/weeks';
import { XP_POINTS, reflectionMet } from '@/lib/xp/rules';
import type { RecapKindKey } from '@/lib/recap/period';

/**
 * No fim da retrospectiva, a reflexão do período que passou (enquanto a janela do Glow estiver aberta): escreve-se
 * aqui mesmo e grava na Semana ou no Mês, com o Glow da reflexão.
 */
export function RecapReflection({ kind, periodKey }: { kind: RecapKindKey; periodKey: string }) {
  const t = useTranslations('recap.closing.reflectionBox');
  const te = useTranslations();
  const isWeek = kind === 'WEEK';
  const points = XP_POINTS[isWeek ? 'WEEK_REFLECTION' : 'MONTH_REFLECTION'];
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [glow, setGlow] = useState(0);

  const save = async () => {
    setStatus('saving');
    const res = await (isWeek
      ? patchWeek(periodKey, { reflection: text })
      : (() => {
          const { year, month } = parseMonthKey(periodKey);
          return patchMonth(year, month, { reflection: text });
        })()
    ).catch(() => ({ ok: false as const, error: 'common.errors.generic' }));
    if (!res.ok) {
      setStatus('error');
      return;
    }
    setGlow(res.xp?.awards.reduce((n, a) => n + a.points, 0) ?? 0);
    setStatus('saved');
  };

  if (status === 'saved') {
    return (
      <p className="mg-recap-reflection__done" role="status">
        {glow > 0 ? t('savedGlow', { points: glow }) : t('saved')}
      </p>
    );
  }

  return (
    <section className="mg-recap-reflection" aria-labelledby="mg-recap-reflection-title">
      <h3 id="mg-recap-reflection-title" className="mg-recap-slide__eyebrow">
        {t(isWeek ? 'titleWeek' : 'titleMonth')}
      </h3>
      <p className="mg-recap-slide__text">{t('hint', { points })}</p>
      <textarea
        className="mg-input mg-recap-reflection__input"
        rows={4}
        maxLength={isWeek ? 4000 : 6000}
        value={text}
        placeholder={t(isWeek ? 'placeholderWeek' : 'placeholderMonth')}
        aria-label={t(isWeek ? 'titleWeek' : 'titleMonth')}
        onChange={(e) => {
          setText(e.target.value);
          if (status === 'error') setStatus('idle');
        }}
      />
      {status === 'error' && (
        <p className="mg-step__error" role="alert">
          {te('common.errors.generic')}
        </p>
      )}
      <Button block onClick={save} loading={status === 'saving'} disabled={!reflectionMet(text)}>
        {t('save')}
      </Button>
    </section>
  );
}
