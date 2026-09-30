import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MapCourse } from '@/lib/grimoire/queries';

/** Depois dos cursos obrigatórios: escolher o caminho (chips que saltam para a região do curso). */
export async function Crossroads({ courses, unlocked }: { courses: MapCourse[]; unlocked: boolean }) {
  const t = await getTranslations('grimoire.crossroads');
  return (
    <section className={unlocked ? 'mg-crossroads' : 'mg-crossroads mg-crossroads--locked'} aria-labelledby="crossroads-title">
      <h2 id="crossroads-title" className="mg-crossroads__title">
        {t('title')}
      </h2>
      {!unlocked && <p className="mg-crossroads__note">{t('locked')}</p>}
      <ul className="mg-crossroads__chips">
        {courses.map((c) => (
          <li key={c.slug}>
            <a className="mg-crossroads__chip" href={`#region-${c.slug}`}>
              <MagicIcon name={c.icon} size="sm" decorative />
              {c.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
