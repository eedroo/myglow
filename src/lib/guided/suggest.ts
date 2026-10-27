import type { GuidedFlow } from '@prisma/client';
import type { DayProgress } from '@/lib/daily/progress';
import type { DateISO } from '@/lib/dates';
import { isWindowOpen, xpWindow } from '@/lib/xp/rules';

/** Sugestão do fluxo guiado (F18). Puro: pela hora (diário) e pelas janelas do Glow (períodos). */

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function suggestDayFlow(i: {
  localTime: string;
  prefs: { morningTime: string; bodyTime: string; nightTime: string };
  progress: DayProgress;
}): GuidedFlow | null {
  const now = minutes(i.localTime);
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
