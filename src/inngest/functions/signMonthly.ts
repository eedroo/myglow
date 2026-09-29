import { inngest, signFanOut } from '../client';
import { nextSignPeriod } from '@/lib/ai/schedule';

/** Energia do mês seguinte (dia 20): 12 signos × 3 línguas. */
export const signMonthly = inngest.createFunction(
  { id: 'sign-monthly' },
  { cron: '0 6 20 * *' },
  async ({ step }) => {
    const periodStart = await step.run('period', () => nextSignPeriod('MONTH_ENERGY', new Date()));
    const events = signFanOut('MONTH_ENERGY', periodStart);
    await step.sendEvent('fan-out', events);
    return { periodStart, events: events.length };
  },
);
