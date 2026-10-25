import { z } from 'zod';
import { PROJECT_AREAS } from '@/types/week';

/**
 * Saída do Guia (F14). Na geração vai a versão de fio (`wireSchema`: sem limites de texto, todos os campos
 * obrigatórios); aqui fica o esquema completo, validado antes de gravar e ao ler.
 */
export const evidenceSchema = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(4); // datas em que se baseia

const areaSchema = z.enum(PROJECT_AREAS as [(typeof PROJECT_AREAS)[number], ...(typeof PROJECT_AREAS)[number][]]);

export const guideReportSchema = z.object({
  opening: z.string().min(40).max(320),
  continue: z.array(z.object({ title: z.string().max(60), detail: z.string().max(260), evidence: evidenceSchema })).min(1).max(3),
  improve: z.array(z.object({ title: z.string().max(60), detail: z.string().max(260), evidence: evidenceSchema })).min(1).max(3),
  patterns: z.array(z.object({ text: z.string().max(240), evidence: evidenceSchema })).max(3),
  areas: z
    .array(z.object({ area: areaSchema, status: z.enum(['aligned', 'partial', 'not_yet']), observed: z.string().max(240) }))
    .max(5),
  focuses: z.array(z.object({ title: z.string().max(60), why: z.string().max(200), action: z.string().max(140) })).length(3),
  encouragement: z.string().min(40).max(320),
  safety: z.object({ distress: z.boolean() }), // o modelo marca true se ler sinais de sofrimento sério
});

export type GuideReportPayload = z.infer<typeof guideReportSchema>;
export type GuideAreaStatus = GuideReportPayload['areas'][number]['status'];
