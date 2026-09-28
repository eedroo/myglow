import 'server-only';
import { PrismaClient } from '@prisma/client';

/** Singleton Prisma (evita múltiplas ligações em hot reload). Só no servidor. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
