'use client';

import type { ProjectArea } from '@prisma/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { PROJECT_AREAS } from '@/types/week';
import { ProjectIntentionCard } from './ProjectIntentionCard';

interface PeriodProjectsCardProps {
  title: string;
  values: Record<ProjectArea, string>;
  onChange: (area: ProjectArea, value: string) => void;
  onBlur: () => void;
  /** Coluna única e 2 linhas por área (quando divide a largura com outro cartão). */
  compact?: boolean;
  /** Prefixo dos ids dos campos (ex.: "project" → "project-magic"). */
  idPrefix?: string;
  /** Foco sugerido por área (leitura IA da semana). */
  notes?: Partial<Record<ProjectArea, string>>;
}

/** Intenções/metas por projecto: 5 áreas, grelha 3 + 2 como no papel (ou compacta). */
export function PeriodProjectsCard({ title, values, onChange, onBlur, compact, idPrefix = 'project', notes }: PeriodProjectsCardProps) {
  const titleId = `${idPrefix}-title`;
  return (
    <GlassCard>
      <section className={compact ? 'mg-projects mg-projects--compact' : 'mg-projects'} aria-labelledby={titleId}>
        <h2 id={titleId} className="mg-projects__header">
          <MagicIcon name="sparkles" size="sm" decorative />
          {title}
        </h2>
        <div className="mg-projects__grid">
          {PROJECT_AREAS.map((area) => (
            <ProjectIntentionCard
              key={area}
              id={`${idPrefix}-${area.toLowerCase()}`}
              area={area}
              rows={compact ? 2 : 3}
              value={values[area]}
              onChange={(v) => onChange(area, v)}
              onBlur={onBlur}
              note={notes?.[area]}
            />
          ))}
        </div>
      </section>
    </GlassCard>
  );
}
