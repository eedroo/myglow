import { z } from 'zod';

/** Horas em passos de 15 min ("HH:00|15|30|45"). */
export const QUARTER_TIME_RE = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const quarterTime = z.string().regex(QUARTER_TIME_RE);

export const notificationPrefsSchema = z
  .object({
    enabled: z.boolean(),
    morningEnabled: z.boolean(),
    bodyEnabled: z.boolean(),
    nightEnabled: z.boolean(),
    morningTime: quarterTime,
    bodyTime: quarterTime,
    nightTime: quarterTime,
    weekStart: z.boolean(),
    weekEnd: z.boolean(),
    monthStart: z.boolean(),
    monthEnd: z.boolean(),
    lastCall: z.boolean(),
    grimoireEnabled: z.boolean(),
    grimoireTime: quarterTime,
  })
  .strict();

export type NotificationPrefsData = z.infer<typeof notificationPrefsSchema>;

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
