import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: {} }));

const { tryCreate } = await import('./award');

/**
 * `tryCreate` usa `INSERT … ON CONFLICT DO NOTHING`: aqui o `$queryRaw` é simulado com a mesma unique
 * (userId, source, periodStart, refId), e verifica-se que o SQL a usa.
 */
function fakeTx() {
  const rows = new Set<string>();
  const sql: string[] = [];
  const $queryRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    sql.push(strings.join('?'));
    const [id, userId, source, periodStart, refId] = values;
    const key = [userId, source, periodStart, refId].join('|');
    if (rows.has(key)) return [];
    rows.add(key);
    return [{ id }];
  });
  return { tx: { $queryRaw } as never, sql };
}

describe('tryCreate (refId)', () => {
  it('dois COURSE_COMPLETE no mesmo dia com refId diferentes → ambos criados', async () => {
    const { tx, sql } = fakeTx();
    const c = { source: 'COURSE_COMPLETE' as const, periodStart: '2026-10-01', points: 100 };
    expect(await tryCreate(tx, 'u1', { ...c, refId: 'vida-magica' })).toBe(true);
    expect(await tryCreate(tx, 'u1', { ...c, refId: 'rituais' })).toBe(true);
    expect(sql[0]).toContain('ON CONFLICT ("userId", "source", "periodStart", "refId") DO NOTHING');
  });

  it('o mesmo refId duas vezes → um só', async () => {
    const { tx } = fakeTx();
    const c = { source: 'COURSE_COMPLETE' as const, periodStart: '2026-10-01', points: 100, refId: 'vida-magica' };
    expect(await tryCreate(tx, 'u1', c)).toBe(true);
    expect(await tryCreate(tx, 'u1', c)).toBe(false);
  });

  it('fontes sem refId usam "" (comportamento anterior)', async () => {
    const { tx } = fakeTx();
    const c = { source: 'DAY_MORNING' as const, periodStart: '2026-10-01', points: 10 };
    expect(await tryCreate(tx, 'u1', c)).toBe(true);
    expect(await tryCreate(tx, 'u1', c)).toBe(false);
  });
});
