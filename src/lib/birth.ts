import { DateTime } from 'luxon';

/** Converte data+hora local de nascimento no instante UTC, usando o fuso histórico IANA. */
export function toBirthUtc(birthDate: string, birthTime: string | null, timezone: string): Date {
  const dt = DateTime.fromISO(`${birthDate}T${birthTime ?? '12:00'}`, { zone: timezone }).toUTC();
  if (!dt.isValid) {
    throw new Error(`Invalid birth date/time: ${dt.invalidReason ?? 'unknown'} (${dt.invalidExplanation ?? ''})`);
  }
  return dt.toJSDate();
}
