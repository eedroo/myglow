import { z } from 'zod';

/**
 * Alfabeto do Desejo: um símbolo é uma lista de traços; cada traço é uma lista de pontos [x, y] inteiros de 0 a 100
 * (independente do tamanho do ecrã). Puro.
 */
export const GLYPH_LIMIT = 40;
export const MAX_STROKES = 24;
export const MAX_POINTS = 1500;

const point = z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]);
export const strokesSchema = z
  .array(z.array(point).min(1).max(MAX_POINTS))
  .min(1)
  .max(MAX_STROKES)
  .refine((s) => s.reduce((n, st) => n + st.length, 0) <= MAX_POINTS, 'too many points');

export type Strokes = z.infer<typeof strokesSchema>;
export type Point = [number, number];

/** Converte uma posição no quadro (0 a size) para a grelha 0–100, com limites. */
export function normalizePoint(x: number, y: number, size: number): Point {
  const n = (v: number) => Math.min(100, Math.max(0, Math.round((v / Math.max(1, size)) * 100)));
  return [n(x), n(y)];
}

/** Acrescenta um ponto ao traço só se se afastou do último (evita milhares de pontos repetidos). */
export function addPoint(stroke: Point[], p: Point, minDist = 1.5): Point[] {
  const last = stroke[stroke.length - 1];
  if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < minDist) return stroke;
  return [...stroke, p];
}

/** Caminho SVG de um traço (um ponto sozinho vira um pequeno risco, para se ver). */
export function strokePath(stroke: Point[]): string {
  if (stroke.length === 0) return '';
  const [first, ...rest] = stroke;
  if (rest.length === 0) return `M${first![0]} ${first![1]}l0.01 0`;
  return `M${first![0]} ${first![1]}` + rest.map(([x, y]) => `L${x} ${y}`).join('');
}

/** Lê traços vindos da base de dados (Json); inválidos ficam vazios. */
export function parseStrokes(v: unknown): Strokes {
  const r = strokesSchema.safeParse(v);
  return r.success ? r.data : [];
}
