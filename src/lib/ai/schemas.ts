import { z } from 'zod';
import { ProjectArea } from '@prisma/client';

/** Esquemas de saída da IA (Zod). Validação estrutural; a semântica vive em `validate.ts`. */
// O prompt pede `max` caracteres; aceita-se até +25% para não deitar fora uma boa leitura por poucas letras
// (com descrições mais ricas, as duas tentativas chegavam a falhar só pelo tamanho).
export const LENGTH_TOLERANCE = 1.25;
const text = (max: number) => z.string().min(1).max(Math.ceil(max * LENGTH_TOLERANCE));

export const dayHoroscopeSchema = z.object({
  headline: text(80),
  energy: text(450),
  advice: text(220),
  keywords: z.array(text(24)).length(3),
  crystal: z.object({ name: text(40), why: text(140) }),
});

export const dayPersonalSchema = z.object({
  headline: text(80),
  reading: text(650),
  transits: z.array(z.object({ label: z.string(), meaning: text(180) })).max(3),
  // Desde a v3 a leitura pessoal traz as palavras-chave e o cristal (o horóscopo do signo deixou de existir no dia).
  keywords: z.array(text(24)).length(3),
  crystal: z.object({ name: text(40), why: text(140) }),
  intentionSuggestion: text(120),
  banishSuggestion: text(120),
  reflectionQuestion: text(140),
});

/** Leitura (UI e avisos): aceita também leituras anteriores à v3, sem palavras-chave nem cristal. */
export const dayPersonalReadSchema = dayPersonalSchema.extend({
  keywords: dayPersonalSchema.shape.keywords.optional(),
  crystal: dayPersonalSchema.shape.crystal.optional(),
});

export const weekEnergySchema = z.object({
  headline: text(80),
  overview: text(650),
  highlights: z.array(z.object({ date: z.string(), note: text(160) })).max(4),
});

export const weekPersonalSchema = z.object({
  headline: text(80),
  reading: text(850),
  focusAreas: z.array(z.object({ area: z.nativeEnum(ProjectArea), note: text(160) })).max(3),
});

export const monthEnergySchema = z.object({
  headline: text(80),
  overview: text(950),
  keyDates: z.array(z.object({ date: z.string(), note: text(180) })).max(6),
});

export const monthPersonalSchema = z.object({
  headline: text(80),
  reading: text(1100),
  focusAreas: z.array(z.object({ area: z.nativeEnum(ProjectArea), note: text(180) })).max(3),
});

export const ritualSchema = z.object({
  id: z.string(), // slug gerado pelo código após a resposta (o da IA é ignorado)
  title: text(60),
  date: z.string(), // DateISO — tem de ser uma das datas-chave fornecidas
  occasion: text(60),
  intention: text(160),
  /** v5: porque este ritual nesta data (o evento e o signo), em linguagem simples. Opcional só na leitura (rituais antigos). */
  why: text(260).optional(),
  /** v5: porque estes materiais (correspondências tradicionais de cor, elemento, planeta). */
  materialsWhy: text(200).optional(),
  area: z.nativeEnum(ProjectArea),
  durationMinutes: z.number().int().min(5).max(90),
  materials: z.array(text(60)).max(6),
  steps: z.array(text(220)).min(3).max(7),
  safety: text(200),
});

/** Geração: o "porquê" do ritual é obrigatório (o dos materiais só quando há materiais). */
const ritualGenSchema = ritualSchema.extend({ why: text(260) }).refine((r) => r.materials.length === 0 || !!r.materialsWhy, {
  message: 'materialsWhy is required when there are materials',
});

export const monthRitualsSchema = z.object({ rituals: z.array(ritualGenSchema).min(3).max(5) });
const monthRitualsReadSchema = z.object({ rituals: z.array(ritualSchema).min(3).max(5) });

export type DayHoroscope = z.infer<typeof dayHoroscopeSchema>;
export type DayPersonal = z.infer<typeof dayPersonalSchema>;
export type DayPersonalView = z.infer<typeof dayPersonalReadSchema>;
export type WeekEnergy = z.infer<typeof weekEnergySchema>;
export type WeekPersonal = z.infer<typeof weekPersonalSchema>;
export type MonthEnergy = z.infer<typeof monthEnergySchema>;
export type MonthPersonal = z.infer<typeof monthPersonalSchema>;
export type Ritual = z.infer<typeof ritualSchema>;
export type MonthRituals = z.infer<typeof monthRitualsReadSchema>;

export const SIGN_SCHEMAS = {
  DAY_HOROSCOPE: dayHoroscopeSchema,
  WEEK_ENERGY: weekEnergySchema,
  MONTH_ENERGY: monthEnergySchema,
} as const;

export const USER_SCHEMAS = {
  DAY_PERSONAL: dayPersonalSchema,
  WEEK_PERSONAL: weekPersonalSchema,
  MONTH_PERSONAL: monthPersonalSchema,
  MONTH_RITUALS: monthRitualsSchema,
} as const;

/** Esquemas para ler o que está gravado (mais tolerantes que os de geração). */
export const USER_READ_SCHEMAS = { ...USER_SCHEMAS, DAY_PERSONAL: dayPersonalReadSchema, MONTH_RITUALS: monthRitualsReadSchema } as const;

/**
 * Versão "de fio" enviada à OpenAI (structured outputs em modo estrito): sem limites de comprimento
 * nas strings, que o modo estrito não aceita. Os limites de arrays e números mantêm-se; os de texto
 * são pedidos no prompt e verificados depois com o esquema completo.
 */
export function wireSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodString) return z.string();
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    return z.object(Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, wireSchema(v)])));
  }
  if (schema instanceof z.ZodArray) {
    const def = schema._def;
    let out = z.array(wireSchema(def.type));
    if (def.exactLength) out = out.length(def.exactLength.value);
    if (def.minLength) out = out.min(def.minLength.value);
    if (def.maxLength) out = out.max(def.maxLength.value);
    return out;
  }
  return schema;
}
