import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/**
 * Grimório Oculto: o programa (`content/oculto/program.json`) e as semanas (`content/oculto/pt-BR/week-XX.json`),
 * validados. Só em pt-BR. Texto original, baseado nos métodos de Peter J. Carroll (não é transcrição dos livros).
 */
export const OCULTO_DIR = path.join(process.cwd(), 'content', 'oculto');

const text = z.string().min(1);

export const programSchema = z.object({
  id: text,
  title: text,
  subtitle: text,
  phases: z
    .array(z.object({ phase: z.number().int().min(1), title: text, source: text, goal: text, weeks: z.array(z.number().int().min(1)).min(1) }))
    .min(1),
  care: z.array(text).min(1),
});

export const sessionSchema = z.object({
  day: z.number().int().min(1).max(5),
  title: text,
  mainMinutes: z.number().int().min(1).max(60),
  observeMinutes: z.number().int().min(0).max(30),
  focus: text,
  /** Frases suaves durante o timer, numa fracção do tempo (0–1). */
  cues: z.array(z.object({ at: z.number().gt(0).lt(1), text })).max(6),
});

export const weekSchema = z.object({
  week: z.number().int().min(1),
  phase: z.number().int().min(1),
  title: text,
  subtitle: text,
  competence: text,
  intro: z.array(text).min(1),
  objective: text,
  howTo: z.object({ prep: z.array(text).min(1), steps: z.array(text).min(1), care: z.array(text) }),
  sessions: z.array(sessionSchema).length(5),
  challenges: z.array(z.object({ title: text, text })).min(1).max(5),
  /** Critérios da avaliação automática (por defeito: 4 sessões, 80 % do tempo alvo, 4 registos com texto). */
  criteria: z.object({ minSessions: z.number().int(), goalRatio: z.number(), minDiary: z.number().int() }).partial().optional(),
  next: z.object({ title: text, text }).optional(),
  /** Semana dos sonhos: o diário do treino ganha o campo do sonho, partilhado com a Manhã do Hoje. */
  dreamJournal: z.boolean().optional(),
  /** Operações mágicas (Fase III em diante): o diário separa experiência, interpretação e evidência. */
  operationsJournal: z.boolean().optional(),
  /** Semana dos sigilos: ajudante que reduz as letras da intenção (não grava nada). */
  sigilHelper: z.boolean().optional(),
  /** Semana da crença aleatória: as faces do dado (sorteio no servidor, uma vez por semana e tentativa). */
  beliefs: z.array(z.object({ title: text, text })).min(2).max(12).optional(),
  /** Alfabeto do Desejo: a partir desta semana, a pessoa cria e guarda os seus símbolos. */
  alphabet: z.boolean().optional(),
  /** Semana da Chaosphere: o símbolo na preparação. */
  chaosphere: z.boolean().optional(),
  /** Paradigma pessoal: a partir desta semana, a pessoa escreve e guarda o seu paradigma. */
  paradigm: z.boolean().optional(),
});

export type OcultoProgram = z.infer<typeof programSchema>;
export type OcultoWeek = z.infer<typeof weekSchema>;
export type OcultoSessionDef = z.infer<typeof sessionSchema>;

let programCache: OcultoProgram | null = null;
const weekCache = new Map<number, OcultoWeek | null>();
const fresh = () => process.env.NODE_ENV === 'development';

export function getProgram(dir = OCULTO_DIR): OcultoProgram {
  if (programCache && !fresh()) return programCache;
  programCache = programSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'program.json'), 'utf8')));
  return programCache;
}

const weekFile = (dir: string, week: number) => path.join(dir, 'pt-BR', `week-${String(week).padStart(2, '0')}.json`);

/** Uma semana do programa, ou null se ainda não foi escrita. */
export function getWeek(week: number, dir = OCULTO_DIR): OcultoWeek | null {
  if (weekCache.has(week) && !fresh()) return weekCache.get(week)!;
  const file = weekFile(dir, week);
  const data = fs.existsSync(file) ? weekSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))) : null;
  if (data && data.week !== week) throw new Error(`${file}: "week" é ${data.week}, devia ser ${week}`);
  weekCache.set(week, data);
  return data;
}

/** Semanas já escritas (as outras aparecem como "em breve"). */
export function availableWeeks(dir = OCULTO_DIR): number[] {
  return getProgram(dir).phases.flatMap((p) => p.weeks).filter((w) => fs.existsSync(weekFile(dir, w)));
}
