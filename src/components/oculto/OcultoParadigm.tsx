'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveOcultoParadigm } from '@/actions/oculto';
import { Button } from '@/components/ui/Button';
import type { OcultoGlyphView, OcultoParadigmView } from '@/lib/oculto/server';
import { OcultoGlyph } from './OcultoGlyph';

const EMPTY: OcultoParadigmView = { name: '', premises: '', symbols: [], practices: '', limits: '' };

/** Meu paradigma: premissas, símbolos do Alfabeto do Desejo, práticas e limites. */
export function OcultoParadigm({ initial, glyphs }: { initial: OcultoParadigmView | null; glyphs: OcultoGlyphView[] }) {
  const t = useTranslations('oculto.paradigm');
  const te = useTranslations();
  const router = useRouter();
  const [p, setP] = useState<OcultoParadigmView>(initial ?? EMPTY);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<OcultoParadigmView>) => {
    setP((x) => ({ ...x, ...patch }));
    setStatus('idle');
  };
  const toggle = (id: string) => set({ symbols: p.symbols.includes(id) ? p.symbols.filter((s) => s !== id) : [...p.symbols, id] });

  const save = async () => {
    setStatus('saving');
    setError(null);
    const res = await saveOcultoParadigm(p).catch(() => ({ ok: false as const, error: 'oculto.errors.offline' }));
    if (!res.ok) {
      setStatus('error');
      setError(te(res.error));
      return;
    }
    setStatus('saved');
    router.refresh();
  };

  const field = (key: 'premises' | 'practices' | 'limits', rows: number) => (
    <label className="mg-oculto-step__field">
      <span>{t(key)}</span>
      <textarea className="mg-input" rows={rows} maxLength={3000} value={p[key]} placeholder={t(`${key}Placeholder`)} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

  return (
    <section className="mg-oculto-paradigm" aria-labelledby="mg-oculto-paradigm-title">
      <h2 id="mg-oculto-paradigm-title" className="mg-oculto__subtitle">
        {t('title')}
      </h2>
      <p className="mg-oculto__text">{t('help')}</p>
      <label className="mg-oculto-step__field">
        <span>{t('name')}</span>
        <input className="mg-input" maxLength={80} value={p.name} placeholder={t('namePlaceholder')} onChange={(e) => set({ name: e.target.value })} />
      </label>
      {field('premises', 4)}
      <fieldset className="mg-oculto-step__field mg-oculto-paradigm__fieldset">
        <legend>{t('symbols')}</legend>
        {glyphs.length === 0 ? (
          <p className="mg-oculto-alphabet__empty">{t('noSymbols')}</p>
        ) : (
          <div className="mg-oculto-paradigm__symbols">
            {glyphs.map((g) => {
              const on = p.symbols.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  className={['mg-oculto-paradigm__symbol', on && 'mg-oculto-paradigm__symbol--on'].filter(Boolean).join(' ')}
                  onClick={() => toggle(g.id)}
                >
                  <OcultoGlyph strokes={g.strokes} />
                  <span>{g.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
      {field('practices', 3)}
      {field('limits', 3)}
      <Button onClick={save} loading={status === 'saving'}>
        {t('save')}
      </Button>
      <p className="mg-oculto-paradigm__status" role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
        {status === 'saved' ? t('saved') : status === 'error' ? error : ''}
      </p>
    </section>
  );
}
