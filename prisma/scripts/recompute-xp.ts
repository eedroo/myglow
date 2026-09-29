/**
 * Recalcula `User.xpTotal` e `User.bestMagicStreak` a partir do ledger `XpEvent` (fonte de verdade).
 * Uso: npx tsx prisma/scripts/recompute-xp.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';
import { fromDbDate } from '../../src/lib/dates';
import { DAY_SOURCES } from '../../src/lib/xp/rules';
import { bestRun } from '../../src/lib/xp/streak';

const db = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const users = await db.user.findMany({ select: { id: true, email: true, xpTotal: true, bestMagicStreak: true } });
  let changed = 0;

  for (const u of users) {
    const [sum, dayEvents] = await Promise.all([
      db.xpEvent.aggregate({ where: { userId: u.id }, _sum: { points: true } }),
      db.xpEvent.findMany({
        where: { userId: u.id, source: { in: [...DAY_SOURCES] } },
        select: { periodStart: true },
        distinct: ['periodStart'],
      }),
    ]);
    const total = sum._sum.points ?? 0;
    const best = Math.max(u.bestMagicStreak, bestRun(dayEvents.map((e) => fromDbDate(e.periodStart))));
    if (total !== u.xpTotal || best !== u.bestMagicStreak) {
      changed++;
      console.log(`${u.email}: xpTotal ${u.xpTotal} → ${total}, bestMagicStreak ${u.bestMagicStreak} → ${best}`);
      if (!dryRun) await db.user.update({ where: { id: u.id }, data: { xpTotal: total, bestMagicStreak: best } });
    }
  }
  console.log(`${changed} de ${users.length} utilizadores ${dryRun ? 'a corrigir (dry run)' : 'corrigidos'}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
