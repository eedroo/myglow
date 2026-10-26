'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { GuidedFlow, ProjectArea } from '@prisma/client';
import { guidedCompleted, guidedStarted } from '@/actions/guided';
import { buildFlow, firstIncompleteStep, isStepDone, routeSegment, type GuidedStep } from '@/lib/guided/flows';
import type { SectionContext } from '@/lib/guided/sections';
import type { MagicIconName } from '@/lib/icons';
import type { XpResult } from '@/lib/xp/award';
import { useDailyAutosave } from '@/hooks/useDailyAutosave';
import { useWeekAutosave } from '@/hooks/useWeekAutosave';
import { useMonthAutosave } from '@/hooks/useMonthAutosave';
import { useYearAutosave } from '@/hooks/useYearAutosave';
import type { DailyEntryData, DailyField } from '@/types/daily';
import type { WeekData } from '@/types/week';
import type { MonthPlanData, YearPlanData } from '@/types/planner';
import { SlidePlayer, type Slide } from '@/components/slides/SlidePlayer';
import { StepBanish } from './StepBanish';
import { StepBodyChecks } from './StepBodyChecks';
import { StepCheck } from './StepCheck';
import { StepClosing } from './StepClosing';
import { StepReading } from './StepReading';
import { StepScale } from './StepScale';
import { StepText } from './StepText';
import { StepWeight } from './StepWeight';
import { StepWord } from './StepWord';

/** O que cada adaptador dá ao runner: valores achatados, gravar um campo e gravar já o pendente. */
interface GuidedStore {
  values: Record<string, unknown>;
  set: (field: string, value: unknown) => void;
  flush: () => Promise<void>;
}

interface RunnerProps {
  flow: GuidedFlow;
  /** Chave do período (dia, domingo, 'YYYY-MM' ou 'YYYY') e a base das rotas `/guided/...`. */
  periodKey: string;
  routeBase: string;
  ctx: SectionContext;
  closeHref: string;
  intro: ReactNode;
  reading?: { node: ReactNode; pending: boolean };
  ritual?: ReactNode;
  weightAverage?: { avgGrams: number; count: number } | null;
}

const AREA_ICON: Record<ProjectArea, MagicIconName> = { MAGIC: 'sparkles', PERSONAL: 'heart', LEISURE: 'lotus', PROFESSIONAL: 'briefcase', STUDIES: 'book-open' };
const MAX: Record<string, number> = {
  intention: 2000, gratitude: 2000, reflection: 10000, summary: 4000, morningBanishName: 80, nightBanishName: 80,
};
const LIMITS: Record<string, Record<string, number>> = {
  DAY: { intention: 500, gratitude: 2000, reflection: 4000, summary: 4000 },
  WEEK: { intention: 1000, reflection: 4000, projects: 500 },
  MONTH: { intention: 1000, reflection: 6000, projects: 500 },
  YEAR: { intention: 2000, reflection: 10000, projects: 500 },
};
const NEXT: Partial<Record<GuidedFlow, GuidedFlow>> = { DAY_MORNING: 'DAY_BODY', DAY_BODY: 'DAY_NIGHT' };
const THEME: Record<string, string> = { DAY_MORNING: 'morning', DAY_BODY: 'body', DAY_NIGHT: 'night' };
const glowOf = (xp: XpResult) => xp.awards.reduce((n, a) => n + a.points, 0);

