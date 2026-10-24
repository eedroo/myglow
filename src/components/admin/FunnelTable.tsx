import type { FunnelCounts } from '@/lib/metrics/funnel';
import { AdminTable } from './AdminTable';

const LABELS: Record<keyof FunnelCounts, string> = {
  registered: 'Registo',
  birthDone: 'Nascimento',
  tourDone: 'Guia concluído',
  firstLesson: 'Primeira lição',
  firstCompleteDay: 'Primeiro dia completo',
};

/** Funil do onboarding com a % em relação ao passo anterior. */
export function FunnelTable({ steps }: { steps: { step: keyof FunnelCounts; count: number; pctOfPrev: number }[] }) {
  return (
    <AdminTable
      caption="Funil do onboarding"
      columns={[
        { key: 'step', label: 'Passo' },
        { key: 'count', label: 'Pessoas', numeric: true },
        { key: 'pct', label: '% do anterior', numeric: true },
      ]}
      rows={steps.map((s) => ({ step: LABELS[s.step], count: s.count, pct: `${s.pctOfPrev}%` }))}
    />
  );
}
