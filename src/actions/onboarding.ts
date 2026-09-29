'use server';

import { Prisma } from '@prisma/client';
import { IANAZone } from 'luxon';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toBirthUtc } from '@/lib/birth';
import { computeNatalChart } from '@/lib/astro/natal';
import { toDbDate } from '@/lib/dates';
import { guessHemisphere } from '@/lib/hemisphere';
import { birthProfileSchema, type BirthProfileInput } from '@/lib/validation/onboarding';

export type BirthField = 'birthDate' | 'birthTime' | 'placeName' | 'timezone';

export type SaveBirthProfileResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Partial<Record<BirthField, string>> };

const FIELD_ERRORS: Record<string, [BirthField, string]> = {
  birthDate: ['birthDate', 'validation.birthDate'],
  birthTime: ['birthTime', 'validation.birthTime'],
  birthTimeKnown: ['birthTime', 'validation.birthTime'],
  placeName: ['placeName', 'validation.place'],
  latitude: ['placeName', 'validation.place'],
  longitude: ['placeName', 'validation.place'],
  timezone: ['placeName', 'validation.place'],
  userTimezone: ['timezone', 'validation.timezone'],
};

/**
 * Guarda o perfil de nascimento, fixa o fuso do utilizador e marca o onboarding como concluído.
 * O cliente chama depois `update()` da sessão para refrescar `onboarded` no JWT.
 */
export async function saveBirthProfile(input: BirthProfileInput): Promise<SaveBirthProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, formError: 'common.errors.unauthorized' };

  const parsed = birthProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<BirthField, string>> = {};
    for (const issue of parsed.error.issues) {
      const mapped = FIELD_ERRORS[String(issue.path[0])];
      if (mapped) fieldErrors[mapped[0]] = mapped[1];
    }
    return { ok: false, fieldErrors };
  }

  const data = parsed.data;
  if (!IANAZone.isValidZone(data.timezone)) return { ok: false, fieldErrors: { placeName: 'validation.place' } };
  const userTimezone = IANAZone.isValidZone(data.userTimezone) ? data.userTimezone : 'Europe/Lisbon';
  const birthTime = data.birthTimeKnown ? data.birthTime : null;

  let birthUtc: Date;
  try {
    birthUtc = toBirthUtc(data.birthDate, birthTime, data.timezone);
  } catch {
    return { ok: false, fieldErrors: { birthTime: 'validation.birthTime' } };
  }

  const profile = {
    birthDate: toDbDate(data.birthDate),
    birthTime,
    birthTimeKnown: data.birthTimeKnown,
    placeName: data.placeName,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    birthUtc,
    natalChart: computeNatalChart({
      birthUtc,
      latitude: data.latitude,
      longitude: data.longitude,
      timeKnown: data.birthTimeKnown,
      birthDate: data.birthDate,
      birthTz: data.timezone,
    }) as unknown as Prisma.InputJsonValue,
    chartComputedAt: new Date(),
  };

  const userId = session.user.id;
  const existing = await db.user.findUnique({ where: { id: userId }, select: { onboardedAt: true } });

  await db.$transaction([
    db.birthProfile.upsert({
      where: { userId },
      create: { userId, ...profile },
      update: profile,
    }),
    db.user.update({
      where: { id: userId },
      // Na edição posterior (/onboarding?edit=1) mantém o fuso e o hemisfério escolhidos nas definições.
      data: existing?.onboardedAt
        ? {}
        : { timezone: userTimezone, hemisphere: guessHemisphere(userTimezone), onboardedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
