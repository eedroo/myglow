import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LEGAL_VERSION } from '@/lib/env';

vi.mock('server-only', () => ({}));
const { getLegalDocument, parseLegal } = await import('./content');

describe('documentos legais', () => {
  for (const doc of ['privacy', 'terms'] as const) {
    for (const locale of ['pt-PT', 'pt-BR', 'en'] as const) {
      it(`${doc} ${locale}: versão, data, rascunho, Onda e contacto`, () => {
        const d = getLegalDocument(doc, locale);
        expect(d.version).toBe(DEFAULT_LEGAL_VERSION);
        expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(d.draft?.type).toBe('quote');
        const text = JSON.stringify(d.blocks);
        expect(text).toContain('Onda');
        expect(text).not.toContain('Onda Digital');
        expect(text).toContain('privacidade@onda.work');
        // Único marcador por preencher: dias de retenção das cópias de segurança.
        expect([...new Set(text.match(/\{\{[A-Z_]+\}\}/g) ?? [])]).toEqual(doc === 'privacy' ? ['{{DIAS_BACKUP}}'] : []);
        expect(d.blocks.filter((b) => b.type === 'heading' && b.level === 2).length).toBeGreaterThanOrEqual(10);
      });
    }
  }

  it('parseLegal lê o cabeçalho', () => {
    const d = parseLegal('version: 2027-01\ndate: 2027-01-05\n\n> Rascunho\n\n# T\n\nTexto');
    expect(d).toMatchObject({ version: '2027-01', date: '2027-01-05' });
    expect(d.blocks[0]).toEqual({ type: 'heading', level: 1, text: 'T' });
  });
});