function GuidedRunner({ flow, periodKey, routeBase, ctx, closeHref, intro, reading, ritual, weightAverage, store, glow }: RunnerProps & { store: GuidedStore; glow: number }) {
  const t = useTranslations('guided');
  const td = useTranslations('day');
  const tp = useTranslations('projects');
  const tw = useTranslations('weight');
  const router = useRouter();
  const steps = useMemo(() => buildFlow(flow, ctx), [flow, ctx]);
  // Nada feito ainda: começa na abertura; senão, no primeiro passo por fazer.
  const [index, setIndex] = useState(() => (steps.some((s) => s.section && s.kind !== 'reading' && isStepDone(s, store.values)) ? firstIncompleteStep(steps, store.values) : 0));
  const kind = flow.split('_')[0]!;
  const { values, set, flush } = store;
  const onBlur = useCallback(() => void flush(), [flush]);
  const goNext = useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);

  useEffect(() => {
    void guidedStarted(flow, periodKey).catch(() => {});
  }, [flow, periodKey]);

  const close = useCallback(async () => {
    await flush();
    router.push(closeHref);
  }, [flush, router, closeHref]);

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const moodLabels = td.raw('moodLabels') as [string, string, string, string, string];

  const render = (s: GuidedStep): ReactNode => {
    const key = s.area ? `${s.section}` : s.id;
    switch (s.kind) {
      case 'intro':
        return intro;
      case 'reading':
        return (
          <StepReading title={t('steps.reading.title')} show={t('steps.reading.show')} skip={t('steps.reading.skip')} pending={!!reading?.pending} onSkip={goNext}>
            {reading?.node}
          </StepReading>
        );
      case 'text': {
        const max = s.area ? LIMITS[kind]!.projects! : (LIMITS[kind]![s.field!] ?? MAX[s.field!] ?? 2000);
        return (
          <StepText
            id={`guided-${s.id}`}
            title={t(`steps.${key}.title`)}
            help={t(`steps.${key}.help`)}
            placeholder={t.has(`steps.${key}.placeholder`) ? t(`steps.${key}.placeholder`) : undefined}
            value={str(values[s.field!])}
            onChange={(v) => set(s.field!, v)}
            onBlur={onBlur}
            maxLength={max}
            {...(s.area && { area: { icon: AREA_ICON[s.area], name: tp(`areas.${s.area}`) } })}
          />
        );
      }
      case 'banish': {
        const doneField = s.field!.replace(/Name$/, 'Done');
        return (
          <StepBanish
            id={`guided-${s.id}`}
            title={t(`steps.${s.id}.title`)}
            help={t(`steps.${s.id}.help`)}
            placeholder={t(`steps.${s.id}.placeholder`)}
            doneLabel={t('doneButton')}
            name={str(values[s.field!])}
            done={values[doneField] === true}
            onName={(v) => set(s.field!, v)}
            onDone={(v) => set(doneField, v)}
            onBlur={onBlur}
          />
        );
      }
      case 'check':
        return (
          <StepCheck
            icon={s.id === 'sleep' ? 'bed' : s.id === 'nightRitual' ? 'candle' : 'sun'}
            title={t(`steps.${s.id}.title`)}
            help={t(`steps.${s.id}.help`)}
            value={values[s.field!] === true}
            doneLabel={t('doneButton')}
            onToggle={(v) => set(s.field!, v)}
            extra={s.id === 'morningRitual' ? ritual : undefined}
          />
        );
      case 'scale':
        return (
          <StepScale
            name={`guided-${s.id}`}
            title={t(`steps.${s.id}.title`)}
            help={t(`steps.${s.id}.help`)}
            labels={moodLabels}
            value={typeof values[s.field!] === 'number' ? (values[s.field!] as number) : null}
            onChange={(v) => set(s.field!, v)}
            {...(s.id === 'wakeMood' && {
              note: { label: td('wake.note'), placeholder: td('wake.notePlaceholder'), value: str(values.wakeNote), onChange: (v: string) => set('wakeNote', v), onBlur },
            })}
          />
        );
      case 'bodyChecks':
        return (
          <StepBodyChecks
            title={t('steps.body.title')}
            help={t('steps.body.help')}
            labels={{ stretchDone: td('body.stretch'), workoutDone: td('body.workout'), waterDone: td('body.water') }}
            values={values}
            onToggle={(f, v) => set(f, v)}
            bodyPro={ctx.hasBodyPro}
            openBodyLabel={t('steps.body.open')}
            onOpenBody={() => void flush().then(() => router.push('/body'))}
          />
        );
      case 'weight':
        return (
          <StepWeight
            title={t('steps.weekWeight.title')}
            help={t('steps.weekWeight.help')}
            grams={typeof values.weightGrams === 'number' ? (values.weightGrams as number) : null}
            onCommit={(g) => set('weightGrams', g)}
            average={ctx.hasBodyPro ? (weightAverage ?? null) : null}
            unit={tw('unit')}
            placeholder={tw('placeholder')}
            invalidLabel={tw('invalid')}
            averageLabel={weightAverage ? tw('fromWeighIns', { n: weightAverage.count }) : ''}
            openLabel={tw('openWeight')}
          />
        );
      case 'word':
        return (
          <StepWord
            title={t('steps.yearWord.title')}
            help={t('steps.yearWord.help')}
            placeholder={t('steps.yearWord.placeholder')}
            value={str(values.word)}
            onChange={(v) => set('word', v)}
            onBlur={onBlur}
          />
        );
      case 'closing': {
        const items = steps.filter((x) => x.section && x.kind !== 'reading' && isStepDone(x, values)).map((x) => t(`done.${x.area ? x.section : x.id}`, { area: x.area ? tp(`areas.${x.area}`) : '' }));
        const next = NEXT[flow];
        return (
          <StepClosing
            title={t(`flows.${flow}.closing`)}
            items={[...new Set(items)]}
            glow={glow}
            glowLabel={t('closing.glow')}
            next={next ? { label: t('closing.next', { flow: t(`flows.${next}.short`) }), href: `${routeBase}/${routeSegment(next)}` } : null}
            back={{ label: t(`closing.back.${kind}`), href: closeHref }}
          />
        );
      }
    }
  };

  const slides: Slide[] = steps.map((s) => ({
    id: s.id,
    interactive: !['intro', 'reading', 'closing'].includes(s.kind),
    optional: s.optional,
    title: s.kind === 'intro' || s.kind === 'closing' ? t(`flows.${flow}.label`) : undefined,
    content: render(s),
  }));

  return (
    <div className={`mg-guided mg-guided--${THEME[flow] ?? 'period'}`}>
      <SlidePlayer
        theme="guided"
        label={t(`flows.${flow}.label`)}
        closeLabel={t('labels.close')}
        labels={{ prev: t('labels.back'), next: t('labels.continue'), back: t('labels.back'), skip: t('labels.skip'), continue: t('labels.continue') }}
        slides={slides}
        index={index}
        onIndexChange={setIndex}
        onBeforeAdvance={flush}
        onComplete={() => void guidedCompleted(flow, periodKey).catch(() => {})}
        onClose={() => void close()}
      />
    </div>
  );
}

