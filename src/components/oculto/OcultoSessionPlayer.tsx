'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveOcultoSession } from '@/actions/oculto';
import { SlidePlayer, type Slide } from '@/components/slides/SlidePlayer';
import { Button } from '@/components/ui/Button';
import { LightOrb } from '@/components/friends/LightOrb';
import type { OrbSigns } from '@/lib/friends/orb';
import type { OcultoSessionDef, OcultoWeek } from '@/lib/oculto/content';
import { OcultoTimer } from './OcultoTimer';
import { OcultoSigilHelper } from './OcultoSigilHelper';
import { OcultoBeliefDie } from './OcultoBeliefDie';
import { OcultoAlphabet } from './OcultoAlphabet';
import type { OcultoGlyphView } from '@/lib/oculto/server';

interface Props {
  week: number;
  weekTitle: string;
  session: OcultoSessionDef;
  howTo: OcultoWeek['howTo'];
  orb: OrbSigns | null;
  /** Semana dos sonhos: o diário ganha o campo do sonho (o mesmo da Manhã do Hoje). */
  dreamJournal?: boolean;
  initialDream?: string | null;
  /** Operações mágicas: experiência, interpretação e evidência em vez das observações. */
  operationsJournal?: boolean;
  /** Semana dos sigilos: ajudante na preparação. */
  sigilHelper?: boolean;
  /** Semana da crença aleatória: o dado e a crença sorteada. */
  beliefs?: OcultoWeek['beliefs'];
  belief?: number | null;
  /** Semana do Alfabeto do Desejo: os símbolos, para criar e rever na preparação. */
  glyphs?: OcultoGlyphView[] | null;
}

const clearTimers = (base: string) => {
  try {
    for (const k of ['main', 'observe']) window.sessionStorage.removeItem(`${base}:${k}`);
  } catch {
    // nada a limpar
  }
};

/**
 * Sessão do Grimório Oculto, passo a passo: preparação, exercício principal (timer com a esfera), observação (timer
 * curto), diário do treino e fecho. O diário grava a sessão; o programa avalia a semana a partir dele.
 */
