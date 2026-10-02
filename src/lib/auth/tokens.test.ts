import { beforeEach, describe, expect, it, vi } from 'vitest';

/** DB simulada (só o que tokens.ts usa), para testar as regras sem Postgres. */
vi.mock('server-only', () => ({}));

interface Row {
  id: string; userId: string; type: string; tokenHash: string; newEmail: string | null;
  expiresAt: Date; usedAt: Date | null; createdAt: Date;
}
const rows: Row[] = [];
let seq = 0;

const authToken = {
  deleteMany: vi.fn(async ({ where }: { where: { userId: string; type: string } }) => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.userId === where.userId && rows[i]!.type === where.type) rows.splice(i, 1);
    return { count: 0 };
  }),
  create: vi.fn(async ({ data }: { data: Omit<Row, 'id' | 'usedAt' | 'createdAt'> }) => {
    const row = { ...data, id: `t${++seq}`, usedAt: null, createdAt: new Date() };
    rows.push(row);
    return row;
  }),
  findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => rows.find((r) => r.tokenHash === where.tokenHash) ?? null),
  updateMany: vi.fn(async ({ where, data }: { where: { id: string; usedAt: null }; data: { usedAt: Date } }) => {
    const row = rows.find((r) => r.id === where.id && r.usedAt === null);
    if (!row) return { count: 0 };
    row.usedAt = data.usedAt;
    return { count: 1 };
  }),
};

vi.mock('@/lib/db', () => ({
  db: {
    authToken,
    $transaction: async (arg: unknown) => (typeof arg === 'function' ? arg({ authToken }) : Promise.all(arg as Promise<unknown>[])),
  },
}));

const { consumeAuthToken, createAuthToken, generateToken, hashToken } = await import('./tokens');

describe('tokens de email', () => {
  beforeEach(() => {
    rows.length = 0;
    vi.useRealTimers();
  });

  it('o hash é diferente do valor em claro e só o hash é guardado', async () => {
    const { raw, hash } = generateToken();
    expect(hash).not.toBe(raw);
    expect(hash).toBe(hashToken(raw));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Buffer.from(raw, 'base64url')).toHaveLength(32);

    const created = await createAuthToken('u1', 'EMAIL_VERIFY');
    expect(rows[0]!.tokenHash).toBe(hashToken(created));
    expect(JSON.stringify(rows)).not.toContain(created);
  });

  it('consumido duas vezes → o segundo é null', async () => {
    const raw = await createAuthToken('u1', 'PASSWORD_RESET');
    expect(await consumeAuthToken(raw, 'PASSWORD_RESET')).toMatchObject({ userId: 'u1' });
    expect(await consumeAuthToken(raw, 'PASSWORD_RESET')).toBeNull();
  });

  it('expirado → null', async () => {
    const raw = await createAuthToken('u1', 'PASSWORD_RESET');
    vi.useFakeTimers({ now: Date.now() + 3601 * 1000 });
    expect(await consumeAuthToken(raw, 'PASSWORD_RESET')).toBeNull();
  });

  it('tipo errado → null', async () => {
    const raw = await createAuthToken('u1', 'EMAIL_VERIFY');
    expect(await consumeAuthToken(raw, 'PASSWORD_RESET')).toBeNull();
    expect(await consumeAuthToken('inexistente', 'EMAIL_VERIFY')).toBeNull();
  });

  it('criar um token novo apaga o anterior do mesmo tipo (e mantém os de outros tipos)', async () => {
    const first = await createAuthToken('u1', 'EMAIL_CHANGE', 'novo@example.com');
    const verify = await createAuthToken('u1', 'EMAIL_VERIFY');
    const second = await createAuthToken('u1', 'EMAIL_CHANGE', 'outro@example.com');
    expect(await consumeAuthToken(first, 'EMAIL_CHANGE')).toBeNull();
    expect(await consumeAuthToken(second, 'EMAIL_CHANGE')).toMatchObject({ newEmail: 'outro@example.com' });
    expect(await consumeAuthToken(verify, 'EMAIL_VERIFY')).not.toBeNull();
  });
});
