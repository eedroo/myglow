import type { ProjectArea, ZodiacSign } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import type { MonthOverview } from '@/lib/month/overview';
import type { RetrogradePeriod, SkyEvent } from '@/lib/astro/skyEvents';
import type { MonthlyMood, PeriodStats } from '@/lib/stats/period';
import type { DayLevel } from '@/lib/daily/progress';

export type Projects = Record<ProjectArea, string>;
export type ProjectsPatch = { area: ProjectArea; text: string }[];

export interface MonthPlanData {
  year: number;
  month: number;
  intention: string;
  reflection: string;
  projects: Projects;
  updatedAt: string | null;
}

export interface MonthPatch {
  intention?: string;
  reflection?: string;
  projects?: ProjectsPatch;
}

export interface YearPlanData {
  year: number;
  word: string;
  intention: string;
  reflection: string;
  projects: Projects;
  updatedAt: string | null;
}

export interface YearPatch {
  word?: string;
  intention?: string;
  reflection?: string;
  projects?: ProjectsPatch;
}

export interface MonthPageData {
  plan: MonthPlanData;
  overview: MonthOverview;
  sky: SkyEvent[];
  retrogrades: RetrogradePeriod[];
  sunSigns: { sign: ZodiacSign; from: DateISO }[];
  stats: PeriodStats;
  isFuture: boolean;
}

export interface YearMonthSummary {
  month: number;
  intention: string;
  stats: MonthlyMood;
  levels: Record<DateISO, DayLevel>;
  isFuture: boolean;
  isCurrent: boolean;
}

export interface YearPageData {
  plan: YearPlanData;
  months: YearMonthSummary[];
  sky: SkyEvent[]; // só SABBAT, SEASON e eclipses
  retrogrades: RetrogradePeriod[];
  stats: PeriodStats;
  today: DateISO;
}
