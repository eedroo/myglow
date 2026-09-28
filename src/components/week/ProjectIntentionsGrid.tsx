'use client';

import type { ProjectArea } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { PROJECT_AREAS } from '@/types/week';
import { ProjectIntentionCard } from './ProjectIntentionCard';

interface ProjectIntentionsGridProps {
  projects: Record<ProjectArea, string>;
  onChange: (area: ProjectArea, value: string) => void;
  onBlur: () => void;
}

/** "Intenções por projectos": 5 áreas, grelha 3 + 2 como no papel. */
export function ProjectIntentionsGrid({ projects, onChange, onBlur }: ProjectIntentionsGridProps) {
  const t = useTranslations('projects');
  return (
    <GlassCard>
      <section className="mg-projects" aria-labelledby="projects-title">
        <h2 id="projects-title" className="mg-projects__header">
          <MagicIcon name="sparkles" size="sm" decorative />
          {t('title')}
        </h2>
        <div className="mg-projects__grid">
          {PROJECT_AREAS.map((area) => (
            <ProjectIntentionCard
              key={area}
              area={area}
              value={projects[area]}
              onChange={(v) => onChange(area, v)}
              onBlur={onBlur}
            />
          ))}
        </div>
      </section>
    </GlassCard>
  );
}
