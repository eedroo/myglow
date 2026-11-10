import type { GuidedFlow } from '@prisma/client';
import type { DayProgress } from '@/lib/daily/progress';
import type { DateISO } from '@/lib/dates';
import { isWindowOpen, xpWindow } from '@/lib/xp/rules';

/** Sugestão do fluxo guiado (F18). Puro: pela hora (diário) e pelas janelas do Glow (períodos). */

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Fim da madrugada: às 06:00, ou mais cedo se o aviso da manhã for antes disso. */
export const DAWN = '06:00';

/**
 * Madrugada (da meia-noite até às 05:59, ou até à hora do aviso da manhã se for mais cedo): ainda conta como a noite
 * do dia anterior para o passo a passo; a manhã do dia novo só abre e só se sugere depois disso.
 */
export function isEarlyHours(localTime: string, morningTime: string): boolean {
  return minutes(localTime) < Math.min(minutes(DAWN), minutes(morningTime));
}

export function suggestDayFlow(i: {
  localTime: string;
  prefs: { morningTime: string; bodyTime: string; nightTime: string };
  progress: DayProgress;
}): GuidedFlow | null {
  const now = minutes(i.localTime);
  // Madrugada: nada do dia novo (a noite de ontem é sugerida à parte, em `dayGuided`).
  if (isEarlyHours(i.localTime, i.prefs.morningTime)) return null;
  // F19: uma parte do dia ainda bloqueada na jornada conta como feita (nada de "Cuidar do corpo" antes da etapa 4).
  const { applicable } = i.progress;
  const morning = i.progress.morning || !applicable.morning;
  const body = i.progress.body || !applicable.body;
  const night = i.progress.night || !applicable.night;
  if (now >= minutes(i.prefs.nightTime)) return night ? null : 'DAY_NIGHT';
  if (now < minutes(i.prefs.bodyTime)) return !morning ? 'DAY_MORNING' : body ? null : 'DAY_BODY';
  if (!body) return 'DAY_BODY';
  return morning ? null : 'DAY_MORNING';
}

const SOURCES = {
  WEEK: { plan: 'WEEK_PLAN', close: 'WEEK_REFLECTION', flows: ['WEEK_PLAN', 'WEEK_CLOSE'] },
  MONTH: { plan: 'MONTH_PLAN', close: 'MONTH_REFLECTION', flows: ['MONTH_PLAN', 'MONTH_CLOSE'] },
  YEAR: { plan: 'YEAR_PLAN', close: 'YEAR_REFLECTION', flows: ['YEAR_PLAN', 'YEAR_CLOSE'] },
} as const;

export function suggestPeriodFlow(i: {
  kind: 'WEEK' | 'MONTH' | 'YEAR';
  periodStart: DateISO;
  today: DateISO;
  now: Date;
  tz: string;
  planFilled: boolean;
  reflectionFilled: boolean;
}): GuidedFlow | null {
  const s = SOURCES[i.kind];
  if (!i.reflectionFilled && isWindowOpen(xpWindow(s.close, i.periodStart, i.tz), i.now)) return s.flows[1];
  if (!i.planFilled && isWindowOpen(xpWindow(s.plan, i.periodStart, i.tz), i.now)) return s.flows[0];
  return null;
}

/**
 * Abrir sozinho o modo passo a passo ao entrar na app (uma vez por fluxo e dia):
 * - a manhã na primeira abertura do dia, se ainda está por fazer (até à hora do aviso da noite);
 * - a noite a partir da hora do aviso da noite, se ainda está por fazer.
 * O corpo nunca abre sozinho (faz-se a qualquer hora). Partes não aplicáveis (jornada) não abrem.
 */
export function autoOpenFlow(i: {
  localTime: string;
  nightTime: string;
  progress: DayProgress;
  startedToday: GuidedFlow[];
}): GuidedFlow | null {
  const now = minutes(i.localTime);
  const night = now >= minutes(i.nightTime);
  const { progress: p } = i;
  if (night) return p.applicable.night && !p.night && !i.startedToday.includes('DAY_NIGHT') ? 'DAY_NIGHT' : null;
  return p.applicable.morning && !p.morning && !i.startedToday.includes('DAY_MORNING') ? 'DAY_MORNING' : null;
}

/**
 * O que abre sozinho ao entrar, com a madrugada: até ao fim dela abre a noite de ontem (se ainda está por fazer e não
 * foi aberta), nunca a manhã do dia novo; depois disso, `autoOpenFlow` para hoje.
 */
export function autoOpenTarget(i: {
  localTime: string;
  morningTime: string;
  nightTime: string;
  progress: DayProgress;
  startedToday: GuidedFlow[];
  yesterday: { progress: DayProgress; started: GuidedFlow[] } | null;
}): { flow: GuidedFlow; day: 'today' | 'yesterday' } | null {
  if (isEarlyHours(i.localTime, i.morningTime)) {
    const y = i.yesterday;
    return y && y.progress.applicable.night && !y.progress.night && !y.started.includes('DAY_NIGHT') ? { flow: 'DAY_NIGHT', day: 'yesterday' } : null;
  }
  const flow = autoOpenFlow(i);
  return flow ? { flow, day: 'today' } : null;
}

/** Na madrugada, a sugestão do Hoje é a noite de ontem, se ainda está por fazer. */
export function earlyHoursSuggestion(i: { localTime: string; morningTime: string; yesterday: DayProgress | null }): GuidedFlow | null {
  if (!isEarlyHours(i.localTime, i.morningTime) || !i.yesterday) return null;
  return i.yesterday.applicable.night && !i.yesterday.night ? 'DAY_NIGHT' : null;
}
