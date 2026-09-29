import type { MonthRituals } from './schemas';

const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Ids estáveis dos rituais gerados em código (o id da IA é ignorado) e ordem por data. */
export function finalizeRituals(data: MonthRituals): MonthRituals {
  const used = new Set<string>();
  const rituals = [...data.rituals]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      let id = `${r.date}-${slug(r.title) || 'ritual'}`;
      for (let n = 2; used.has(id); n++) id = `${r.date}-${slug(r.title)}-${n}`;
      used.add(id);
      return { ...r, id };
    });
  return { rituals };
}
