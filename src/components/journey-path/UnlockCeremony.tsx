'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { markCeremonySeen } from '@/actions/journey';
import { SlidePlayer, type Slide } from '@/components/slides/SlidePlayer';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { Button } from '@/components/ui/Button';
import type { JourneyLesson, JourneyTryTarget } from '@/lib/journey/content';
import { UNLOCK_LESSON_LINK, type UnlockId } from '@/lib/journey/stages';

interface JourneyUnlockContext {
  /** Desbloqueio acabado de acontecer (resposta do autosave): abre a mini-lição. */
  unlocked: (id: UnlockId) => void;
  /** Rever uma mini-lição já vista (`/journey`). */
  review: (id: UnlockId) => void;
}

const NOOP: JourneyUnlockContext = { unlocked: () => undefined, review: () => undefined };
const Ctx = createContext<JourneyUnlockContext>(NOOP);

/** Fora do provider (ex.: /dev/ui) devolve um no-op. */
export function useJourneyUnlock(): JourneyUnlockContext {
  return useContext(Ctx);
}

interface ProviderProps {
  lessons: JourneyLesson[];
  /** Mini-lição por ver ao abrir a app; null se não há ou se uma prioridade maior está à frente. */
  pending: UnlockId | null;
  today: string;
  wellbeing: boolean;
  bodyPro: boolean;
  children: ReactNode;
}

/**
 * F19: abre a mini-lição de um novo passo. Abaixo das políticas, da subida de nível e do onboarding guiado (o layout
 * só passa `pending` quando nada disso está à frente); acima da retrospectiva e do modo guiado automático.
 */
export function UnlockCeremonyProvider({ lessons, pending, today, wellbeing, bodyPro, children }: ProviderProps) {
  const router = useRouter();
  const [open, setOpen] = useState<{ id: UnlockId; review: boolean } | null>(pending ? { id: pending, review: false } : null);
  const unlocked = useCallback(
    (id: UnlockId) => {
      setOpen({ id, review: false });
      // O que abriu (banimento, Mês…) aparece já na página por baixo.
      router.refresh();
    },
    [router],
  );
  const review = useCallback((id: UnlockId) => setOpen({ id, review: true }), []);
  const value = useMemo(() => ({ unlocked, review }), [unlocked, review]);
  const lesson = open ? lessons.find((l) => l.unlockId === open.id) : undefined;

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && lesson && (
        <UnlockCeremony
          key={`${open.id}:${open.review}`}
          lesson={lesson}
          review={open.review}
          today={today}
          wellbeing={wellbeing}
          bodyPro={bodyPro}
          onDone={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      )}
    </Ctx.Provider>
  );
}

/** Para onde leva o botão do último slide. DAY_NOW: manhã até às 15h, noite depois. */
export function tryHref(target: JourneyTryTarget, today: string, hour = new Date().getHours()): string {
  if (target.kind === 'route') return target.href;
  switch (target.flow) {
    case 'DAY_NOW':
      return `/guided/day/${today}/${hour < 15 ? 'morning' : 'night'}`;
    case 'DAY_MORNING':
      return `/guided/day/${today}/morning`;
    case 'DAY_BODY':
      return `/guided/day/${today}/body`;
    case 'DAY_NIGHT':
      return `/guided/day/${today}/night`;
    case 'MONTH_PLAN':
      return `/guided/month/${today.slice(0, 7)}/plan`;
  }
}

interface CeremonyProps {
  lesson: JourneyLesson;
  review: boolean;
  today: string;
  wellbeing: boolean;
  bodyPro: boolean;
  onDone: () => void;
}

/** A mini-lição em slides (`SlidePlayer` com o tema do modo guiado). */
export function UnlockCeremony({ lesson, review, today, wellbeing, bodyPro, onDone }: CeremonyProps) {
  const t = useTranslations('journey.ceremony');
  const tg = useTranslations('guided.labels');
  const router = useRouter();
  const reachedEnd = useRef(false);
  const deeper = UNLOCK_LESSON_LINK[lesson.unlockId];

  const visible = lesson.slides.filter((s) => !s.only || (s.only === 'wellbeing' ? wellbeing : bodyPro));
  const finish = (dismissed: boolean) => {
    if (!review) void markCeremonySeen(lesson.unlockId, dismissed).catch(() => undefined);
  };
  const close = () => {
    finish(!reachedEnd.current);
    onDone();
  };
  const go = (href: string) => {
    finish(false);
    onDone();
    router.push(href);
  };

  const slides: Slide[] = visible.map((s, i) => {
    const last = i === visible.length - 1;
    return {
      id: s.id,
      interactive: false,
      title: s.title,
      content: (
        <div className="mg-step mg-unlock">
          {i === 0 && !review && (
            <p className="mg-unlock__badge">
              <MagicIcon name="sparkles" size="sm" decorative />
              {t('badge')}
            </p>
          )}
          <span className={i === 0 ? 'mg-unlock__icon mg-unlock__glow' : 'mg-unlock__icon'}>
            <MagicIcon name={s.icon} size={i === 0 ? 'xl' : 'lg'} decorative />
          </span>
          <h2 className="mg-step__title mg-unlock__title">{s.title}</h2>
          <p className="mg-unlock__text">{s.text}</p>
          {last && (
            <div className="mg-unlock__actions">
              <Button onClick={() => go(tryHref(lesson.tryTarget, today))}>{lesson.tryLabel}</Button>
              {deeper && (
                <Link href={`/grimoire/${deeper.course}/${deeper.lesson}`} className="mg-unlock__deeper" onClick={() => finish(false)}>
                  <BookOpen size={16} aria-hidden="true" />
                  {t('deeper')}
                </Link>
              )}
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <SlidePlayer
      slides={slides}
      theme="guided"
      className="mg-unlock-player"
      label={t('label')}
      closeLabel={t('close')}
      onClose={close}
      onComplete={() => {
        reachedEnd.current = true;
      }}
      labels={{ prev: tg('back'), next: tg('continue'), back: tg('back'), skip: tg('skip'), continue: tg('continue') }}
    />
  );
}

/** "Rever a mini-lição" em `/journey`. */
export function ReviewLessonButton({ unlockId, label }: { unlockId: UnlockId; label: string }) {
  const { review } = useJourneyUnlock();
  return (
    <button type="button" className="mg-journey-path__review" onClick={() => review(unlockId)}>
      {label}
    </button>
  );
}
