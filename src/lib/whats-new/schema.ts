import { z } from 'zod';
import { MAGIC_ICON_NAMES } from '@/lib/icons';

/** Formato de `content/whats-new.json`: lançamentos de funcionalidades anunciados no pop-up "Novidades". */
const localized = z.object({ 'pt-BR': z.string().min(1).max(120), 'pt-PT': z.string().min(1).max(120), en: z.string().min(1).max(120) });

export const whatsNewSchema = z.object({
  version: z.number().int(),
  releases: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      items: z
        .array(
          z.object({
            icon: z.enum(MAGIC_ICON_NAMES),
            href: z.string().regex(/^\/[a-z0-9/-]*$/).optional(),
            text: localized,
          }),
        )
        .min(1)
        .max(6),
    }),
  ),
});

export type WhatsNew = z.infer<typeof whatsNewSchema>;
export type Release = WhatsNew['releases'][number];
