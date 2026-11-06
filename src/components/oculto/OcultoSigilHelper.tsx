'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { sigilLetters } from '@/lib/oculto/sigil';

/**
 * Semana dos sigilos: escreve-se a intenção e aparecem as letras para o desenho (sem repetidas e sem vogais).
 * Fica só no ecrã: a intenção não é gravada nem enviada.
 */
export function OcultoSigilHelper() {
  const t = useTranslations('oculto.sigil');
  const id = useId();
  const [text, setText] = useState('');
  const { unique, final } = sigilLetters(text);

  return (
    <section className="mg-oculto-sigil" aria-labelledby={`${id}-title`}>
      <p id={`${id}-title`} className="mg-oculto-step__label">
        {t('title')}
      </p>
      <label className="mg-oculto-step__field">
        <span>{t('intention')}</span>
        <input className="mg-input" value={text} maxLength={200} autoComplete="off" placeholder={t('placeholder')} onChange={(e) => setText(e.target.value)} />
        <span className="mg-oculto-step__hint">{t('private')}</span>
      </label>
      {unique.length > 0 && (
        <ol className="mg-oculto-sigil__steps" aria-live="polite">
          <li className="mg-oculto-sigil__step">
            <span>{t('unique')}</span>
            <span className="mg-oculto-sigil__letters">
              {unique.map((c) => (
                <span key={c} className="mg-oculto-sigil__letter">
                  {c}
                </span>
              ))}
            </span>
          </li>
          <li className="mg-oculto-sigil__step">
            <span>{t('final')}</span>
            <span className="mg-oculto-sigil__letters">
              {final.map((c) => (
                <span key={c} className="mg-oculto-sigil__letter mg-oculto-sigil__letter--final">
                  {c}
                </span>
              ))}
            </span>
          </li>
          <li className="mg-oculto-sigil__step">
            <span>{t('draw')}</span>
          </li>
        </ol>
      )}
    </section>
  );
}
