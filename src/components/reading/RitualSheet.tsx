'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { PROJECT_ICONS } from '@/lib/icons';
import { addRitualToWeek } from '@/actions/ai';
import type { Ritual } from '@/lib/ai/schemas';
import { googleCalendarUrl, ritualDescription } from '@/lib/rituals/calendar';

interface RitualSheetProps {
  ritual: Ritual;
  year: number;
  month: number;
  /** Data já formatada ("16 mai"). */
  dateLabel: string;
  /** Conteúdo do botão que abre o diálogo. */
  children: ReactNode;
  /** 'item' = linha da lista de rituais; 'button' = botão secundário. */
  triggerVariant?: 'item' | 'button';
}

type AddState =
  | { status: 'idle' | 'saving' }
  | { status: 'done'; weekStart: string; already: boolean }
  | { status: 'error'; error: string };

/** Diálogo modal nativo com o ritual completo e "Adicionar à minha semana". */
export function RitualSheet({ ritual, year, month, dateLabel, children, triggerVariant = 'item' }: RitualSheetProps) {
  const t = useTranslations();
  const ref = useRef<HTMLDialogElement>(null);
  const [add, setAdd] = useState<AddState>({ status: 'idle' });
  const [googleHref, setGoogleHref] = useState('https://calendar.google.com/calendar/render');
  const titleId = `ritual-${ritual.id}-title`;

  // Calendário externo: Google (link de evento, sem login) e .ics (Apple Calendar, Outlook).
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const googleUrl = () =>
    googleCalendarUrl(
      ritual,
      ritualDescription(
        ritual,
        {
          intention: t('reading.ritual.intention'),
          materials: t('reading.ritual.materials'),
          steps: t('reading.ritual.steps'),
          openApp: t('reading.ritual.openApp'),
        },
        `${window.location.origin}/month/${ym}`,
      ),
    );

  const open = () => {
    setAdd({ status: 'idle' });
    setGoogleHref(googleUrl());
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const onAdd = async () => {
    setAdd({ status: 'saving' });
    const res = await addRitualToWeek(year, month, ritual.id);
    setAdd(res.ok ? { status: 'done', weekStart: res.weekStart, already: res.alreadyAdded } : { status: 'error', error: res.error });
  };

  return (
    <>
      {triggerVariant === 'item' ? (
        <button type="button" className="mg-rituals__item mg-ritual-sheet__trigger" onClick={open} aria-haspopup="dialog">
          {children}
        </button>
      ) : (
        <Button variant="ghost" className="mg-ritual-sheet__trigger" onClick={open} aria-haspopup="dialog">
          {children}
        </Button>
      )}

      <dialog
        ref={ref}
        className="mg-ritual-sheet"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="mg-ritual-sheet__body">
          <header className="mg-ritual-sheet__head">
            <MagicIcon name={PROJECT_ICONS[ritual.area]} size="md" decorative />
            <div>
              <h2 id={titleId} className="mg-ritual-sheet__title">
                {ritual.title}
              </h2>
              <p className="mg-ritual-sheet__meta">
                {dateLabel} · {ritual.occasion} · {t('reading.ritual.duration', { n: ritual.durationMinutes })}
              </p>
            </div>
          </header>

          <section>
            <h3 className="mg-ritual-sheet__label">{t('reading.ritual.intention')}</h3>
            <p className="mg-ritual-sheet__intention">{ritual.intention}</p>
          </section>

          {ritual.why && (
            <section>
              <h3 className="mg-ritual-sheet__label">{t('reading.ritual.why')}</h3>
              <p className="mg-ritual-sheet__why">{ritual.why}</p>
            </section>
          )}

          {ritual.materials.length > 0 && (
            <section>
              <h3 className="mg-ritual-sheet__label">{t('reading.ritual.materials')}</h3>
              <ul className="mg-ritual-sheet__materials">
                {ritual.materials.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              {ritual.materialsWhy && <p className="mg-ritual-sheet__note">{ritual.materialsWhy}</p>}
            </section>
          )}

          <section>
            <h3 className="mg-ritual-sheet__label">{t('reading.ritual.steps')}</h3>
            <ol className="mg-ritual-sheet__steps">
              {ritual.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </section>

          <aside className="mg-ritual-sheet__safety" aria-label={t('reading.ritual.safety')}>
            <MagicIcon name="candle" size="sm" decorative />
            <p>{ritual.safety}</p>
          </aside>

          <div className="mg-ritual-sheet__actions">
            <Button variant="subtle" onClick={close}>
              {t('reading.ritual.close')}
            </Button>
            <Button onClick={onAdd} loading={add.status === 'saving'} loadingLabel={t('reading.ritual.adding')} disabled={add.status === 'done'}>
              <MagicIcon name="calendar" size="sm" decorative />
              {t('reading.ritual.add')}
            </Button>
            <div className="mg-ritual-sheet__calendar" role="group" aria-label={t('reading.ritual.calendarTitle')}>
              <span className="mg-ritual-sheet__label">{t('reading.ritual.calendarTitle')}</span>
              <a className="mg-btn mg-btn--subtle" href={googleHref} target="_blank" rel="noopener noreferrer">
                {t('reading.ritual.google')}
              </a>
              <a className="mg-btn mg-btn--subtle" href={`/api/rituals/ics?month=${ym}&id=${encodeURIComponent(ritual.id)}`}>
                {t('reading.ritual.ics')}
              </a>
            </div>
            <p
              className={add.status === 'error' ? 'mg-ritual-sheet__status mg-ritual-sheet__status--error' : 'mg-ritual-sheet__status'}
              role="status"
              aria-live="polite"
            >
              {add.status === 'done' && (
                <>
                  {add.already ? t('reading.ritual.alreadyAdded') : t('reading.ritual.added')}{' '}
                  <Link href={`/week/${add.weekStart}`}>{t('reading.ritual.seeWeek')}</Link>
                </>
              )}
              {add.status === 'error' && t(add.error)}
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