function useGlowSum() {
  const [glow, setGlow] = useState(0);
  const onXp = useRef((xp: XpResult) => setGlow((g) => g + glowOf(xp)));
  return { glow, onXp: onXp.current };
}

/** Diário: manhã, corpo e noite. */
export function GuidedDayRunner({ date, initial, ...props }: RunnerProps & { date: string; initial: DailyEntryData }) {
  const { glow, onXp } = useGlowSum();
  const { data, setField, flush } = useDailyAutosave(date, initial, { onXp });
  const store = useMemo<GuidedStore>(
    () => ({ values: data as unknown as Record<string, unknown>, set: (f, v) => setField(f as DailyField, v as never), flush }),
    [data, setField, flush],
  );
  return <GuidedRunner {...props} store={store} glow={glow} />;
}

const flatProjects = (projects: Record<string, string>) => Object.fromEntries(Object.entries(projects).map(([a, v]) => [`projects.${a}`, v]));

/** Semana: planear (intenção, áreas e peso) e fechar (reflexão). */
export function GuidedWeekRunner({ initial, ...props }: RunnerProps & { initial: WeekData }) {
  const { glow, onXp } = useGlowSum();
  const { data, setText, setWeight, setProject, flush } = useWeekAutosave(initial, { onXp });
  const store = useMemo<GuidedStore>(
    () => ({
      values: { intention: data.intention, reflection: data.reflection, weightGrams: data.weightGrams, ...flatProjects(data.projects) },
      set: (f, v) => {
        if (f.startsWith('projects.')) setProject(f.slice(9) as ProjectArea, String(v ?? ''));
        else if (f === 'weightGrams') setWeight((v as number | null) ?? null);
        else setText(f as 'intention' | 'reflection', String(v ?? ''));
      },
      flush,
    }),
    [data, setText, setWeight, setProject, flush],
  );
  return <GuidedRunner {...props} store={store} glow={glow} />;
}

/** Mês: planear e fechar. */
export function GuidedMonthRunner({ initial, ...props }: RunnerProps & { initial: MonthPlanData }) {
  const { glow, onXp } = useGlowSum();
  const { data, setText, setProject, flush } = useMonthAutosave(initial, { onXp });
  const store = useMemo<GuidedStore>(
    () => ({
      values: { intention: data.intention, reflection: data.reflection, ...flatProjects(data.projects) },
      set: (f, v) => (f.startsWith('projects.') ? setProject(f.slice(9) as ProjectArea, String(v ?? '')) : setText(f as 'intention' | 'reflection', String(v ?? ''))),
      flush,
    }),
    [data, setText, setProject, flush],
  );
  return <GuidedRunner {...props} store={store} glow={glow} />;
}

/** Ano: palavra, intenção e áreas; fechar com a reflexão. */
export function GuidedYearRunner({ initial, ...props }: RunnerProps & { initial: YearPlanData }) {
  const { glow, onXp } = useGlowSum();
  const { data, setText, setProject, flush } = useYearAutosave(initial, { onXp });
  const store = useMemo<GuidedStore>(
    () => ({
      values: { word: data.word, intention: data.intention, reflection: data.reflection, ...flatProjects(data.projects) },
      set: (f, v) => (f.startsWith('projects.') ? setProject(f.slice(9) as ProjectArea, String(v ?? '')) : setText(f as 'word' | 'intention' | 'reflection', String(v ?? ''))),
      flush,
    }),
    [data, setText, setProject, flush],
  );
  return <GuidedRunner {...props} store={store} glow={glow} />;
}
