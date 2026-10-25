import type { ProgressEntry } from '@/lib/daily/progress';
import { computePeriodStats } from '@/lib/stats/period';
import type { RawGuideData } from './input';
import type { GuideReportPayload } from './schema';

/** Fixtures dos testes do Guia (sem base nem IA). */
export const blankEntry: ProgressEntry = {
  intention: null, morningBanishName: null, morningBanishDone: false, morningRitualDone: false, sleepGoalMet: false,
  wakeMood: null, wakeNote: null, stretchDone: false, workoutDone: false, waterDone: false,
  nightBanishName: null, nightBanishDone: false, nightRitualDone: false, gratitude: null, mood: null,
  reflection: null, summary: null,
};

export function rawWeek(entries: (Partial<ProgressEntry> & { date: string })[], patch: Partial<RawGuideData> = {}): RawGuideData {
  const list = entries.map((e) => ({ ...blankEntry, ...e }));
  return {
    kind: 'WEEK',
    locale: 'pt-BR',
    from: '2026-10-18',
    to: '2026-10-24',
    period: { intention: 'Uma semana leve', reflection: null, projects: [{ area: 'MAGIC', text: 'Ritual de lua cheia' }] },
    entries: list,
    dayNotes: {},
    stats: computePeriodStats({ from: '2026-10-18', to: '2026-10-24', today: '2026-10-24', entries: list, weeks: [] }),
    glowEarned: 40,
    lessons: 1,
    moonEvents: [],
    ...patch,
  };
}

export const validReport: GuideReportPayload = {
  opening: 'Foi uma semana de pequenos gestos constantes, com a água e a intenção sempre por perto.',
  continue: [{ title: 'A intenção da manhã', detail: 'Escreveu a intenção em quase todos os dias.', evidence: ['2026-10-19'] }],
  improve: [{ title: 'O ritual da noite', detail: 'Experimente um ritual curto antes de dormir.', evidence: [] }],
  patterns: [],
  areas: [{ area: 'MAGIC', status: 'partial', observed: 'O ritual de lua cheia ficou para depois.' }],
  focuses: [
    { title: 'Intenção curta', why: 'Funciona bem consigo.', action: 'Escreva uma frase de manhã.' },
    { title: 'Banimento da noite', why: 'Fecha o dia.', action: 'Faça o banimento antes de deitar.' },
    { title: 'Uma lição', why: 'Alimenta a prática.', action: 'Abra uma lição do Grimório.' },
  ],
  encouragement: 'Cada pequeno cuidado conta. A sua luz cresce com a constância, não com a perfeição.',
  safety: { distress: false },
};
