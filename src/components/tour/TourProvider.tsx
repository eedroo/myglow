'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { saveTourState } from '@/actions/tour';
import { onTourEvent } from '@/lib/tour/bus';
import { currentStep, isOnStepRoute, progress, reduceTour, startTour, type TourState } from '@/lib/tour/machine';
import { TOUR_STEPS, type TourEvent, type TourStep } from '@/lib/tour/steps';
import { TourOverlay } from './TourOverlay';
import { TourBubble } from './TourBubble';
import { TourResumePill } from './TourResumePill';
import { TourCelebration } from './TourCelebration';

/**
 * Estado mais recente desta sessão no browser. Os layouts (app) e (focus) montam cada um o seu provider e o
 * estado do servidor pode vir de uma página em cache: o que esta aba mudou por último ganha.
 * Só é lido e escrito no browser (no servidor este módulo é partilhado entre pedidos de pessoas diferentes).
 */
let sessionState: TourState | null = null;
const remember = (s: TourState) => {
  if (typeof window !== 'undefined') sessionState = s;
};

const TARGET_WAIT_MS = 1500;

interface TourContextValue {
  state: TourState;
  dispatch: (event: TourEvent) => void;
  /** Depois de `restartTour` no servidor: recomeça aqui sem esperar por um novo render do layout. */
  restartLocal: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue | null {
  return useContext(TourContext);
}

const routeHref = (step: TourStep) => (step.route === 'lesson' ? '/grimoire' : step.route);

/** Mantém o estado do guia, escuta as acções reais (bus), grava cada mudança e mostra o passo certo. */
export function TourProvider({ initial, children }: { initial: TourState; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<TourState>(initial);
  const stateRef = useRef(state);
  const blockedRef = useRef(false);

  // Depois de montar (sem diferenças de hidratação): o que esta aba mudou por último ganha ao do servidor.
  useEffect(() => {
    if (sessionState && (sessionState.stepId !== initial.stepId || sessionState.status !== initial.status)) {
      stateRef.current = sessionState;
      setState(sessionState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
  }, []);
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const persist = useCallback((next: TourState) => {
    if (next.status === 'idle') return saving.current;
    // Em fila, para chegarem pela ordem; sem esperar (uma falha de rede não trava o guia).
    saving.current = saving.current
      .then(() => saveTourState(next.stepId, next.status as 'active' | 'paused' | 'done'))
      .catch(() => undefined);
    return saving.current;
  }, []);

  const dispatch = useCallback(
    (event: TourEvent) => {
      const prev = stateRef.current;
      const next = reduceTour(prev, event);
      if (next === prev || (next.stepId === prev.stepId && next.status === prev.status)) return;
      stateRef.current = next;
      remember(next);
      setState(next);
      void persist(next);
      // "Continuar" que muda de página (Semana, Grimório): leva lá.
      const step = currentStep(next);
      if (event === 'next' && step && step.route !== 'lesson' && step.route !== window.location.pathname) router.push(step.route);
    },
    [persist, router],
  );

  const restartLocal = useCallback(() => {
    const next = startTour();
    stateRef.current = next;
    remember(next);
    setState(next);
  }, []);

  // Acções reais da pessoa (gravações, lições).
  useEffect(() => onTourEvent(dispatch), [dispatch]);

  // Esc pausa (nunca prende a pessoa).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Com um diálogo aberto, o Esc é dele (fecha-o) e não pausa o guia.
      if (e.key === 'Escape' && stateRef.current.status === 'active' && !blockedRef.current) dispatch('pause');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  // Diálogos (termos, nível, novidades, avisos) têm prioridade: o guia espera que fechem.
  useEffect(() => {
    const check = () => {
      blockedRef.current = !!document.querySelector('dialog[open]');
      setBlocked(blockedRef.current);
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    return () => mo.disconnect();
  }, []);

  const step = currentStep(state);
  const onRoute = !!step && isOnStepRoute(step, pathname);

  // A pessoa tocou na própria aba em destaque (Semana, Grimório): chegou ao passo seguinte sozinha.
  useEffect(() => {
    if (state.status !== 'active' || !step || step.advanceOn !== 'next' || step.route === pathname) return;
    const next = TOUR_STEPS[TOUR_STEPS.findIndex((s) => s.id === step.id) + 1];
    if (next && next.route === pathname) dispatch('next');
  }, [pathname, state.status, step, dispatch]);
  const active = state.status === 'active' && onRoute && !blocked;

  // O alvo abriu o seu próprio popover (ex.: o nó da lição com "Começar"): o guia sai da frente até fechar.
  useEffect(() => {
    setTargetOpen(false);
    if (!target) return;
    const check = () => setTargetOpen(target.getAttribute('aria-expanded') === 'true');
    const mo = new MutationObserver(check);
    mo.observe(target, { attributes: true, attributeFilter: ['aria-expanded'] });
    return () => mo.disconnect();
  }, [target]);

  // Procura o alvo do passo (pode aparecer um pouco depois); traz-o para o ecrã.
  useEffect(() => {
    setTarget(null);
    setTargetMissing(false);
    if (!active || !step?.target) return;
    const selector = `[data-tour="${step.target}"]`;
    let found: HTMLElement | null = null;
    const started = Date.now();
    const timer = window.setInterval(() => {
      found = document.querySelector<HTMLElement>(selector);
      if (found) {
        window.clearInterval(timer);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        found.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        setTarget(found);
      } else if (Date.now() - started > TARGET_WAIT_MS) {
        window.clearInterval(timer);
        // Sem o alvo no ecrã (ex.: "como acordei" sem consentimento de bem-estar): passos opcionais saltam-se.
        if (step.optional) dispatch('skip');
        else setTargetMissing(true);
      }
    }, 100);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando muda o passo, a rota ou o bloqueio
  }, [active, step?.id, pathname]);

  const value = useMemo(() => ({ state, dispatch, restartLocal }), [state, dispatch, restartLocal]);
  const { index, total } = progress(state);

  let ui: ReactNode = null;
  if (active && step) {
    const bubble = (variant: 'anchored' | 'center' | 'top') => (
      <TourBubble
        step={step}
        index={index}
        total={total}
        target={variant === 'anchored' ? target : null}
        variant={variant}
        onNext={() => dispatch('next')}
        onLater={() => dispatch('skip')}
        onPause={() => dispatch('pause')}
      />
    );
    if (step.id === 'done') {
      ui = (
        <TourCelebration
          onFinish={async () => {
            dispatch('next');
            await saving.current;
            router.push('/today');
          }}
        />
      );
    } else if (step.route === 'lesson') {
      ui = bubble('top'); // dentro da lição: discreto, sem escurecer
    } else if (!step.target || targetMissing) {
      ui = (
        <>
          <TourOverlay target={null} />
          {bubble('center')}
        </>
      );
    } else if (target && !targetOpen) {
      ui = (
        <>
          <TourOverlay target={target} />
          {bubble('anchored')}
        </>
      );
    }
  } else if (step && !blocked && (state.status === 'paused' || !onRoute)) {
    ui = (
      <TourResumePill
        onResume={() => {
          if (state.status === 'paused') dispatch('resume');
          if (!onRoute) router.push(routeHref(step));
        }}
      />
    );
  }

  return (
    <TourContext.Provider value={value}>
      {children}
      {ui}
    </TourContext.Provider>
  );
}