export function OcultoSessionPlayer({ week, weekTitle, session, howTo, orb, dreamJournal = false, initialDream = null, operationsJournal = false, sigilHelper = false, beliefs, belief = null, glyphs = null }: Props) {
  const t = useTranslations('oculto.session');
  const te = useTranslations();
  const router = useRouter();
  const base = `mg-oculto:${week}:${session.day}`;
  const [index, setIndex] = useState(0);
  const [mainSec, setMainSec] = useState<number | null>(null);
  const [observed, setObserved] = useState(session.observeMinutes === 0);
  const [minutes, setMinutes] = useState('');
  const [concentration, setConcentration] = useState(5);
  const [difficulty, setDifficulty] = useState('');
  const [notes, setNotes] = useState('');
  const [dream, setDream] = useState(initialDream ?? '');
  const [experience, setExperience] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timerLabels = { start: t('start'), pause: t('pause'), resume: t('resume'), finish: t('finish'), done: t('timerDone'), remaining: t('remaining') };
  const onMainDone = useCallback((sec: number) => {
    setMainSec(sec);
    setMinutes((m) => m || String(Math.max(1, Math.round(sec / 60))));
  }, []);
  const onObserveDone = useCallback(() => setObserved(true), []);

  const save = async () => {
    if (index !== 3) return;
    setError(null);
    const actual = Math.round(Number(minutes.replace(',', '.')) * 60);
    if (!Number.isFinite(actual) || actual < 0) {
      setError(t('errors.minutes'));
      throw new Error('minutes');
    }
    const res = await saveOcultoSession({ week, day: session.day, actualSec: actual, concentration, difficulty, ...(operationsJournal ? { experience, interpretation, evidence } : { notes }), ...(dreamJournal ? { dream } : {}) }).catch(() => ({ ok: false as const, error: 'oculto.errors.offline' }));
    if (!res.ok) {
      setError(te(res.error));
      throw new Error(res.error);
    }
    clearTimers(base);
  };

  const slides: Slide[] = [
    {
      id: 'prep',
      interactive: true,
      title: session.title,
      content: (
        <div className="mg-step mg-oculto-step">
          <p className="mg-step__eyebrow">{t('eyebrow', { week, title: weekTitle, day: session.day })}</p>
          <h2 className="mg-step__title">{session.title}</h2>
          <p className="mg-step__help">{session.focus}</p>
          <p className="mg-oculto-step__label">{t('prep')}</p>
          <ul className="mg-oculto-step__list">
            {howTo.prep.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mg-oculto-step__label">{t('how')}</p>
          <ol className="mg-oculto-step__list">
            {howTo.steps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          {beliefs && <OcultoBeliefDie beliefs={beliefs} initial={belief} />}
          {sigilHelper && <OcultoSigilHelper />}
          {glyphs && <OcultoAlphabet initial={glyphs} />}
          {howTo.care.length > 0 && (
            <ul className="mg-oculto-step__care">
              {howTo.care.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: 'main',
      interactive: true,
      canAdvance: mainSec !== null,
      title: t('main', { minutes: session.mainMinutes }),
      content: (
        <div className="mg-step mg-oculto-step mg-oculto-step--timer">
          <p className="mg-step__eyebrow">{t('main', { minutes: session.mainMinutes })}</p>
          <OcultoTimer storageKey={`${base}:main`} minutes={session.mainMinutes} orb={orb} cues={session.cues} labels={timerLabels} onDone={onMainDone} />
        </div>
      ),
    },
    {
      id: 'observe',
      interactive: true,
      optional: true,
      canAdvance: observed,
      title: t('observe'),
      content: (
        <div className="mg-step mg-oculto-step mg-oculto-step--timer">
          <p className="mg-step__eyebrow">{t('observe')}</p>
          <p className="mg-step__help">{t('observeHelp')}</p>
          {session.observeMinutes > 0 && (
            <OcultoTimer storageKey={`${base}:observe`} minutes={session.observeMinutes} orb={orb} cues={[]} labels={timerLabels} onDone={onObserveDone} />
          )}
        </div>
      ),
    },
    {
      id: 'diary',
      interactive: true,
      title: t('diary'),
      content: (
        <div className="mg-step mg-oculto-step">
          <h2 className="mg-step__title">{t('diary')}</h2>
          <p className="mg-step__help">{t('diaryHelp')}</p>
          <label className="mg-oculto-step__field">
            <span>{t('fields.minutes', { goal: session.mainMinutes })}</span>
            <input className="mg-input" inputMode="decimal" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
          <label className="mg-oculto-step__field">
            <span>{t('fields.concentration', { n: concentration })}</span>
            <input type="range" min={1} max={10} step={1} value={concentration} onChange={(e) => setConcentration(Number(e.target.value))} className="mg-oculto-step__range" />
          </label>
          {dreamJournal && (
            <label className="mg-oculto-step__field">
              <span>{t('fields.dream')}</span>
              <textarea className="mg-input" rows={4} maxLength={2000} value={dream} placeholder={t('fields.dreamPlaceholder')} onChange={(e) => setDream(e.target.value)} />
              <span className="mg-oculto-step__hint">{t('fields.dreamShared')}</span>
            </label>
          )}
          <label className="mg-oculto-step__field">
            <span>{t('fields.difficulty')}</span>
            <textarea className="mg-input" rows={2} maxLength={2000} value={difficulty} placeholder={t('fields.difficultyPlaceholder')} onChange={(e) => setDifficulty(e.target.value)} />
          </label>
          {operationsJournal ? (
            <>
              <label className="mg-oculto-step__field">
                <span>{t('fields.experience')}</span>
                <textarea className="mg-input" rows={3} maxLength={2000} value={experience} placeholder={t('fields.experiencePlaceholder')} onChange={(e) => setExperience(e.target.value)} />
              </label>
              <label className="mg-oculto-step__field">
                <span>{t('fields.interpretation')}</span>
                <textarea className="mg-input" rows={2} maxLength={2000} value={interpretation} placeholder={t('fields.interpretationPlaceholder')} onChange={(e) => setInterpretation(e.target.value)} />
              </label>
              <label className="mg-oculto-step__field">
                <span>{t('fields.evidence')}</span>
                <textarea className="mg-input" rows={2} maxLength={2000} value={evidence} placeholder={t('fields.evidencePlaceholder')} onChange={(e) => setEvidence(e.target.value)} />
              </label>
            </>
          ) : (
            <label className="mg-oculto-step__field">
              <span>{t('fields.notes')}</span>
              <textarea className="mg-input" rows={3} maxLength={2000} value={notes} placeholder={t('fields.notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
            </label>
          )}
          {error && (
            <p className="mg-step__error" role="alert">
              {error}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'done',
      interactive: false,
      title: t('doneTitle'),
      content: (
        <div className="mg-step mg-oculto-step mg-oculto-step--done">
          <div className="mg-oculto-step__orb">
            <LightOrb signs={orb} idKey={`oculto-done-${week}-${session.day}`} />
          </div>
          <h2 className="mg-step__title">{t('doneTitle')}</h2>
          <p className="mg-step__help">{t('doneText')}</p>
          <Button onClick={() => router.push('/oculto')}>{t('back')}</Button>
        </div>
      ),
    },
  ];

  return (
    <SlidePlayer
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      theme="guided"
      className="mg-oculto-player"
      label={t('label')}
      closeLabel={t('close')}
      onClose={() => router.push('/oculto')}
      onBeforeAdvance={save}
      labels={{ prev: t('backStep'), next: t('continue'), back: t('backStep'), skip: t('skip'), continue: t('continue') }}
    />
  );
}
