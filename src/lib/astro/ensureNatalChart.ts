import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { fromDbDate } from '@/lib/dates';
import type { NatalChart } from '@/types/astro';
import { computeNatalChart } from './natal';
import { parseNatalChart } from './natalChartSchema';

/**
 * Devolve o mapa natal do utilizador, calculando-o e gravando-o se faltar ou estiver numa versão antiga
 * (backfill para contas criadas antes da Fase 2). `null` se não houver dados de nascimento.
 */
export async function ensureNatalChart(userId: string): Promise<NatalChart | null> {
  const profile = await db.birthProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const existing = parseNatalChart(profile.natalChart);
  if (existing) return existing;

  const chart = computeNatalChart({
    birthUtc: profile.birthUtc,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timeKnown: profile.birthTimeKnown,
    birthDate: fromDbDate(profile.birthDate),
    birthTz: profile.timezone,
  });

  await db.birthProfile.update({
    where: { userId },
    data: { natalChart: chart as unknown as Prisma.InputJsonValue, chartComputedAt: new Date() },
  });
  return chart;
}
