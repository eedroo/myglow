import { describe, expect, it } from 'vitest';
import { zodResponseFormat } from 'openai/helpers/zod';
import valid from '../../../tests/fixtures/ai/day-personal.valid.json';
import ritualsValid from '../../../tests/fixtures/ai/month-rituals.valid.json';
import {
  dayPersonalReadSchema, dayPersonalSchema, ritualGenSchema, SIGN_SCHEMAS, USER_READ_SCHEMAS, USER_SCHEMAS, wireSchema,
} from './schemas';
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

  it('prompts pedem linguagem simples (sem termos técnicos soltos) e título directo (v6)', () => {
    const sys = systemPrompt('PT_BR', 'NEUTRAL');
    expect(sys).toMatch(/Plain language first/);
    // Vocabulário já na língua de saída (em inglês a IA copiava as expressões para o texto).
    expect(sys).toContain('quadratura → "uma tensão que pede ajuste"');
    expect(sys).toContain('o jeito como você se mostra ao mundo');
    expect(sys).not.toMatch(/friendly support|easy flow/);
    expect(sys).toMatch(/Never use em dashes/);
    expect(systemPrompt('PT_PT')).toContain('a forma como te mostras ao mundo');
    const p = buildDayPersonal({} as never, 'PT_BR');
    expect(p.user).toMatch(/verdict or a direct instruction/);
    // Exemplos de tom já na língua de saída (nunca em inglês para PT).
    expect(p.user).toContain('Nem toda mensagem merece resposta hoje.');
    expect(p.user).not.toContain('Not every message');
    expect(p.user).toMatch(/Avoid generic formulas/);
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

describe('esquemas de geração aceites pela API (modo estrito)', () => {
  it('todos convertem com zodResponseFormat (sem campos opcionais)', () => {
    for (const [kind, schema] of Object.entries({ ...SIGN_SCHEMAS, ...USER_SCHEMAS })) {
      expect(() => zodResponseFormat(wireSchema(schema), kind.toLowerCase()), kind).not.toThrow();
    }
  });

  it('rituais: materialsWhy pode vir null na geração; antigos sem ele continuam a ler-se', () => {
    const r = { ...ritualsValid.rituals[0]!, id: 'x', materialsWhy: null };
    expect(ritualGenSchema.safeParse(r).success).toBe(true);
    const { materialsWhy: _m, why: _w, ...old } = ritualsValid.rituals[0]!;
    expect(USER_READ_SCHEMAS.MONTH_RITUALS.safeParse({ rituals: [old, old, old] }).success).toBe(true);
  });
});
