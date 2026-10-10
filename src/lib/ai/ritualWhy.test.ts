import { describe, expect, it } from 'vitest';
import ritualsValid from '../../../tests/fixtures/ai/month-rituals.valid.json';
import { monthRitualsSchema, USER_READ_SCHEMAS } from './schemas';
import { minPromptVersion, PROMPT_VERSION } from './prompts/system';

const withoutWhy = {
  rituals: ritualsValid.rituals.map(({ why: _why, materialsWhy: _m, ...r }) => r),
};

describe('porquê dos rituais (v5)', () => {
  it('a geração exige o porquê do ritual', () => {
    expect(monthRitualsSchema.safeParse(ritualsValid).success).toBe(true);
    expect(monthRitualsSchema.safeParse(withoutWhy).success).toBe(false);
  });

  it('sem o porquê dos materiais o mês não é rejeitado', () => {
    const noMaterialsWhy = { rituals: ritualsValid.rituals.map(({ materialsWhy: _m, ...r }) => r) };
    expect(monthRitualsSchema.safeParse(noMaterialsWhy).success).toBe(true);
  });

  it('rituais antigos (sem porquê) continuam a ler-se', () => {
    expect(USER_READ_SCHEMAS.MONTH_RITUALS.safeParse(withoutWhy).success).toBe(true);
  });

  it('só os rituais exigem a versão nova; as leituras v4 continuam válidas', () => {
    expect(minPromptVersion('MONTH_RITUALS')).toBe(PROMPT_VERSION);
    for (const kind of ['DAY_PERSONAL', 'WEEK_PERSONAL', 'MONTH_PERSONAL', 'MONTH_ENERGY']) expect(minPromptVersion(kind)).toBe(4);
  });
});
