import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { isAdminEmail } = await import('./admin');

describe('isAdminEmail', () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it('lista com espaços e maiúsculas; vazio = ninguém', () => {
    process.env.ADMIN_EMAILS = 'eu@exemplo.com, outro@x.pt';
    expect(isAdminEmail(' Eu@Exemplo.com ')).toBe(true);
    expect(isAdminEmail('OUTRO@x.pt')).toBe(true);
    expect(isAdminEmail('alguem@x.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    process.env.ADMIN_EMAILS = '';
    expect(isAdminEmail('eu@exemplo.com')).toBe(false);
  });
});
