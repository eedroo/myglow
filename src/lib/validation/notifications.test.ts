import { describe, expect, it } from 'vitest';
import { notificationPrefsSchema } from './notifications';

const base = {
  enabled: true, morningEnabled: true, bodyEnabled: true, nightEnabled: true,
  morningTime: '08:00', bodyTime: '13:00', nightTime: '21:30',
  weekStart: true, weekEnd: true, monthStart: true, monthEnd: true, lastCall: true,
};

describe('notificationPrefsSchema', () => {
  it('aceita horas em passos de 15 min', () => {
    expect(notificationPrefsSchema.safeParse({ ...base, morningTime: '07:45' }).success).toBe(true);
    expect(notificationPrefsSchema.safeParse({ ...base, nightTime: '23:45' }).success).toBe(true);
  });

  it('rejeita horas fora dos passos e campos a mais', () => {
    expect(notificationPrefsSchema.safeParse({ ...base, morningTime: '07:50' }).success).toBe(false);
    expect(notificationPrefsSchema.safeParse({ ...base, bodyTime: '24:00' }).success).toBe(false);
    expect(notificationPrefsSchema.safeParse({ ...base, userId: 'x' }).success).toBe(false);
  });
});
