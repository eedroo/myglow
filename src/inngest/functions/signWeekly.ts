import { inngest, signFanOut } from '../client';
import { nextSignPeriod } from '@/lib/ai/schedule';

/** Energia da semana que começa no domingo seguinte (à quinta): 12 signos × 3 línguas. */
export const signWeekly = inngest.createFunction(
  { id: 'sign-weekly' },
  { cron: '0 6 * * 4' },
  async ({ step }) => {
    const periodStart = await step.run('period', () => nextSignPeriod('WEEK_ENERGY', new Date()));
    const events = signFanOut('WEEK_ENERGY', periodStart);
    await step.sendEvent('fan-out', events);
    return { periodStart, events: events.length };
  },
);
