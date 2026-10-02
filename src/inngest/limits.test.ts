import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * O plano do Inngest aceita no máximo concorrência 5 por função: acima disso o sync da app falha e
 * NENHUMA função nova fica registada (foi o que deixou os lembretes sem envio).
 */
const PLAN_CONCURRENCY_LIMIT = 5;
const dir = path.join(__dirname, 'functions');

describe('funções Inngest', () => {
  it(`concorrência ≤ ${PLAN_CONCURRENCY_LIMIT} (limite do plano)`, () => {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const m of src.matchAll(/concurrency:\s*\{\s*limit:\s*(\d+)/g)) {
        expect(Number(m[1]), file).toBeLessThanOrEqual(PLAN_CONCURRENCY_LIMIT);
      }
    }
  });
});
