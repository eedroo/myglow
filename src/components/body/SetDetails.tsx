import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Trophy } from 'lucide-react';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { DaySetDetail } from '@/lib/body/queries';

/** "60 kg: 11, 10, 10 rep" por exercício e peso. */
export async function SetDetails({ details }: { details: DaySetDetail[] }) {
  const [t, raw] = await Promise.all([getTranslations('fitness.day'), getLocale()]);
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  return (
    <ul className="mg-set-details">
      {details.map((d) => (
        <li key={d.exercise.id} className="mg-set-details__ex">
          <Link href={`/body/exercises/${encodeURIComponent(d.exercise.id)}`} className="mg-set-details__name">
            {d.exercise.name}
          </Link>
          {d.groups.map((g, i) => {
            const reps = g.reps.filter((r): r is number => r != null);
            const secs = g.durations.filter((r): r is number => r != null);
            const list = reps.length ? t('repsList', { list: reps.join(', ') }) : t('secondsList', { list: secs.join(', ') });
            return (
              <span key={i} className="mg-set-details__line">
                {g.weightGrams != null ? t('weightLine', { kg: formatGramsAsKg(g.weightGrams, loc), list }) : list}
                {g.prs > 0 && (
                  <span className="mg-pr" role="img" aria-label={t('prCount', { n: g.prs })}>
                    <Trophy size={16} aria-hidden="true" />
                  </span>
                )}
              </span>
            );
          })}
        </li>
      ))}
    </ul>
  );
}
