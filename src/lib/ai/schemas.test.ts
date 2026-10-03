import { describe, expect, it } from 'vitest';
import valid from '../../../tests/fixtures/ai/day-personal.valid.json';
import { dayPersonalReadSchema, dayPersonalSchema } from './schemas';
import { systemPrompt } from './prompts/system';
import { build as buildDayPersonal } from './prompts/dayPersonal';
import { currentSignJobs } from './schedule';

describe('leitura pessoal do dia (v3)', () => {
  const { keywords: _k, crystal: _c, ...old } = valid;

  it('gera com palavras-chave e cristal; lê também leituras antigas sem eles', () => {
    expect(dayPersonalSchema.safeParse(valid).success).toBe(true);
    expect(dayPersonalSchema.safeParse(old).success).toBe(false);
    expect(dayPersonalReadSchema.safeParse(old).success).toBe(true);
    expect(dayPersonalSchema.safeParse({ ...valid, keywords: ['a', 'b'] }).success).toBe(false);
  });

  it('prompts pedem linguagem simples (sem termos técnicos soltos) e título poético', () => {
    const sys = systemPrompt('PT_BR', 'NEUTRAL');
    expect(sys).toMatch(/Plain language first/);
    // Vocabulário já na língua de saída (em inglês a IA copiava as expressões para o texto).
    expect(sys).toContain('quadratura → "uma tensão que pede ajuste"');
    expect(sys).toContain('o jeito como você se mostra ao mundo');
    expect(sys).not.toMatch(/friendly support|easy flow/);
    expect(sys).toMatch(/Never use em dashes/);
    expect(systemPrompt('PT_PT')).toContain('a forma como te mostras ao mundo');
    const p = buildDayPersonal({} as never, 'PT_BR');
    expect(p.user).toMatch(/poetic, image-based title/);
    expect(p.user).toMatch(/keywords: exactly 3/);
    expect(p.user).toMatch(/crystal:/);
  });

  it('só o mês continua a ter conteúdo por signo', () => {
    expect(currentSignJobs(new Date('2026-10-03T12:00:00Z'))).toEqual([{ kind: 'MONTH_ENERGY', periodStart: '2026-10-01' }]);
  });
});

describe('tolerância de tamanho', () => {
  it('aceita até +25% do pedido no prompt', () => {
    expect(dayPersonalSchema.safeParse({ ...valid, reading: 'a'.repeat(800) }).success).toBe(true);
    expect(dayPersonalSchema.safeParse({ ...valid, reading: 'a'.repeat(900) }).success).toBe(false);
  });
});
