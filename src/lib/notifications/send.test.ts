import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => {
  class WebPushError extends Error {
    constructor(public statusCode: number) {
      super(`status ${statusCode}`);
    }
  }
  return {
    WebPushError,
    sendNotification: vi.fn(),
    logs: [] as { id: string; userId: string; kind: string; periodKey: string; pushed: boolean }[],
    subs: [] as { id: string; userId: string; endpoint: string; p256dh: string; auth: string }[],
  };
});

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: m.sendNotification },
  WebPushError: m.WebPushError,
}));

vi.mock('@/lib/db', () => ({
  db: {
    notificationLog: {
      create: vi.fn(async ({ data }) => {
        if (m.logs.some((l) => l.userId === data.userId && l.kind === data.kind && l.periodKey === data.periodKey)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
        }
        const row = { id: `l${m.logs.length + 1}`, pushed: false, ...data };
        m.logs.push(row);
        return { id: row.id };
      }),
      update: vi.fn(async ({ where, data }) => Object.assign(m.logs.find((l) => l.id === where.id)!, data)),
    },
    pushSubscription: {
      findMany: vi.fn(async ({ where }) => m.subs.filter((s) => s.userId === where.userId)),
      deleteMany: vi.fn(async ({ where }) => {
        m.subs = m.subs.filter((s) => s.id !== where.id);
        return { count: 1 };
      }),
    },
  },
}));

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub';
process.env.VAPID_PRIVATE_KEY = 'priv';
process.env.VAPID_SUBJECT = 'mailto:teste@example.com';

const { deliver } = await import('./send');

const n = { kind: 'MORNING' as const, periodKey: '2026-05-06', title: 'Bom dia', body: 'Intenção?', url: '/today' };
const sub = (id: string) => ({ id, userId: 'u1', endpoint: `https://push.example.com/${id}`, p256dh: 'k', auth: 'a' });

describe('deliver', () => {
  beforeEach(() => {
    m.logs = [];
    m.subs = [];
    m.sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
  });

  it('envia e marca pushed; o segundo com o mesmo periodKey é duplicate e não envia', async () => {
    m.subs = [sub('s1')];
    expect(await deliver('u1', n)).toBe('sent');
    expect(m.logs[0]!.pushed).toBe(true);
    expect(await deliver('u1', n)).toBe('duplicate');
    expect(m.sendNotification).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(m.sendNotification.mock.calls[0]![1]);
    expect(payload).toMatchObject({ title: 'Bom dia', url: '/today', tag: 'MORNING', icon: '/icons/icon-192.png' });
    expect(m.sendNotification.mock.calls[0]![2]).toMatchObject({ TTL: 4 * 3600 });
  });

  it('410 apaga a subscrição; se nenhum envio resultar fica inbox-only', async () => {
    m.subs = [sub('s1')];
    m.sendNotification.mockRejectedValueOnce(new m.WebPushError(410));
    expect(await deliver('u1', n)).toBe('inbox-only');
    expect(m.subs).toEqual([]);
    expect(m.logs).toHaveLength(1);
    expect(m.logs[0]!.pushed).toBe(false);
  });

  it('com um dispositivo a falhar e outro ok → sent; o que falhou (500) mantém-se', async () => {
    m.subs = [sub('s1'), sub('s2')];
    m.sendNotification.mockRejectedValueOnce(new m.WebPushError(500));
    expect(await deliver('u1', n)).toBe('sent');
    expect(m.subs).toHaveLength(2);
  });

  it('sem subscrições → inbox-only e fica no log', async () => {
    expect(await deliver('u1', n)).toBe('inbox-only');
    expect(m.logs).toHaveLength(1);
    expect(m.sendNotification).not.toHaveBeenCalled();
  });
});
