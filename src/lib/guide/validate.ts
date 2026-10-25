import { compareDates } from '@/lib/dates';
import { findBannedTerm } from './bannedTerms';
import type { GuideInput } from './input';
import type { GuideReportPayload } from './schema';

/**
 * Validação semântica do Guia (F14), depois do Zod: evidência só de dias do input, áreas só com meta,
 * sem termos proibidos nem travessões. Pura; uma falha dá 1 retry com a razão.
 */
export type GuideValidation = { ok: true } | { ok: false; reason: string };

function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
  return [];
}

function areasWithGoal(input: GuideInput): Set<string> {
  const out = new Set<string>(Object.keys(input.period.projects));
  for (const w of input.weeks ?? []) for (const a of Object.keys(w.projects)) out.add(a);
  return out;
}

export function validateGuideReport(r: GuideReportPayload, input: GuideInput): GuideValidation {
  const days = new Set(input.days.map((d) => d.date));
  const evidence = [...r.continue, ...r.improve, ...r.patterns].flatMap((x) => x.evidence);
  for (const date of evidence) {
    if (compareDates(date, input.from) < 0 || compareDates(date, input.to) > 0) return { ok: false, reason: `evidence date ${date} is outside the period` };
    if (!days.has(date)) return { ok: false, reason: `evidence date ${date} is not one of the days provided` };
  }

  const goals = areasWithGoal(input);
  for (const a of r.areas) {
    if (!goals.has(a.area)) return { ok: false, reason: `area ${a.area} has no intention or goal in the input; remove it` };
  }

  for (const s of strings(r)) {
    if (s.includes('—')) return { ok: false, reason: 'do not use em dashes (—)' };
    const banned = findBannedTerm(s);
    if (banned) return { ok: false, reason: `forbidden term "${banned}"` };
  }
  return { ok: true };
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Trim e sem espaços duplos em todos os textos (antes de gravar). */
export function normalize(r: GuideReportPayload): GuideReportPayload {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return tidy(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(r) as GuideReportPayload;
}
