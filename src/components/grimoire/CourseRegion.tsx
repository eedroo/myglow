import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import type { MapCourse } from '@/lib/grimoire/queries';
import { BadgeNode } from './BadgeNode';
import { LessonNode } from './LessonNode';
import { QuizNode } from './QuizNode';

/** Zigue-zague: centro, direita, centro, esquerda… (x em % da largura do caminho). */
const POSITIONS = ['center', 'right', 'center', 'left'] as const;
const X = { left: 18, center: 50, right: 82 } as const;
const ROW = 112; // igual a --mg-row em region.css
const DECOS: MagicIconName[] = ['star', 'moon-stars', 'sparkles'];

/** Curva suave (bezier) entre os centros das linhas. */
function pathFor(count: number): string {
  const pts = Array.from({ length: count }, (_, i) => ({ x: X[POSITIONS[i % POSITIONS.length]!], y: (i + 0.5) * ROW }));
  return pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1]!;
      const midY = (prev.y + p.y) / 2;
      return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    })
    .join(' ');
}

/** Região de um curso: cabeçalho em vidro + caminho de lições, quiz e emblema. */
export async function CourseRegion({ course, lessonsLeft }: { course: MapCourse; lessonsLeft: number }) {
  const t = await getTranslations('grimoire.region');
  const locked = course.state === 'locked';
  const nodes = course.lessons.length + 2; // + quiz + emblema
  const classes = ['mg-region', locked && 'mg-region--locked', course.completed && 'mg-region--completed'].filter(Boolean).join(' ');

  return (
    <section id={`region-${course.slug}`} className={classes} aria-labelledby={`region-${course.slug}-title`}>
      <header className="mg-region__header">
        <span className="mg-region__icon">
          <MagicIcon name={course.icon} size="lg" decorative />
        </span>
        <div>
          <h2 id={`region-${course.slug}-title`} className="mg-region__title">
            {course.title}
          </h2>
          <p className="mg-region__subtitle">{course.subtitle}</p>
        </div>
        <span className="mg-region__progress">
          {course.completed ? t('completed') : t('progress', { done: course.lessonsDone, total: course.lessons.length })}
        </span>
      </header>
      {locked && <p className="mg-region__lock-note">{t('locked')}</p>}

      <div className="mg-region__path">
        <svg className="mg-region__line" viewBox={`0 0 100 ${nodes * ROW}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={pathFor(nodes)} vectorEffect="non-scaling-stroke" />
        </svg>
        <ol className="mg-region__nodes" aria-label={course.title}>
          {course.lessons.map((l, i) => (
            <li key={l.slug} className={`mg-region__row mg-region__row--${POSITIONS[i % POSITIONS.length]}`}>
              <LessonNode
                courseSlug={course.slug}
                slug={l.slug}
                index={i}
                title={l.title}
                minutes={l.minutes}
                state={l.state}
                lessonsLeft={lessonsLeft}
                icon={course.icon}
              />
              {i % 2 === 1 && (
                <span className="mg-region__deco">
                  <MagicIcon name={DECOS[i % DECOS.length]!} size="sm" decorative />
                </span>
              )}
            </li>
          ))}
          <li className={`mg-region__row mg-region__row--${POSITIONS[course.lessons.length % POSITIONS.length]}`}>
            <QuizNode courseSlug={course.slug} unlocked={course.quizUnlocked} completed={course.completed} />
          </li>
          <li className={`mg-region__row mg-region__row--${POSITIONS[(course.lessons.length + 1) % POSITIONS.length]}`}>
            <BadgeNode name={course.badge.name} icon={course.badge.icon} earned={course.completed} />
          </li>
        </ol>
      </div>
    </section>
  );
}
