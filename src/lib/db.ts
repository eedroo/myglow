import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';

/** Singleton Prisma (evita múltiplas ligações em hot reload). Só no servidor. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/** Erro por o utilizador já não existir (conta apagada a meio de um job): chave estrangeira ou registo em falta. */
export function isUserGoneError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2025');
}
