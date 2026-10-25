/**
 * Termos proibidos nas leituras do Guia (F14): dieta e peso, medicação e diagnóstico, e "presença".
 * Comparação sem acentos e em minúsculas, por palavra inteira. As listas valem para todas as línguas
 * (uma resposta pode misturar termos).
 */
export const BANNED_TERMS: Record<'pt' | 'en', string[]> = {
  pt: [
    'dieta', 'dietas', 'caloria', 'calorias', 'imc', 'perder peso', 'perda de peso', 'emagrecer', 'emagrecimento',
    'medicamento', 'medicamentos', 'medicacao', 'medicar', 'diagnostico', 'diagnosticar', 'presenca',
  ],
  en: [
    'diet', 'diets', 'dieting', 'calorie', 'calories', 'bmi', 'lose weight', 'losing weight', 'weight loss',
    'medication', 'medications', 'medicine', 'diagnosis', 'diagnose', 'presence',
  ],
};

/** Minúsculas, sem acentos, só letras e números separados por um espaço. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Primeiro termo proibido encontrado, ou `null`. */
export function findBannedTerm(text: string): string | null {
  const hay = ` ${normalizeText(text)} `;
  for (const term of [...BANNED_TERMS.pt, ...BANNED_TERMS.en]) {
    if (hay.includes(` ${term} `)) return term;
  }
  return null;
}
