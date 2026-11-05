'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveOcultoDream } from '@/actions/oculto';

/**
 * Semana dos sonhos do Grimório Oculto, na Manhã do Hoje: o sonho desta noite, gravado ao sair do campo. É o mesmo
 * texto do diário do treino (escreve-se uma vez e aparece nos dois).
 */
export function OcultoDreamCard({ initial }: { initial: string | null }) {
  const t = useTranslations('oculto.dream');
  const te = useTranslations();
  const [text, setText] = useState(initial ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(initial ?? '');

  const save = async () => {
    const value = text.trim();
    if (value === saved.current.trim()) return;
    setStatus('saving');
    const res = await saveOcultoDream({ text: value }).catch(() => ({ ok: false as const, error: 'oculto.errors.offline' }));
    if (res.ok) {
      saved.current = value;
      setStatus('saved');
      setError(null);
    } else {
      setStatus('error');
      setError(te(res.error));
    }
  };

  return (
    <section className="mg-oculto-dream" aria-labelledby="mg-oculto-dream-title">
      <h3 id="mg-oculto-dream-title" className="mg-oculto-dream__title">
        {t('title')}
      </h3>
      <p className="mg-oculto-dream__hint">{t('hint')}</p>
      <textarea
        className="mg-input"
        rows={3}
        maxLength={2000}
        value={text}
        placeholder={t('placeholder')}
        aria-label={t('title')}
        onChange={(e) => {
          setText(e.target.value);
          if (status !== 'saving') setStatus('idle');
        }}
        onBlur={save}
      />
      <p className="mg-oculto-dream__status" role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
        {status === 'saving' ? t('saving') : status === 'saved' ? t('saved') : status === 'error' ? error : ''}
      </p>
    </section>
  );
}
