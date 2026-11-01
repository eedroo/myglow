/** Guia interactivo (F11): passos e eventos. Puro. */
import type { SectionKey } from '@/lib/guided/sections';

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
  /** F19: secção do diário que o passo mostra; sem ela desbloqueada na jornada, o passo salta-se. */
  section?: SectionKey;
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', route: '/today', target: null, advanceOn: 'next' },
  { id: 'reading', route: '/today', target: 'reading-card', advanceOn: 'next' },
  // O dia em três partes recolhidas (Manhã, Corpo, Noite): o guia mostra cada uma e termina no Hoje.
  { id: 'morning', route: '/today', target: 'focus-morning', advanceOn: 'next' },
  { id: 'body', route: '/today', target: 'focus-body', advanceOn: 'next', section: 'body' },
  { id: 'night', route: '/today', target: 'focus-night', advanceOn: 'next' },
  { id: 'glow', route: '/today', target: 'avatar', advanceOn: 'next', placement: 'bottom' },
  // F19: a jornada (some quando já não há cartão: etapa 5 ou tudo desbloqueado). Último passo.
  { id: 'journey', route: '/today', target: 'journey-card', advanceOn: 'next' },
];

/**
 * Passos que já não existem: quem lá estava conta como concluído (v1: dentro da lição; v2: os do diário campo a campo,
 * Semana e Grimório, antes de o guia ficar só no Hoje).
 */
export const RETIRED_FINAL_STEPS = ['in-lesson', 'done', 'sky', 'intention', 'banish', 'wake', 'week-tab', 'week', 'grimoire-tab', 'first-lesson'];

export type TourStepId = (typeof TOUR_STEPS)[number]['id'];
export const isTourStepId = (id: string | null | undefined): id is string => !!id && TOUR_STEPS.some((s) => s.id === id);
