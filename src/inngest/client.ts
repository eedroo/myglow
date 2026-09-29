import { EventSchemas, Inngest } from 'inngest';
import type { Locale, SignContentKind, UserContentKind, ZodiacSign } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import type { UserJob } from '@/lib/ai/schedule';

/** Cliente Inngest. Toda a geração IA corre em funções Inngest — nunca num request de página. */
type Events = {
  'ai/sign.generate': { data: { kind: SignContentKind; periodStart: DateISO; sign: ZodiacSign; locale: Locale } };
  'ai/user.generate': { data: { userId: string; kind: UserContentKind; periodStart: DateISO; locale: Locale } };
};

export const inngest = new Inngest({ id: 'myglow', schemas: new EventSchemas().fromRecord<Events>() });

export type SignGenerateEvent = { name: 'ai/sign.generate'; data: Events['ai/sign.generate']['data'] };
export type UserGenerateEvent = { name: 'ai/user.generate'; data: Events['ai/user.generate']['data'] };

const LOCALES: Locale[] = ['PT_PT', 'PT_BR', 'EN'];

/** 12 signos × 3 línguas para um período. */
export function signFanOut(kind: SignContentKind, periodStart: DateISO): SignGenerateEvent[] {
  return ZODIAC_ORDER.flatMap((sign) =>
    LOCALES.map((locale) => ({ name: 'ai/sign.generate' as const, data: { kind, periodStart, sign, locale } })),
  );
}

export function userEvents(userId: string, locale: Locale, jobs: UserJob[]): UserGenerateEvent[] {
  return jobs.map((j) => ({ name: 'ai/user.generate' as const, data: { userId, locale, ...j } }));
}

/**
 * Envia eventos sem nunca falhar o request que os disparou (a geração é assíncrona e best-effort;
 * sem Inngest configurado em desenvolvimento, só regista o aviso; com o dev server local usar `INNGEST_DEV=1`).
 */
export async function sendSafely(events: (SignGenerateEvent | UserGenerateEvent)[]): Promise<boolean> {
  if (!events.length) return true;
  if (!process.env.INNGEST_EVENT_KEY && !process.env.INNGEST_DEV) {
    console.warn('[inngest] Sem INNGEST_EVENT_KEY nem INNGEST_DEV: eventos não enviados.');
    return false;
  }
  try {
    await inngest.send(events);
    return true;
  } catch (err) {
    console.warn('[inngest] Falha ao enviar eventos:', err instanceof Error ? err.message : err);
    return false;
  }
}
