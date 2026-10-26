import Link from 'next/link';
import type { GuidedFlow } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { routeSegment } from '@/lib/guided/flows';
import type { MagicIconName } from '@/lib/icons';

const ICON: Record<string, MagicIconName> = { DAY_MORNING: 'sun', DAY_BODY: 'stretch', DAY_NIGHT: 'moon-crescent' };
const THEME: Record<string, string> = { DAY_MORNING: 'morning', DAY_BODY: 'body', DAY_NIGHT: 'night' };

/** No Hoje, abaixo do céu do dia: o fluxo guiado sugerido para esta hora. Sem sugestão, não aparece. */
export async function GuidedStartCard({ flow, date }: { flow: GuidedFlow | null; date: string }) {
  if (!flow) return null;
  const t = await getTranslations('guided');
  return (
    <Link href={`/guided/day/${date}/${routeSegment(flow)}`} className={`mg-guided-start mg-guided-start--${THEME[flow]}`}>
      <span className="mg-guided-start__icon">
        <MagicIcon name={ICON[flow]!} size="lg" decorative />
      </span>
      <span className="mg-guided-start__text">
        <span className="mg-guided-start__title">{t(`flows.${flow}.start`)}</span>
        <span className="mg-guided-start__hint">{t('card.hint')}</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  );
}
