import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** O que a pessoa escreveu para este dia no planner da Semana (só leitura; a intenção do dia continua à parte). */
export async function DayPlanNote({ text, weekHref }: { text: string; weekHref: string }) {
  const t = await getTranslations('day.plan');
  return (
    <GlassCard variant="flat" className="mg-day-plan">
      <p className="mg-day-plan__head">
        <MagicIcon name="calendar" size="sm" decorative />
        <span className="mg-day-plan__label">{t('label')}</span>
      </p>
      <p className="mg-day-plan__text">{text}</p>
      <Link href={weekHref} className="mg-day-plan__edit">
        {t('edit')}
      </Link>
    </GlassCard>
  );
}
