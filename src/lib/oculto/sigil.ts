/**
 * Grimório Oculto, semana dos sigilos: reduz as letras de uma intenção pelo método clássico (tirar as letras
 * repetidas e as vogais). Puro; a intenção nunca é gravada.
 */
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

/** Letras da frase sem acentos, em maiúsculas, só de A a Z. */
export function intentionLetters(text: string): string[] {
  return [...text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()].filter((c) => c >= 'A' && c <= 'Z');
}

/** Passos da redução: as letras únicas (pela ordem em que aparecem) e, sem as vogais, as que vão para o desenho. */
export function sigilLetters(text: string): { unique: string[]; final: string[] } {
  const unique = [...new Set(intentionLetters(text))];
  const final = unique.filter((c) => !VOWELS.has(c));
  return { unique, final: final.length ? final : unique };
}
