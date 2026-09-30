import { compareDates, type DateISO } from '@/lib/dates';

/** Cookie de "Agora não" do convite de lembretes (14 dias). */
export const PROMPT_DISMISS_COOKIE = 'mg-notify-dismissed';
export const PROMPT_DISMISS_DAYS = 14;

/** O convite aparece a partir do 2.º dia de uso, só em "hoje" e se não foi dispensado. */
export function shouldShowPrompt(i: { firstDay: DateISO; today: DateISO; isToday: boolean; dismissed: boolean }): boolean {
  return i.isToday && !i.dismissed && compareDates(i.firstDay, i.today) < 0;
}
