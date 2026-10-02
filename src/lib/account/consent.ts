import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

/**
 * Consentimento explícito para dados de bem-estar (humor, sono, peso). Sem ele, esses campos ficam
 * desactivados e o progresso do dia e as estatísticas ignoram-nos. Uma leitura por pedido.
 */
export const hasWellbeingConsent = cache(async (userId: string): Promise<boolean> => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { wellbeingConsentAt: true } });
  return !!user?.wellbeingConsentAt;
});
