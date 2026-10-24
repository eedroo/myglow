import { describe, expect, it } from 'vitest';
import { scrubEvent } from './scrub';

describe('scrubEvent', () => {
  it('tira corpo, cookies, email e texto do diário; mantém o id', () => {
    const event = scrubEvent({
      request: {
        data: { intention: 'segredo' },
        cookies: { session: 'x' },
        headers: { Cookie: 'a=b', Authorization: 'Bearer y', 'user-agent': 'ua' },
        query_string: 'token=abc&x=1',
        url: 'https://myglow.onda.work/verify?token=abc',
      },
      user: { id: 'u1', email: 'eu@x.pt', username: 'Eu', ip_address: '1.2.3.4' },
      extra: { reflection: 'hoje…', count: 2, nested: { note: 'x', ok: true } },
      contexts: { form: { gratitude: 'obrigado', step: 3 } },
    });
    expect(event.request).toEqual({ headers: { 'user-agent': 'ua' }, url: 'https://myglow.onda.work/verify' });
    expect(event.user).toEqual({ id: 'u1' });
    expect(event.extra).toEqual({ count: 2, nested: { ok: true } });
    expect(event.contexts).toEqual({ form: { step: 3 } });
    expect(JSON.stringify(event)).not.toMatch(/eu@x\.pt|segredo|hoje|obrigado|Bearer/);
  });
});
