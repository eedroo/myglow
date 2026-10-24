/** Guia interactivo (F11): passos e eventos. Puro. */
export type TourEvent =
  | 'next' | 'back' | 'pause' | 'resume' | 'skip'
  | 'intention-saved' | 'morning-banish-done' | 'wake-mood-set'
  | 'week-intention-saved' | 'lesson-opened' | 'lesson-completed';

export interface TourStep {
  id: string;
  route: '/today' | '/week' | '/grimoire' | 'lesson'; // 'lesson' = /grimoire/[course]/[lesson]
  target: string | null; // valor de data-tour do elemento em destaque; null = balão centrado
  advanceOn: TourEvent; // 'next' = botão "Continuar"; outro = acção real da pessoa
  optional?: boolean; // mostra "Fazer depois" para avançar sem a acção
  placement?: 'top' | 'bottom' | 'auto';
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', route: '/today', target: null, advanceOn: 'next' },
  { id: 'sky', route: '/today', target: 'sky-card', advanceOn: 'next' },
  { id: 'reading', route: '/today', target: 'reading-card', advanceOn: 'next' },
  { id: 'intention', route: '/today', target: 'intention', advanceOn: 'intention-saved', optional: true },
  { id: 'banish', route: '/today', target: 'morning-banish', advanceOn: 'morning-banish-done', optional: true },
  { id: 'wake', route: '/today', target: 'wake-mood', advanceOn: 'wake-mood-set', optional: true },
  { id: 'body', route: '/today', target: 'body-focus', advanceOn: 'next' },
  { id: 'night', route: '/today', target: 'night-section', advanceOn: 'next' },
  { id: 'glow', route: '/today', target: 'avatar', advanceOn: 'next', placement: 'bottom' },
  { id: 'week-tab', route: '/today', target: 'nav-week', advanceOn: 'next', placement: 'top' }, // "Continuar" navega para /week
  { id: 'week', route: '/week', target: 'week-intention', advanceOn: 'week-intention-saved', optional: true },
  { id: 'grimoire-tab', route: '/week', target: 'nav-grimoire', advanceOn: 'next', placement: 'top' }, // navega para /grimoire
  // Último passo: abrir a lição termina o guia (dentro da lição o balão tapava as perguntas).
  { id: 'first-lesson', route: '/grimoire', target: 'lesson-current', advanceOn: 'lesson-opened' },
];

/** Passos que existiram até à v1 do guia (dentro da lição): quem lá estava conta como concluído. */
export const RETIRED_FINAL_STEPS = ['in-lesson', 'done'];

export type TourStepId = (typeof TOUR_STEPS)[number]['id'];
export const isTourStepId = (id: string | null | undefined): id is string => !!id && TOUR_STEPS.some((s) => s.id === id);
