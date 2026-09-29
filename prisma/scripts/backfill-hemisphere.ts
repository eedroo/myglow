/**
 * Define `User.hemisphere` a partir do fuso para utilizadores existentes (Fase 4).
 * Só altera quem ainda está no valor por defeito (NORTH) e tem um fuso do Sul.
 * Uso: npx tsx prisma/scripts/backfill-hemisphere.ts
 */
import { PrismaClient } from '@prisma/client';
import { guessHemisphere } from '../../src/lib/hemisphere';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ where: { hemisphere: 'NORTH' }, select: { id: true, timezone: true } });
  const south = users.filter((u) => guessHemisphere(u.timezone) === 'SOUTH');
  for (const u of south) {
    await db.user.update({ where: { id: u.id }, data: { hemisphere: 'SOUTH' } });
  }
  console.log(`Hemisfério: ${south.length} de ${users.length} utilizadores passaram para SOUTH.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
