import { getTranslations } from 'next-intl/server';
import type { DateISO } from '@/lib/dates';
import { suggestPeriodFlow } from '@/lib/guided/suggest';
import { routeSegment } from '@/lib/guided/flows';
import { GuidedSectionButton } from './GuidedSectionButton';

/** Botão no cabeçalho da Semana, Mês e Ano com o fluxo guiado sugerido; sem sugestão abre o "planear". */
export async function PeriodGuidedButton({
  kind,
  periodStart,
  routeBase,
  today,
  tz,
  planFilled,
  reflectionFilled,
}: {
  kind: 'WEEK' | 'MONTH' | 'YEAR';
  periodStart: DateISO;
  routeBase: string;
  today: DateISO;
  tz: string;
  planFilled: boolean;
  reflectionFilled: boolean;
}) {
  const t = await getTranslations('guided');
  const flow = suggestPeriodFlow({ kind, periodStart, today, now: new Date(), tz, planFilled, reflectionFilled }) ?? (`${kind}_PLAN` as const);
  return (
    <div className="mg-guided-period">
      <GuidedSectionButton href={`${routeBase}/${routeSegment(flow)}`} label={t(`flows.${flow}.start`)} showLabel />
    </div>
  );
}
