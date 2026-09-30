import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { DAILY_LESSON_LIMIT } from '@/lib/grimoire/rules';

/** Topo fixo do mapa: 3 luas que se preenchem com as lições novas de hoje + emblemas. */
export async function DailyLessonsMeter({ lessonsToday, lessonsLeft, badges }: { lessonsToday: number; lessonsLeft: number; badges: number }) {
  const t = await getTranslations('grimoire.meter');
  return (
    <div className="mg-daily-meter" role="status">
      <span className="mg-daily-meter__moons" aria-label={t('label')}>
        {Array.from({ length: DAILY_LESSON_LIMIT }, (_, i) => (
          <span key={i} className={i < lessonsToday ? 'mg-daily-meter__moon mg-daily-meter__moon--filled' : 'mg-daily-meter__moon'}>
            <MagicIcon name="moon-crescent" size="sm" decorative />
          </span>
        ))}
      </span>
      <span className="mg-daily-meter__label">{t('left', { count: lessonsLeft })}</span>
      <Link href="/profile" className="mg-daily-meter__badges">
        <MagicIcon name="badge-vida-magica" size="sm" decorative />
        {t('badges', { count: badges })}
      </Link>
    </div>
  );
}
