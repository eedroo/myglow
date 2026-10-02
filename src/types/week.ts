import type { ProjectArea } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import type { WeekKey } from '@/lib/weeks';
import type { DayProgress } from '@/lib/daily/progress';
import type { MoonDay, MoonEvent } from '@/lib/astro/moonCalendar';

export const PROJECT_AREAS: ProjectArea[] = ['MAGIC', 'PERSONAL', 'LEISURE', 'PROFESSIONAL', 'STUDIES'];

export interface WeekData extends WeekKey {
  title: string; // '' = usar título por defeito
  intention: string;
  weightGrams: number | null;
  reflection: string;
  dayNotes: Record<DateISO, string>; // 7 chaves, '' se vazio
  projects: Record<ProjectArea, string>; // 5 chaves, '' se vazio
  updatedAt: string | null;
}

export interface WeekPatch {
  title?: string;
  intention?: string;
  weightGrams?: number | null;
  reflection?: string;
  dayNotes?: { date: DateISO; text: string }[];
  projects?: { area: ProjectArea; text: string }[];
}

export interface WeekDaySummary {
  date: DateISO;
  progress: DayProgress;
  moon: MoonDay;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeekPageData {
  week: WeekData;
  days: WeekDaySummary[];
  moonEvents: MoonEvent[];
  previousWeightGrams: number | null; // peso da semana anterior mais recente com peso
  wellbeing: boolean; // F9: consentimento de bem-estar (sem ele o peso fica desactivado)
  today: DateISO;
}
