import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';
import type { Locale } from '@prisma/client';
import { buildEmail, type EmailInput } from '@/emails';

const LOCALES: Locale[] = ['PT_PT', 'PT_BR', 'EN'];
const base = { name: 'Ana', appUrl: 'https://myglow.example' };
const url = 'https://myglow.example/verify-email?token=abc123';

const CASES: ({ kind: EmailInput['kind'] } & Record<string, string>)[] = [
  { kind: 'verify', url },
  { kind: 'reset', url },
  { kind: 'email-change-confirm', url, newEmail: 'novo@example.com' },
  { kind: 'email-changed-notice', newEmail: 'novo@example.com' },
  { kind: 'password-changed' },
  { kind: 'account-deleted' },
];

describe('templates de email', () => {
  for (const locale of LOCALES) {
    it.each(CASES.map((c) => [c.kind, c] as const))(`${locale} %s: assunto, título e botão`, async (_kind, c) => {
      const { subject, react } = buildEmail({ ...base, locale, ...c } as EmailInput);
      expect(subject.length).toBeGreaterThan(5);
      const html = await render(react);
      expect(html).toContain('MYGLOW');
      expect(html).toContain(`lang="${locale === 'PT_PT' ? 'pt-PT' : locale === 'PT_BR' ? 'pt-BR' : 'en'}"`);
      expect(html).not.toMatch(/emails\.\w+\.\w+/); // nenhuma chave i18n por traduzir
      if ('url' in c) {
        expect(html).toContain(`href="${url}"`);
      }
      if ('newEmail' in c) expect(html).toContain('novo@example.com');
      const text = await render(react, { plainText: true });
      expect(text.length).toBeGreaterThan(40);
    });
  }

  it('textos nativos: pt-PT usa palavra-passe, pt-BR usa senha', async () => {
    const pt = await render(buildEmail({ ...base, locale: 'PT_PT', kind: 'reset', url }).react);
    const br = await render(buildEmail({ ...base, locale: 'PT_BR', kind: 'reset', url }).react);
    expect(pt).toContain('palavra-passe');
    expect(br).toContain('senha');
  });
});
