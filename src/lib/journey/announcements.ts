/** F19: anúncios em slides que o admin pode publicar (`Announcement.key`). */
export const ANNOUNCEMENT_KEYS = ['v2'] as const;
export type AnnouncementKey = (typeof ANNOUNCEMENT_KEYS)[number];

/** Os slides de novidades aparecem a quem já usava a app antes da jornada, uma vez, depois de publicados. */
export function shouldShowWhatsNew(i: { mappedAt: Date | null; seen: string[]; published: boolean; key: AnnouncementKey }): boolean {
  return i.published && i.mappedAt !== null && !i.seen.includes(i.key);
}

/** Tamanho dos lotes do envio (com uma pausa entre lotes). */
export const FANOUT_BATCH = 100;
