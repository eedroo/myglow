/**
 * Aviso de fim de descanso (F16): decisão pura do job Inngest. Só envia se o descanso agendado é o mesmo
 * (não foi saltado nem alargado), a sessão continua activa e a app está em segundo plano.
 */
export function shouldSendRestPush(
  session: { restEndsAt: Date | null; endedAt: Date | null; clientHidden: boolean } | null,
  scheduledEndsAt: Date | string,
): boolean {
  if (!session || session.endedAt || !session.restEndsAt || !session.clientHidden) return false;
  return session.restEndsAt.getTime() === new Date(scheduledEndsAt).getTime();
}
