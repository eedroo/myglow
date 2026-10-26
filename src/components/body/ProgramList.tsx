import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';

interface ProgramItem {
  id: string;
  name: string;
  description: string | null;
  workouts: number;
}

export async function ProgramRow({ program }: { program: ProgramItem }) {
  const t = await getTranslations('fitness.programs');
  return (
    <Link href={`/body/programs/${program.id}`} className="mg-program-row">
      <span className="mg-program-row__text">
        <span className="mg-program-row__name">{program.name}</span>
        <span className="mg-program-row__meta">
          {t('workoutsCount', { n: program.workouts })}
          {program.description ? ` · ${program.description}` : ''}
        </span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}

/** Programas da pessoa (vazio: convite a criar ou usar um modelo). */
export async function ProgramList({ programs }: { programs: ProgramItem[] }) {
  const t = await getTranslations('fitness.programs');
  if (!programs.length) return <p className="mg-body-empty">{t('empty')}</p>;
  return (
    <ul className="mg-program-list">
      {programs.map((p) => (
        <li key={p.id}>
          <ProgramRow program={p} />
        </li>
      ))}
    </ul>
  );
}
