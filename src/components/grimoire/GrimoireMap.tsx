import { getTranslations } from 'next-intl/server';
import type { GrimoireNotice, GrimoireState } from '@/lib/grimoire/queries';
import { CourseRegion } from './CourseRegion';
import { Crossroads } from './Crossroads';
import { DailyLessonsMeter } from './DailyLessonsMeter';

/** Mapa do Grimório: medidor fixo, aviso de redirecionamento e regiões dos cursos em trilha. */
export async function GrimoireMap({ state, notice }: { state: GrimoireState; notice?: GrimoireNotice }) {
  const t = await getTranslations('grimoire');
  const required = state.courses.filter((c) => c.required);
  const free = state.courses.filter((c) => !c.required);

  return (
    <div className="mg-map">
      <DailyLessonsMeter lessonsToday={state.lessonsToday} lessonsLeft={state.lessonsLeft} badges={state.badgesEarned} />
      {notice && (
        <p className="mg-map__notice" role="status">
          {t(`notice.${notice}`)}
        </p>
      )}
      <div className="mg-map__regions">
        {required.map((c) => (
          <CourseRegion key={c.slug} course={c} lessonsLeft={state.lessonsLeft} />
        ))}
        {free.length > 0 && <Crossroads courses={free} unlocked={state.requiredDone} />}
        {free.map((c) => (
          <CourseRegion key={c.slug} course={c} lessonsLeft={state.lessonsLeft} />
        ))}
      </div>
    </div>
  );
}
