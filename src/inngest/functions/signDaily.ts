import { inngest, signFanOut } from '../client';
import { nextSignPeriod } from '@/lib/ai/schedule';

/** Horóscopo de amanhã (UTC): 12 signos × 3 línguas. */
export const signDaily = inngest.createFunction(
  { id: 'sign-daily' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const periodStart = await step.run('period', () => nextSignPeriod('DAY_HOROSCOPE', new Date()));
    const events = signFanOut('DAY_HOROSCOPE', periodStart);
    await step.sendEvent('fan-out', events);
    return { periodStart, events: events.length };
  },
);
