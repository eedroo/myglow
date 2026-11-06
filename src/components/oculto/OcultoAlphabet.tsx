'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteOcultoGlyph, saveOcultoGlyph } from '@/actions/oculto';
import { Button } from '@/components/ui/Button';
import { GLYPH_LIMIT, type Strokes } from '@/lib/oculto/glyph';
import type { OcultoGlyphView } from '@/lib/oculto/server';
import { OcultoGlyph } from './OcultoGlyph';
import { OcultoGlyphPad } from './OcultoGlyphPad';

interface Draft {
  id?: string;
  name: string;
  meaning: string;
  strokes: Strokes;
}

/** Alfabeto do Desejo: os símbolos da pessoa e o formulário para criar, editar e apagar. */
export function OcultoAlphabet({ initial }: { initial: OcultoGlyphView[] }) {
  const t = useTranslations('oculto.alphabet');
  const te = useTranslations();
  const router = useRouter();
  const [glyphs, setGlyphs] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || draft.strokes.length === 0) {
      setError(t('missing'));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await saveOcultoGlyph({ id: draft.id, name: draft.name, meaning: draft.meaning, strokes: draft.strokes }).catch(() => ({
      ok: false as const,
      error: 'oculto.errors.offline',
    }));
    setBusy(false);
    if (!res.ok) {
      setError(te(res.error));
      return;
    }
    const view: OcultoGlyphView = { id: res.data.id, name: draft.name.trim(), meaning: draft.meaning.trim() || null, strokes: draft.strokes };
    setGlyphs((g) => (draft.id ? g.map((x) => (x.id === draft.id ? view : x)) : [...g, view]));
    setDraft(null);
    router.refresh();
  };

  const remove = async () => {
    if (!draft?.id || !window.confirm(t('confirmDelete', { name: draft.name }))) return;
    setBusy(true);
    const res = await deleteOcultoGlyph(draft.id).catch(() => ({ ok: false as const, error: 'oculto.errors.offline' }));
    setBusy(false);
    if (!res.ok) {
      setError(te(res.error));
      return;
    }
    setGlyphs((g) => g.filter((x) => x.id !== draft.id));
    setDraft(null);
    router.refresh();
  };

  return (
    <section className="mg-oculto-alphabet" aria-labelledby="mg-oculto-alphabet-title">
      <h2 id="mg-oculto-alphabet-title" className="mg-oculto__subtitle">
        {t('title')}
      </h2>
      <p className="mg-oculto__text">{t('help')}</p>
      {glyphs.length === 0 && !draft && <p className="mg-oculto-alphabet__empty">{t('empty')}</p>}
      {glyphs.length > 0 && (
        <ul className="mg-oculto-alphabet__grid">
          {glyphs.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="mg-oculto-alphabet__item"
                aria-label={t('edit', { name: g.name })}
                onClick={() => {
                  setError(null);
                  setDraft({ id: g.id, name: g.name, meaning: g.meaning ?? '', strokes: g.strokes });
                }}
              >
                <OcultoGlyph strokes={g.strokes} />
                <span className="mg-oculto-alphabet__name">{g.name}</span>
                {g.meaning && <span className="mg-oculto-alphabet__meaning">{g.meaning}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <div className="mg-oculto-alphabet__form">
          <OcultoGlyphPad value={draft.strokes} onChange={(strokes) => setDraft({ ...draft, strokes })} labels={{ pad: t('pad'), undo: t('undo'), clear: t('clear') }} />
          <label className="mg-oculto-step__field">
            <span>{t('name')}</span>
            <input className="mg-input" maxLength={40} value={draft.name} placeholder={t('namePlaceholder')} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="mg-oculto-step__field">
            <span>{t('meaning')}</span>
            <textarea className="mg-input" rows={2} maxLength={300} value={draft.meaning} placeholder={t('meaningPlaceholder')} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} />
          </label>
          {error && (
            <p className="mg-step__error" role="alert">
              {error}
            </p>
          )}
          <div className="mg-oculto-pad__actions">
            <Button onClick={save} loading={busy}>
              {t('save')}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
              {t('cancel')}
            </Button>
            {draft.id && (
              <Button variant="danger" onClick={remove} disabled={busy}>
                {t('delete')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        glyphs.length < GLYPH_LIMIT && (
          <Button
            variant="subtle"
            onClick={() => {
              setError(null);
              setDraft({ name: '', meaning: '', strokes: [] });
            }}
          >
            {t('add')}
          </Button>
        )
      )}
    </section>
  );
}
